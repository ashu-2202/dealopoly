import { describe, expect, it } from "vitest";
import { createGame, applyCommand, type CardInstance } from "../src/index.js";

describe("Property Sets and Wilds", () => {
  it("should allow playing a property card and creating a property set", () => {
    const game = createGame({
      seed: 100,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    const propCard: CardInstance = {
      instanceId: "test-prop-dark-blue-1",
      defId: "prop-park-lane",
      name: "Park Lane",
      type: "property",
      primaryColor: "dark-blue",
      value: 4,
      setSize: 2,
    };

    // Inject card into hand
    game.players["p1"]!.hand = [propCard];
    game.turn.phase = "action";

    const { nextState } = applyCommand(game, {
      type: "play_property",
      playerId: "p1",
      cardInstanceId: propCard.instanceId,
    });

    const p1Sets = nextState.players["p1"]!.propertySets;
    expect(p1Sets.length).toBe(1);
    expect(p1Sets[0]?.color).toBe("dark-blue");
    expect(p1Sets[0]?.cards.length).toBe(1);
    expect(p1Sets[0]?.isComplete).toBe(false);
    expect(nextState.turn.actionsRemaining).toBe(2);
  });

  it("should mark property set as complete when reaching required set size", () => {
    const game = createGame({
      seed: 100,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    const card1: CardInstance = {
      instanceId: "test-brown-1",
      defId: "prop-mediterranean-avenue",
      name: "Mediterranean Avenue",
      type: "property",
      primaryColor: "brown",
      value: 1,
      setSize: 2,
    };
    const card2: CardInstance = {
      instanceId: "test-brown-2",
      defId: "prop-baltic-avenue",
      name: "Baltic Avenue",
      type: "property",
      primaryColor: "brown",
      value: 1,
      setSize: 2,
    };

    game.players["p1"]!.hand = [card1, card2];
    game.turn.phase = "action";

    // Play card 1
    const res1 = applyCommand(game, {
      type: "play_property",
      playerId: "p1",
      cardInstanceId: card1.instanceId,
    });
    const setId = res1.nextState.players["p1"]!.propertySets[0]!.setId;

    // Play card 2 into existing set
    const res2 = applyCommand(res1.nextState, {
      type: "play_property",
      playerId: "p1",
      cardInstanceId: card2.instanceId,
      targetSetId: setId,
    });

    const p1Sets = res2.nextState.players["p1"]!.propertySets;
    expect(p1Sets.length).toBe(1);
    expect(p1Sets[0]?.isComplete).toBe(true);
    expect(p1Sets[0]?.cards.length).toBe(2);
  });

  it("should allow playing and reorganizing wild property cards into existing property sets", () => {
    const game = createGame({
      seed: 100,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    const pinkProp: CardInstance = {
      instanceId: "test-prop-pink-1",
      defId: "prop-pall-mall",
      name: "Pall Mall",
      type: "property",
      primaryColor: "pink",
      value: 2,
      setSize: 3,
    };
    const orangeProp: CardInstance = {
      instanceId: "test-prop-orange-1",
      defId: "prop-bow-street",
      name: "Bow Street",
      type: "property",
      primaryColor: "orange",
      value: 2,
      setSize: 3,
    };
    const wildCard: CardInstance = {
      instanceId: "test-wild-pink-orange",
      defId: "wild-pink-orange",
      name: "Property Wild Card",
      type: "property-wild",
      primaryColor: "pink",
      secondaryColor: "orange",
      value: 2,
    };

    // Alice has a Pink set and an Orange set on her table
    game.players["p1"]!.propertySets = [
      {
        setId: "p1-pink-set",
        color: "pink",
        cards: [pinkProp],
        hasHouse: false,
        hasHotel: false,
        isComplete: false,
        setSize: 3,
        rentTiers: [1, 2, 4],
      },
      {
        setId: "p1-orange-set",
        color: "orange",
        cards: [orangeProp],
        hasHouse: false,
        hasHotel: false,
        isComplete: false,
        setSize: 3,
        rentTiers: [1, 3, 5],
      },
    ];

    game.players["p1"]!.hand = [wildCard];
    game.turn.phase = "action";

    // Play as Pink into existing pink set
    const res1 = applyCommand(game, {
      type: "play_property",
      playerId: "p1",
      cardInstanceId: wildCard.instanceId,
      chosenColor: "pink",
    });

    const pinkSet = res1.nextState.players["p1"]!.propertySets.find((s) => s.color === "pink")!;
    expect(pinkSet.cards.length).toBe(2);
    expect(pinkSet.cards.some((c) => c.instanceId === wildCard.instanceId && c.currentColor === "pink")).toBe(true);

    // Reorganize to Orange set without consuming actions
    const initialActions = res1.nextState.turn.actionsRemaining;
    const res2 = applyCommand(res1.nextState, {
      type: "reorganize_wild",
      playerId: "p1",
      cardInstanceId: wildCard.instanceId,
      fromSetId: pinkSet.setId,
      newColor: "orange",
    });

    const orangeSet = res2.nextState.players["p1"]!.propertySets.find((s) => s.color === "orange")!;
    expect(orangeSet.cards.length).toBe(2);
    expect(orangeSet.cards.some((c) => c.instanceId === wildCard.instanceId && c.currentColor === "orange")).toBe(true);
    expect(res2.nextState.turn.actionsRemaining).toBe(initialActions);
  });

  it("should reject playing a wild property card if no property of that color is already present on the table", () => {
    const game = createGame({
      seed: 100,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    const wildCard: CardInstance = {
      instanceId: "test-wild-pink-orange",
      defId: "wild-pink-orange",
      name: "Property Wild Card",
      type: "property-wild",
      primaryColor: "pink",
      secondaryColor: "orange",
      value: 2,
    };

    game.players["p1"]!.hand = [wildCard];
    game.players["p1"]!.propertySets = []; // No property sets on table
    game.turn.phase = "action";

    expect(() =>
      applyCommand(game, {
        type: "play_property",
        playerId: "p1",
        cardInstanceId: wildCard.instanceId,
        chosenColor: "pink",
      }),
    ).toThrowError(/without an existing property card/i);
  });

  it("should automatically merge same-color property cards without specifying targetSetId", () => {
    const game = createGame({
      seed: 100,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    const card1: CardInstance = {
      instanceId: "test-red-1",
      defId: "prop-strand",
      name: "Strand",
      type: "property",
      primaryColor: "red",
      value: 3,
      setSize: 3,
    };
    const card2: CardInstance = {
      instanceId: "test-red-2",
      defId: "prop-fleet-street",
      name: "Fleet Street",
      type: "property",
      primaryColor: "red",
      value: 3,
      setSize: 3,
    };

    game.players["p1"]!.hand = [card1, card2];
    game.turn.phase = "action";

    // Play card 1 without targetSetId
    const res1 = applyCommand(game, {
      type: "play_property",
      playerId: "p1",
      cardInstanceId: card1.instanceId,
    });

    // Play card 2 without targetSetId -> must automatically merge into the red set
    const res2 = applyCommand(res1.nextState, {
      type: "play_property",
      playerId: "p1",
      cardInstanceId: card2.instanceId,
    });

    const p1Sets = res2.nextState.players["p1"]!.propertySets;
    expect(p1Sets.length).toBe(1);
    expect(p1Sets[0]?.color).toBe("red");
    expect(p1Sets[0]?.cards.length).toBe(2);
    expect(p1Sets[0]?.isComplete).toBe(false);
  });

  it("should automatically merge wild card into same-color property set without targetSetId", () => {
    const game = createGame({
      seed: 100,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    const propCard: CardInstance = {
      instanceId: "test-dark-blue-prop",
      defId: "prop-mayfair",
      name: "Mayfair",
      type: "property",
      primaryColor: "dark-blue",
      value: 4,
      setSize: 2,
    };
    const wildCard: CardInstance = {
      instanceId: "test-dark-blue-wild",
      defId: "wild-dark-blue-green",
      name: "Property Wild Card",
      type: "property-wild",
      primaryColor: "dark-blue",
      secondaryColor: "green",
      value: 4,
      setSize: 2,
    };

    game.players["p1"]!.hand = [propCard, wildCard];
    game.turn.phase = "action";

    // Play Mayfair
    const res1 = applyCommand(game, {
      type: "play_property",
      playerId: "p1",
      cardInstanceId: propCard.instanceId,
    });

    // Play Wild card as dark-blue without targetSetId -> must auto-merge and complete set
    const res2 = applyCommand(res1.nextState, {
      type: "play_property",
      playerId: "p1",
      cardInstanceId: wildCard.instanceId,
      chosenColor: "dark-blue",
    });

    const p1Sets = res2.nextState.players["p1"]!.propertySets;
    expect(p1Sets.length).toBe(1);
    expect(p1Sets[0]?.color).toBe("dark-blue");
    expect(p1Sets[0]?.cards.length).toBe(2);
    expect(p1Sets[0]?.isComplete).toBe(true);
  });
});
