import { describe, expect, it } from "vitest";
import { createGame, applyCommand, type CardInstance, BotController } from "../src/index.js";

describe("Rent and Debt Payments", () => {
  it("should charge rent and allow debtor to pay using bank money", () => {
    const game = createGame({
      seed: 400,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    const rentCard: CardInstance = {
      instanceId: "alice-rent",
      defId: "rent-green-dark-blue",
      name: "Rent (Green / Dark Blue)",
      type: "rent",
      primaryColor: "green",
      secondaryColor: "dark-blue",
      value: 1,
    };

    // Alice has complete dark blue set (rent: $8M)
    game.players["p1"]!.propertySets = [
      {
        setId: "p1-blue-set",
        color: "dark-blue",
        cards: [
          { instanceId: "c1", defId: "prop-park-lane", name: "Park Lane", type: "property", value: 4 },
          { instanceId: "c2", defId: "prop-mayfair", name: "Mayfair", type: "property", value: 4 },
        ],
        hasHouse: false,
        hasHotel: false,
        isComplete: true,
        setSize: 2,
        rentTiers: [3, 8],
      },
    ];
    game.players["p1"]!.hand = [rentCard];
    game.turn.phase = "action";

    // Bob has $10M in bank
    const bobMoney10m: CardInstance = {
      instanceId: "bob-money-10",
      defId: "money-10m",
      name: "$10M Money Card",
      type: "money",
      value: 10,
    };
    game.players["p2"]!.bank = [bobMoney10m];
    game.players["p2"]!.hand = []; // No JSN

    // Alice charges dark blue rent -> enters reaction window
    const res1 = applyCommand(game, {
      type: "play_rent",
      playerId: "p1",
      rentCardInstanceId: rentCard.instanceId,
      chosenColor: "dark-blue",
    });

    expect(res1.nextState.pendingResolution?.type).toBe("reaction_window");

    // Bob passes reaction -> advances to payment
    const res1Pass = applyCommand(res1.nextState, {
      type: "submit_reaction",
      playerId: "p2",
      action: "pass",
    });

    expect(res1Pass.nextState.pendingResolution?.type).toBe("payment");
    if (res1Pass.nextState.pendingResolution?.type === "payment") {
      expect(res1Pass.nextState.pendingResolution.amountDue).toBe(8);
      expect(res1Pass.nextState.pendingResolution.debtorPlayerId).toBe("p2");
    }

    // Bob pays with his $10M card (no change given)
    const res2 = applyCommand(res1Pass.nextState, {
      type: "submit_payment",
      playerId: "p2",
      paymentCardInstanceIds: [bobMoney10m.instanceId],
    });

    expect(res2.nextState.pendingResolution).toBeNull();
    expect(res2.nextState.players["p2"]!.bank.length).toBe(0);
    expect(res2.nextState.players["p1"]!.bank.length).toBe(1);
    expect(res2.nextState.players["p1"]!.bank[0]?.value).toBe(10);
  });

  it("should enforce table bankruptcy when debtor has insufficient funds", () => {
    const game = createGame({
      seed: 400,
      players: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
    });

    const debtCollector: CardInstance = {
      instanceId: "alice-debt",
      defId: "action-debt-collector",
      name: "Debt Collector",
      type: "action",
      value: 3,
    };

    game.players["p1"]!.hand = [debtCollector];
    game.turn.phase = "action";

    // Bob only has $2M on table
    const bobMoney2m: CardInstance = {
      instanceId: "bob-money-2",
      defId: "money-2m",
      name: "$2M Money Card",
      type: "money",
      value: 2,
    };
    game.players["p2"]!.bank = [bobMoney2m];
    game.players["p2"]!.hand = [];

    // Alice plays Debt Collector ($5M due) -> enters reaction window
    const res1 = applyCommand(game, {
      type: "play_action",
      playerId: "p1",
      cardInstanceId: debtCollector.instanceId,
      targetPlayerId: "p2",
    });

    expect(res1.nextState.pendingResolution?.type).toBe("reaction_window");

    // Bob passes reaction -> advances to payment
    const res1Pass = applyCommand(res1.nextState, {
      type: "submit_reaction",
      playerId: "p2",
      action: "pass",
    });

    // Bob submits all his table assets ($2M)
    const res2 = applyCommand(res1Pass.nextState, {
      type: "submit_payment",
      playerId: "p2",
      paymentCardInstanceIds: [bobMoney2m.instanceId],
    });

    expect(res2.nextState.pendingResolution).toBeNull();
    expect(res2.nextState.players["p2"]!.bank.length).toBe(0);
    expect(res2.nextState.players["p1"]!.bank.length).toBe(1);
  });

  it("should generate valid bot payment when debtor is a bot with house/hotel and insufficient cash", () => {
    const game = createGame({
      seed: 400,
      players: [
        { id: "p1", name: "Player", isBot: false },
        { id: "bot-1", name: "Bot Atlas", isBot: true },
      ],
    });

    const houseCard: CardInstance = {
      instanceId: "house-1",
      defId: "action-house",
      name: "House",
      type: "action",
      value: 3,
    };

    // Bot has a set with a house ($1M + $1M + $3M house = $5M total)
    game.players["bot-1"]!.propertySets = [
      {
        setId: "bot-brown-set",
        color: "brown",
        cards: [
          { instanceId: "br-1", defId: "prop-mediterranean-avenue", name: "Mediterranean Avenue", type: "property", value: 1 },
          { instanceId: "br-2", defId: "prop-baltic-avenue", name: "Baltic Avenue", type: "property", value: 1 },
        ],
        hasHouse: true,
        houseCard,
        hasHotel: false,
        isComplete: true,
        setSize: 2,
        rentTiers: [1, 2],
      },
    ];
    game.players["bot-1"]!.bank = [];
    game.players["bot-1"]!.hand = [];

    // Pending resolution: rent for $4M
    game.pendingResolution = {
      type: "payment",
      creditorPlayerId: "p1",
      debtorPlayerId: "bot-1",
      amountDue: 4,
      remainingDebtors: [],
      reason: "Rent for blue properties ($4M)",
    };

    const botAction = BotController.getNextBotAction(game, "bot-1");

    expect(botAction).not.toBeNull();
    expect(botAction?.type).toBe("submit_payment");

    // Applying bot's generated payment must succeed without throwing
    const res = applyCommand(game, botAction!);
    expect(res.nextState.pendingResolution).toBeNull();
  });

  it("should generate valid bot payment when debtor has 0 table assets", () => {
    const game = createGame({
      seed: 400,
      players: [
        { id: "p1", name: "Player", isBot: false },
        { id: "bot-1", name: "Bot Atlas", isBot: true },
      ],
    });

    game.players["bot-1"]!.propertySets = [];
    game.players["bot-1"]!.bank = [];
    game.players["bot-1"]!.hand = [];

    game.pendingResolution = {
      type: "payment",
      creditorPlayerId: "p1",
      debtorPlayerId: "bot-1",
      amountDue: 5,
      remainingDebtors: [],
      reason: "Debt Collector ($5M)",
    };

    const botAction = BotController.getNextBotAction(game, "bot-1");

    expect(botAction).not.toBeNull();
    expect(botAction?.type).toBe("submit_payment");
    if (botAction?.type === "submit_payment") {
      expect(botAction.paymentCardInstanceIds).toEqual([]);
    }

    const res = applyCommand(game, botAction!);
    expect(res.nextState.pendingResolution).toBeNull();
  });
});
