# Dealopoly implementation plan

## Purpose

This document is the delivery roadmap for Dealopoly: a production-ready web
property-card game that follows the standard two-to-five-player rules for the
initial release.

## Implementation status

| Phase                                       | Status      | Notes                                                                                                                 |
| ------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| Phase 0 — Project foundation                | Complete    | Monorepo, app and server shells, local PostgreSQL service, quality checks, CI, and browser verification are in place. |
| Phase 1 — Rules specification and game data | Complete    | Standard 110-card catalogue, card components, color schemes, rent tables, and unit tests are complete.                |
| Phase 2 — Deterministic game engine         | Complete    | Pure state-machine, reactions (Just Say No), debt/rent resolution, win conditions, and simulation harness implemented.|
| Phase 3 — Anonymous identity & room life    | Complete    | Anonymous sessions, 6-digit room codes, seat management, bot slots, and invite links implemented.                    |
| Phase 4 — Authoritative real-time server    | Complete    | Fastify WebSocket server, command dispatching, masked state broadcasts, bot automation engine implemented.            |
| Phases 5–9                                  | Not started | See the phased plan below.                                                                                            |

The project must support two ways to play without a sign-up flow:

- **Play with bots** — immediately create a private game and fill open seats
  with server-controlled bots.
- **Play with friends** — create a private lobby, share an invite link or room
  code, and start once the required players are present.

## Confirmed decisions

| Area        | Decision                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Game size   | Standard two to five players in v1.                                                                                 |
| Accounts    | No sign-up or sign-in is required. Browsers use secure anonymous player identities.                                 |
| Rules       | Model the standard card-game rules in the game engine.                                                              |
| Multiplayer | Real-time, server-authoritative games. The browser may request an action but never decides whether it succeeds.     |
| Bots        | Bots use the same legal actions and game engine as human players.                                                   |
| Publishing  | Build for production from the outset: persistence, reconnection, testing, observability, and security are in scope. |
| Six players | Deferred. The player limit will remain configurable, but no six-player variant is part of v1.                       |
| Brand       | **Dealopoly** — _Deal Your Way to Victory._                                                                         |

## Architecture boundary

```text
Web app
  ├─ Landing page, room lobby, game table, replay/history UI
  └─ WebSocket client
            │
            ▼
Game server
  ├─ Room and reconnect management
  ├─ Rules validation and turn orchestration
  ├─ Bot scheduling
  └─ Player-specific state delivery
            │
            ▼
Game engine + database
  ├─ Pure deterministic game rules
  ├─ Event history and state snapshots
  └─ Persistent rooms and player identities
```

The game engine must remain independent of the interface, WebSockets, and the
database. It accepts a current game state and a requested command, then either
rejects it with a reason or returns the next state and domain events.

## Phased implementation

### Phase 0 — Project foundation

**Goal:** Create a maintainable TypeScript workspace and local development
environment.

Steps:

1. Create the web app, game server, game-engine package, shared types package,
   and reusable UI package.
2. Configure formatting, linting, type checking, environment-variable
   validation, and test commands.
3. Add a local database service and a documented way to run the whole stack.
4. Add CI to run formatting, type checks, unit tests, and production builds.
5. Create an architecture decision log for material changes made during build.

**Complete when:** a new developer can start the web app, game server, and
database locally with one documented workflow; automated checks run in CI.

### Phase 1 — Rules specification and game data

**Goal:** Convert the game into precise, testable data and rules before
building the interactive table.

Steps:

1. Write a rule specification covering setup, turns, draws, plays, banking,
   property sets, rent, actions, counters, discards, and the win condition.
2. Define the complete card catalogue with machine-readable effect identifiers,
   card values, property groups, set sizes, and legal targets.
3. Define the game-state model: deck, discard pile, hands, banks, property
   areas, turn state, pending decisions, and game outcome.
4. Define player commands such as `draw`, `playCard`, `chooseTarget`,
   `respond`, and `discard`.
5. Define server events and separate public/player-specific views of a game.
6. Add fixture games that represent normal, edge-case, and end-game states.

**Complete when:** the whole card catalogue and every supported command are
written down, typed, and reviewable without relying on UI behaviour.

### Phase 2 — Deterministic game engine

**Goal:** Implement the rules as a pure TypeScript engine.

Steps:

1. Implement match setup, shuffling, dealing, turn rotation, draw rules, and
   the action limit per turn.
2. Implement money, properties, complete sets, wild properties, and rent.
3. Implement each action and its target-selection flow.
4. Implement response/counter windows and chained resolutions where required.
5. Implement discarding, deck exhaustion handling, game completion, and
   winner calculation.
6. Return explicit validation failures for illegal commands.
7. Add exhaustive unit tests and deterministic simulations using seeded decks.

**Complete when:** the engine can run an entire game without a browser and its
rule tests cover normal play, invalid moves, and critical edge cases.

### Phase 3 — Anonymous identity and room lifecycle

**Goal:** Let players create, join, and recover private games with no account.

Steps:

1. Issue a secure, anonymous browser identity and persist only the token needed
   to reclaim that player seat.
2. Implement private-room creation with a short, non-guessable room code and a
   shareable invite URL.
3. Implement a join-by-code flow, display-name validation, lobby presence, and
   host controls.
4. Let the host select a bot game or friend game, configure open seats, and
   begin only when the room is valid.
5. Define room expiration, abandoned-lobby cleanup, and a reconnect grace
   period.
