import { CARD_CATALOGUE } from "@dealopoly/shared";
import type { CardInstance } from "../types/state.js";

export function createStandardDeck(): CardInstance[] {
  const deck: CardInstance[] = [];
  let instanceCounter = 1;

  for (const def of CARD_CATALOGUE) {
    // Skip rule/reference cards in playable deck
    if (def.type === "rule") {
      continue;
    }

    for (let i = 0; i < def.count; i++) {
      deck.push({
        instanceId: `card-${instanceCounter++}-${def.id}`,
        defId: def.id,
        name: def.name,
        type: def.type,
        value: def.value,
        primaryColor: def.primaryColor,
        secondaryColor: def.secondaryColor,
        currentColor: def.type === "property" ? def.primaryColor : undefined,
        setSize: def.setSize,
        description: def.description,
        icon: def.icon,
      });
    }
  }

  return deck;
}
