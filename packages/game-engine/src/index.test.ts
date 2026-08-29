import { describe, expect, it } from "vitest";

import { gameEnginePackage } from "./index.js";

describe("game engine package", () => {
  it("is available as an isolated package", () => {
    expect(gameEnginePackage).toBe("@dealopoly/game-engine");
  });
});
