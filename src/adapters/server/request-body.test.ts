import { describe, expect, it } from "vitest";
import { defaultAppSettings } from "@/domain/settings/app-settings";
import {
  hasOptionalRequestText,
  parseRequestText,
  parseReviewDecision,
  parseSettingsBody,
} from "./request-body";

describe("parseRequestText", () => {
  it("returns the title and description when both are text", () => {
    expect(parseRequestText({ title: "Landing", description: "A page" })).toEqual({
      title: "Landing",
      description: "A page",
    });
  });

  it("refuses a body where either field is missing or not text", () => {
    expect(parseRequestText({ title: "Landing" })).toBeNull();
    expect(parseRequestText({ title: 1, description: "A page" })).toBeNull();
  });
});

describe("hasOptionalRequestText", () => {
  it("accepts absent fields and text fields", () => {
    expect(hasOptionalRequestText({})).toBe(true);
    expect(hasOptionalRequestText({ title: "Landing", description: "" })).toBe(true);
  });

  it("refuses a field that is present but not text", () => {
    expect(hasOptionalRequestText({ title: null })).toBe(false);
    expect(hasOptionalRequestText({ description: 3 })).toBe(false);
  });
});

describe("parseReviewDecision", () => {
  it("accepts continue, send_to_ready and delete", () => {
    expect(parseReviewDecision("continue")).toBe("continue");
    expect(parseReviewDecision("send_to_ready")).toBe("send_to_ready");
    expect(parseReviewDecision("delete")).toBe("delete");
  });

  it("refuses any other value", () => {
    expect(parseReviewDecision("promote")).toBeNull();
    expect(parseReviewDecision(undefined)).toBeNull();
  });
});

describe("parseSettingsBody", () => {
  it("returns the settings when every field has the right type", () => {
    expect(parseSettingsBody({ ...defaultAppSettings })).toEqual(defaultAppSettings);
  });

  it("refuses a body missing a numeric field", () => {
    expect(parseSettingsBody({ ...defaultAppSettings, maxTokens: undefined })).toBeNull();
  });

  it("refuses a body whose auto refresh flag is not a boolean", () => {
    expect(parseSettingsBody({ ...defaultAppSettings, autoRefresh: "yes" })).toBeNull();
  });
});
