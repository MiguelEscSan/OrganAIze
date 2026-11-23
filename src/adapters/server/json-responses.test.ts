import { describe, expect, it } from "vitest";
import { readJsonObject } from "./json-responses";

const jsonRequest = (body: string) => new Request("http://localhost/api", { method: "POST", body });

describe("readJsonObject", () => {
  it("returns a JSON object body", async () => {
    expect(await readJsonObject(jsonRequest('{"title":"Landing"}'))).toEqual({ title: "Landing" });
  });

  it("returns null for a body that is not valid JSON", async () => {
    expect(await readJsonObject(jsonRequest("{not json"))).toBeNull();
  });

  it("returns null for a JSON array, null or a scalar", async () => {
    expect(await readJsonObject(jsonRequest("[1,2]"))).toBeNull();
    expect(await readJsonObject(jsonRequest("null"))).toBeNull();
    expect(await readJsonObject(jsonRequest('"text"'))).toBeNull();
  });
});
