import { describe, expect, it } from "vitest";
import { Mediator } from "./mediator";

type Greet = { kind: "Greet"; name: string };
type CountItems = { kind: "CountItems" };

describe("Mediator", () => {
  it("routes a command to the handler registered for its kind", async () => {
    const mediator = new Mediator();
    mediator.registerCommand<Greet, string>("Greet", async (command) => `hello ${command.name}`);

    const greeting = await mediator.send<Greet, string>({ kind: "Greet", name: "Ana" });

    expect(greeting).toBe("hello Ana");
  });

  it("routes a query to the handler registered for its kind", async () => {
    const mediator = new Mediator();
    mediator.registerQuery<CountItems, number>("CountItems", async () => 3);

    const count = await mediator.ask<CountItems, number>({ kind: "CountItems" });

    expect(count).toBe(3);
  });

  it("refuses a command that has no registered handler", async () => {
    const mediator = new Mediator();

    await expect(mediator.send<Greet, string>({ kind: "Greet", name: "Ana" })).rejects.toThrow(
      "No command handler registered for Greet",
    );
  });

  it("keeps commands and queries in separate registries", async () => {
    const mediator = new Mediator();
    mediator.registerQuery<CountItems, number>("CountItems", async () => 3);

    await expect(mediator.send<CountItems, number>({ kind: "CountItems" })).rejects.toThrow(
      "No command handler registered for CountItems",
    );
  });
});
