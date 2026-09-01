import type { GameState, MaskedGameState, MaskedPlayerState } from "./types/state.js";

export function getMaskedView(state: GameState, viewerPlayerId: string): MaskedGameState {
  const maskedPlayers: Record<string, MaskedPlayerState> = {};

  for (const [playerId, player] of Object.entries(state.players)) {
    const isViewer = playerId === viewerPlayerId;
    const bankTotal = player.bank.reduce((sum, c) => sum + c.value, 0);

    maskedPlayers[playerId] = {
      id: player.id,
      name: player.name,
      isBot: player.isBot,
      handCount: player.hand.length,
      hand: isViewer ? [...player.hand] : undefined,
      bank: [...player.bank],
      bankTotal,
      propertySets: player.propertySets.map((s) => ({
        ...s,
        cards: s.cards.map((c) => {
          // Rule: Opponents cannot check hidden sides of wildcards on the table.
          if (!isViewer && c.type === "property-wild" && c.primaryColor !== "all") {
            const visibleColor = s.color;
            const displayName = visibleColor.charAt(0).toUpperCase() + visibleColor.slice(1) + " Wild Property";
            return {
              ...c,
              name: displayName,
              primaryColor: visibleColor,
              secondaryColor: undefined,
              currentColor: visibleColor,
            };
          }
          return { ...c };
        }),
      })),
    };
  }

  const discardPileTop =
    state.discardPile.length > 0
      ? state.discardPile[state.discardPile.length - 1]!
      : null;

  return {
    id: state.id,
    status: state.status,
    viewerPlayerId,
    players: maskedPlayers,
    playerOrder: [...state.playerOrder],
    turn: { ...state.turn },
    deckCount: state.deck.length,
    discardPile: [...state.discardPile],
    discardPileTop,
    pendingResolution: state.pendingResolution ? { ...state.pendingResolution } : null,
    winnerId: state.winnerId,
    history: [...state.history],
  };
}
