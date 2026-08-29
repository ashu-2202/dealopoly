import { describe, expect, it } from "vitest";
import { CARD_CATALOGUE, TOTAL_CARDS_IN_DECK, type CardDefinition } from "./cards.js";

describe("Dealopoly Card Catalogue", () => {
  it("should contain exactly 110 cards in total deck", () => {
    expect(TOTAL_CARDS_IN_DECK).toBe(110);
  });

  it("should have exactly 28 property cards", () => {
    const propertyCards = CARD_CATALOGUE.filter((c: CardDefinition) => c.type === "property");
    const totalCount = propertyCards.reduce((acc: number, c: CardDefinition) => acc + c.count, 0);
    expect(totalCount).toBe(28);
  });

  it("should have exactly 11 property wild cards", () => {
    const wildCards = CARD_CATALOGUE.filter((c: CardDefinition) => c.type === "property-wild");
    const totalCount = wildCards.reduce((acc: number, c: CardDefinition) => acc + c.count, 0);
    expect(totalCount).toBe(11);
  });

  it("should have exactly 34 action cards", () => {
    const actionCards = CARD_CATALOGUE.filter((c: CardDefinition) => c.type === "action");
    const totalCount = actionCards.reduce((acc: number, c: CardDefinition) => acc + c.count, 0);
    expect(totalCount).toBe(34);
  });

  it("should have exactly 13 rent cards", () => {
    const rentCards = CARD_CATALOGUE.filter((c: CardDefinition) => c.type === "rent");
    const totalCount = rentCards.reduce((acc: number, c: CardDefinition) => acc + c.count, 0);
    expect(totalCount).toBe(13);
  });

  it("should have exactly 20 money cards", () => {
    const moneyCards = CARD_CATALOGUE.filter((c: CardDefinition) => c.type === "money");
    const totalCount = moneyCards.reduce((acc: number, c: CardDefinition) => acc + c.count, 0);
    expect(totalCount).toBe(20);
  });

  it("should have exactly 4 quick start rule cards", () => {
    const ruleCards = CARD_CATALOGUE.filter((c: CardDefinition) => c.type === "rule");
    const totalCount = ruleCards.reduce((acc: number, c: CardDefinition) => acc + c.count, 0);
    expect(totalCount).toBe(4);
  });
});
