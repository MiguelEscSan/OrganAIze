import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PromptLibrary, PromptName } from "@/ports/prompt-library";
import { renderTemplate } from "./render-template";

const withoutFinalNewline = (text: string): string => (text.endsWith("\n") ? text.slice(0, -1) : text);

const readTemplate = (name: PromptName, path: string): string => {
  try {
    return withoutFinalNewline(readFileSync(path, "utf8").replaceAll("\r\n", "\n"));
  } catch {
    throw new Error(`The prompt "${name}" was not found at ${path}`);
  }
};

export const createFilePromptLibrary = (directory: string): PromptLibrary => {
  const templates = new Map<PromptName, string>();

  const templateOf = (name: PromptName): string => {
    const cached = templates.get(name);

    if (cached !== undefined) {
      return cached;
    }

    const template = readTemplate(name, join(directory, `${name}.md`));
    templates.set(name, template);

    return template;
  };

  return { render: (name, variables) => renderTemplate(name, templateOf(name), variables) };
};
