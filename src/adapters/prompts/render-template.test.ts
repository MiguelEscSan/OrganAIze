import { describe, expect, it } from "vitest";
import { renderTemplate } from "./render-template";

describe("renderTemplate", () => {
  it("replaces every placeholder with its value", () => {
    expect(renderTemplate("sample", "Hello {{name}}, welcome to {{place}}. Bye {{name}}.", { name: "Ana", place: "Madrid" })).toBe(
      "Hello Ana, welcome to Madrid. Bye Ana.",
    );
  });

  it("keeps the whitespace of the template and of the values exactly", () => {
    expect(renderTemplate("sample", "a\n\n{{first}}\n  {{second}}\n\n\nz", { first: "1\n2", second: "" })).toBe("a\n\n1\n2\n  \n\n\nz");
  });

  it("inserts values literally even when they look like placeholders or replacement patterns", () => {
    expect(renderTemplate("sample", "{{code}}", { code: "{{name}} $& $1 $$" })).toBe("{{name}} $& $1 $$");
  });

  it("fails when a placeholder has no value", () => {
    expect(() => renderTemplate("sample", "Hello {{name}}", {})).toThrow('The prompt "sample" needs the variable "name"');
  });

  it("fails when a variable is passed that the template does not use", () => {
    expect(() => renderTemplate("sample", "Hello {{name}}", { name: "Ana", extra: "x" })).toThrow(
      'The prompt "sample" does not use the variable "extra"',
    );
  });

  describe("sections", () => {
    const template = ["Start", "", "{{#note}}", "Note:", "", "{{note}}", "", "{{/note}}", "End"].join("\n");

    it("renders the lines of a section when its variable has a value", () => {
      expect(renderTemplate("sample", template, { note: "be kind" })).toBe("Start\n\nNote:\n\nbe kind\n\nEnd");
    });

    it("drops the whole section, including its tag lines, when its variable is undefined", () => {
      expect(renderTemplate("sample", template, { note: undefined })).toBe("Start\n\nEnd");
    });

    it("renders a section whose value is an empty string", () => {
      expect(renderTemplate("sample", template, { note: "" })).toBe("Start\n\nNote:\n\n\n\nEnd");
    });

    it("counts a variable used only by a section as used", () => {
      expect(() => renderTemplate("sample", "{{#note}}\nx\n{{/note}}\nend", { note: undefined })).not.toThrow();
    });

    it("fails when a section variable is passed but the template has no section for it", () => {
      expect(() => renderTemplate("sample", "end", { note: undefined })).toThrow('The prompt "sample" does not use the variable "note"');
    });
  });
});