6. Add rate limits and validation to protect room creation and joining.

**Complete when:** two fresh browser sessions can create and join a private
room by link or code, then reconnect to their original seats.

### Phase 4 — Authoritative real-time server

**Goal:** Connect rooms to the game engine safely over real-time transport.

Steps:

1. Create the WebSocket protocol for room presence, game commands, game events,
   errors, reconnects, and heartbeats.
2. Bind each socket to an anonymous player identity and room seat.
3. Validate every incoming command on the server, pass it to the game engine,
   and broadcast only accepted state changes.
4. Generate tailored game views: a player sees their own hand but only public
   information, such as card counts, for opponents.
5. Serialize commands per game to prevent race conditions and duplicate moves.
6. Add turn/pending-decision timers where the chosen rules require them.
7. Instrument connection, command rejection, game completion, and reconnect
   events.

**Complete when:** a multi-browser match progresses correctly in real time and
client-side modification cannot reveal hidden cards or force illegal moves.

### Phase 5 — Playable game interface

**Goal:** Build the responsive Dealopoly experience around the real engine.

Steps:

1. Build the landing page with the two entry points: **Play with bots** and
   **Play with friends**.
2. Build the room lobby, invite/share controls, room-code join form, player
   list, and start controls.
3. Build reusable card components driven entirely by card data.
4. Build the game table: player areas, hand, deck, discard pile, bank,
   properties, turn indicator, activity feed, and pending-choice prompts.
5. Make legal actions clear; disable or explain unavailable actions rather than
   allowing silent failures.
6. Add responsive desktop and mobile layouts, keyboard support, and accessible
   card/action labels.
7. Add deliberate motion only after the interaction flow is correct: dealing,
   playing, drawing, and turn transitions.

**Complete when:** two to five human players can complete a match through the
browser without developer tools or manual state changes.

### Phase 6 — Bots and quick play

**Goal:** Make solo and mixed games reliable.

Steps:

1. Add a bot controller that receives only its player-specific game view.
2. Start with a deterministic, legal-move strategy: finish sets, protect key
   properties, bank money, and choose valid targets.
3. Introduce configurable decision delays so bot turns feel natural without
   slowing the game excessively.
4. Allow bot seats in private rooms, subject to the selected game setup.
5. Run automated bot-versus-bot simulations to detect deadlocks, invalid game
   states, and unusually long games.

**Complete when:** a player can start a bot game instantly and complete full
matches without bot-rule violations or stalled turns.

### Phase 7 — Persistence, recovery, and game history

**Goal:** Make active games durable and diagnosable.

Steps:

1. Persist rooms, anonymous player seats, accepted game events, and regular
   snapshots.
2. Restore an active room after a game-server restart.
3. Reconstruct an authoritative game state from a snapshot plus later events.
4. Provide a read-only completed-game summary and event timeline.
5. Define data retention and room-history expiration policies.
6. Add administrator-safe diagnostics that never expose private hands to other
   players.

**Complete when:** an active game survives refreshes and server restarts, and a
completed game can be replayed from its stored events.

### Phase 8 — Production hardening

**Goal:** Prepare the game for public release.

Steps:

1. Add integration tests for the WebSocket protocol and database persistence.
2. Add end-to-end tests for bot play, room creation, invite joins, reconnects,
   and a completed human match.
3. Load-test concurrent rooms and establish capacity targets.
4. Add structured logs, error tracking, health checks, metrics, and alerts.
5. Apply security controls: input validation, rate limits, secure tokens,
   origin checks, abuse protection, and dependency review.
6. Add database backups, migration procedures, and rollback documentation.
7. Conduct accessibility, mobile, performance, and privacy reviews.

**Complete when:** the release checklist passes in a production-like staging
environment and operational recovery procedures have been tested.

### Phase 9 — Deployment and launch

**Goal:** Publish a stable first release.

Steps:

1. Provision separate development, staging, and production environments.
2. Deploy the web app, real-time game server, database, and monitoring.
3. Configure environment secrets, domains, HTTPS, backups, and release gates.
4. Run a closed playtest with real users and track issues from room creation to
   completed game.
5. Resolve release-blocking reliability, rule, and accessibility issues.
6. Publish the first release and monitor room health, completion rates,
   disconnects, and errors.

**Complete when:** users can reliably create or join rooms, finish games, and
recover from transient failures in production.

## Cross-cutting acceptance rules

- The game server, not the client, is the authority for every move.
- No player can access another player's hand or hidden deck data through the
  network payloads.
- Every accepted move is reproducible from the stored event history.
- The same game engine is used for human players, bots, tests, and simulations.
- A player can rejoin an active game after a refresh or short disconnection.
- Standard two-to-five-player rules remain the v1 limit.

## Deferred work

The following are intentionally outside the initial release:

- A six-player ruleset and any deck/rule adjustments it requires.
- Required-account features such as friend lists, long-term profiles, rankings,
  and matchmaking.
- Public spectating and tournaments.
- Paid features, subscriptions, or in-game purchases.
- Advanced bot difficulty levels.

## Publication checkpoint

The engine should use stable internal effect IDs so presentation can change
without rewriting rules. Current planning follows the requested standard rule
set and card naming. Before any public release, obtain an appropriate legal
review for the use of commercial card names, card wording, artwork, trademarks,
and the Dealopoly name; do not ship copied artwork or brand assets.
