import { describe, expect, it } from "vitest";
import { describeRequestProgress } from "./describe-request-progress";

describe("describeRequestProgress", () => {
  it("shows only the deployed count when nothing waits for release", () => {
    expect(describeRequestProgress({ deployed: 2, awaitingRelease: 0, total: 5 })).toBe("2 of 5 deployed");
  });

  it("shows only the waiting count when nothing is deployed yet", () => {
    expect(describeRequestProgress({ deployed: 0, awaitingRelease: 3, total: 5 })).toBe(
      "3 of 5 awaiting release",
    );
  });

  it("shows both counts against the total", () => {
    expect(describeRequestProgress({ deployed: 1, awaitingRelease: 2, total: 5 })).toBe(
      "2 awaiting release, 1 deployed of 5",
    );
  });

  it("shows zero deployed when nothing has moved forward", () => {
    expect(describeRequestProgress({ deployed: 0, awaitingRelease: 0, total: 4 })).toBe("0 of 4 deployed");
  });
});
