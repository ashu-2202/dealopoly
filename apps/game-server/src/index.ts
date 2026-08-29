import { createGameServer } from "./server.js";

const server = createGameServer();
const port = Number.parseInt(
  process.env.PORT ?? process.env.GAME_SERVER_PORT ?? "4000",
  10
);

async function start() {
  try {
    await server.listen({ host: "0.0.0.0", port });
  } catch (error) {
    server.log.error(error);
    process.exitCode = 1;
  }
}

void start();
