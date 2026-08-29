import { describe, expect, it } from "vitest";
import { createGame, applyCommand, type CardInstance } from "../src/index.js";

describe("Just Say No Reaction Windows and Counter Chains", () => {
  it("should open reaction window when targeting opponent who holds Just Say No", () => {
    const game = createGame({
      seed: 300,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    const dealBreaker: CardInstance = {
      instanceId: "alice-db",
      defId: "action-deal-breaker",
      name: "Deal Breaker",
      type: "action",
      value: 5,
    };
    const bobJSN: CardInstance = {
      instanceId: "bob-jsn",
      defId: "action-just-say-no",
      name: "Just Say No",
      type: "action",
      value: 4,
    };

    // Bob has completed dark-blue set and a JSN card in hand
    game.players["p2"]!.propertySets = [
      {
        setId: "bob-set-blue",
        color: "dark-blue",
        cards: [
          { instanceId: "b1", defId: "prop-park-lane", name: "Park Lane", type: "property", value: 4 },
          { instanceId: "b2", defId: "prop-mayfair", name: "Mayfair", type: "property", value: 4 },
        ],
        hasHouse: false,
        hasHotel: false,
        isComplete: true,
        setSize: 2,
        rentTiers: [3, 8],
      },
    ];
    game.players["p2"]!.hand = [bobJSN];
    game.players["p1"]!.hand = [dealBreaker];
    game.turn.phase = "action";

    // Alice plays Deal Breaker targeting Bob
    const res1 = applyCommand(game, {
      type: "play_action",
      playerId: "p1",
      cardInstanceId: dealBreaker.instanceId,
      targetPlayerId: "p2",
      targetSetId: "bob-set-blue",
    });

    expect(res1.nextState.pendingResolution).not.toBeNull();
    expect(res1.nextState.pendingResolution?.type).toBe("reaction_window");
    if (res1.nextState.pendingResolution?.type === "reaction_window") {
      expect(res1.nextState.pendingResolution.waitingForPlayerId).toBe("p2");
    }

    // Bob plays Just Say No
    const res2 = applyCommand(res1.nextState, {
      type: "submit_reaction",
      playerId: "p2",
      action: "just_say_no",
      justSayNoCardInstanceId: bobJSN.instanceId,
    });

    // Now Alice is prompted to counter or pass
    expect(res2.nextState.pendingResolution?.type).toBe("reaction_window");
    if (res2.nextState.pendingResolution?.type === "reaction_window") {
      expect(res2.nextState.pendingResolution.waitingForPlayerId).toBe("p1");
    }

    // Alice passes (does not have JSN)
    const res3 = applyCommand(res2.nextState, {
      type: "submit_reaction",
      playerId: "p1",
      action: "pass",
    });

    // Deal Breaker blocked: Bob keeps his set!
    expect(res3.nextState.pendingResolution).toBeNull();
    expect(res3.nextState.players["p2"]!.propertySets.length).toBe(1);
    expect(res3.nextState.players["p1"]!.propertySets.length).toBe(0);
  });

  it("should allow initiator to counter-cancel opponent's Just Say No with their own Just Say No", () => {
    const game = createGame({
      seed: 300,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    const dealBreaker: CardInstance = {
      instanceId: "alice-db",
      defId: "action-deal-breaker",
      name: "Deal Breaker",
      type: "action",
      value: 5,
    };
    const aliceJSN: CardInstance = {
      instanceId: "alice-jsn",
      defId: "action-just-say-no",
      name: "Just Say No",
      type: "action",
      value: 4,
    };
    const bobJSN: CardInstance = {
      instanceId: "bob-jsn",
      defId: "action-just-say-no",
      name: "Just Say No",
      type: "action",
      value: 4,
    };

    game.players["p2"]!.propertySets = [
      {
        setId: "bob-set-blue",
        color: "dark-blue",
        cards: [
          { instanceId: "b1", defId: "prop-park-lane", name: "Park Lane", type: "property", value: 4 },
          { instanceId: "b2", defId: "prop-mayfair", name: "Mayfair", type: "property", value: 4 },
        ],
        hasHouse: false,
        hasHotel: false,
        isComplete: true,
        setSize: 2,
        rentTiers: [3, 8],
      },
    ];
    game.players["p2"]!.hand = [bobJSN];
    game.players["p1"]!.hand = [dealBreaker, aliceJSN];
    game.turn.phase = "action";

    // 1. Alice plays Deal Breaker
    const res1 = applyCommand(game, {
      type: "play_action",
      playerId: "p1",
      cardInstanceId: dealBreaker.instanceId,
      targetPlayerId: "p2",
      targetSetId: "bob-set-blue",
    });

    // 2. Bob plays JSN
    const res2 = applyCommand(res1.nextState, {
      type: "submit_reaction",
      playerId: "p2",
      action: "just_say_no",
      justSayNoCardInstanceId: bobJSN.instanceId,
    });

    // 3. Alice counter-plays JSN
    const res3 = applyCommand(res2.nextState, {
      type: "submit_reaction",
      playerId: "p1",
      action: "just_say_no",
      justSayNoCardInstanceId: aliceJSN.instanceId,
    });

    // 4. Bob passes
    const res4 = applyCommand(res3.nextState, {
      type: "submit_reaction",
      playerId: "p2",
      action: "pass",
    });

    // Deal Breaker succeeds: Alice steals Bob's set!
    expect(res4.nextState.pendingResolution).toBeNull();
    expect(res4.nextState.players["p2"]!.propertySets.length).toBe(0);
    expect(res4.nextState.players["p1"]!.propertySets.length).toBe(1);
    expect(res4.nextState.players["p1"]!.propertySets[0]?.color).toBe("dark-blue");
  });
});
