# Dealopoly architecture decisions

This log captures decisions that shape the implementation. New entries should
be appended when a decision materially changes the architecture, rules model,
or operational design.

## ADR-001 — Use a TypeScript monorepo

**Status:** Accepted

The project is split into dedicated packages for the Next.js web app, the game
server, the deterministic game engine, shared domain contracts, and reusable
UI primitives.

**Reason:** The rules must be testable without a browser or network service,
while the web and server applications need a shared, typed vocabulary.

## ADR-002 — The server is authoritative

**Status:** Accepted

Clients will send requested game commands. The game server validates those
commands through the game engine, persists accepted changes, and sends each
player only their permitted view of the game.

**Reason:** This protects hidden information, prevents illegal moves, supports
reconnection, and makes matches reproducible.

## ADR-003 — No accounts are required for v1

**Status:** Accepted

Players receive a secure anonymous browser identity. Friends play through
private room codes and invite links; solo players start a private room filled
with bots.

**Reason:** It removes sign-up friction while retaining enough identity to
reclaim a seat after a refresh or brief disconnection.

## ADR-004 — V1 uses standard two-to-five-player rules

**Status:** Accepted

The initial rules engine and room validation support two to five players only.
The player limit will be configurable, but a six-player extension is deferred.

**Reason:** The requested v1 rule set is the standard one. A six-player game
requires deliberate balancing and deck/rule decisions, rather than an arbitrary
increase to the player limit.

## ADR-005 — Keep game effects separate from presentation

**Status:** Accepted

The game engine will use stable internal effect identifiers. Display names,
player-facing text, visual card designs, and other presentation details live
outside of the engine.

**Reason:** This allows the UI and branding to evolve without rewriting rules,
and creates a clear checkpoint for public-release review of names, wording,
artwork, and trademarks.
