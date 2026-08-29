import { describe, expect, it } from "vitest";
import { createGame, applyCommand, type CardInstance } from "../src/index.js";

describe("Win Condition Validation", () => {
  it("should trigger immediate victory when player completes 3 distinct property sets", () => {
    const game = createGame({
      seed: 500,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    // Give Alice 2 completed sets (Brown and Dark Blue)
    game.players["p1"]!.propertySets = [
      {
        setId: "set-brown",
        color: "brown",
        cards: [
          { instanceId: "c1", defId: "prop-mediterranean-avenue", name: "Mediterranean Avenue", type: "property", value: 1 },
          { instanceId: "c2", defId: "prop-baltic-avenue", name: "Baltic Avenue", type: "property", value: 1 },
        ],
        hasHouse: false,
        hasHotel: false,
        isComplete: true,
        setSize: 2,
        rentTiers: [1, 2],
      },
      {
        setId: "set-blue",
        color: "dark-blue",
        cards: [
          { instanceId: "c3", defId: "prop-park-lane", name: "Park Lane", type: "property", value: 4 },
          { instanceId: "c4", defId: "prop-mayfair", name: "Mayfair", type: "property", value: 4 },
        ],
        hasHouse: false,
        hasHotel: false,
        isComplete: true,
        setSize: 2,
        rentTiers: [3, 8],
      },
      {
        setId: "set-utility",
        color: "utility",
        cards: [
          { instanceId: "c5", defId: "prop-electric-company", name: "Electric Company", type: "property", value: 2 },
        ],
        hasHouse: false,
        hasHotel: false,
        isComplete: false,
        setSize: 2,
        rentTiers: [1, 2],
      },
    ];

    const waterWorks: CardInstance = {
      instanceId: "test-water",
      defId: "prop-water-works",
      name: "Water Works",
      type: "property",
      primaryColor: "utility",
      value: 2,
      setSize: 2,
    };

    game.players["p1"]!.hand = [waterWorks];
    game.turn.phase = "action";

    // Alice plays the 2nd utility card, completing her 3rd full set!
    const { nextState, events } = applyCommand(game, {
      type: "play_property",
      playerId: "p1",
      cardInstanceId: waterWorks.instanceId,
      targetSetId: "set-utility",
    });

    expect(nextState.status).toBe("completed");
    expect(nextState.winnerId).toBe("p1");
    expect(events.some((e) => e.type === "game_won")).toBe(true);
  });
});
