import type { PromptVariables } from "@/ports/prompt-library";

const sectionPattern = /^\{\{#(\w+)\}\}\n([\s\S]*?)^\{\{\/\1\}\}(?:\n|$)/gm;
const sectionNamePattern = /\{\{#(\w+)\}\}/g;
const placeholderPattern = /\{\{(\w+)\}\}/g;

const namesIn = (template: string, pattern: RegExp): string[] => [...template.matchAll(pattern)].map((match) => match[1]);

const hasVariable = (variables: PromptVariables, name: string): boolean => Object.hasOwn(variables, name);

const needsVariable = (promptName: string, variable: string): Error =>
  new Error(`The prompt "${promptName}" needs the variable "${variable}"`);

const assertEveryVariableIsUsed = (promptName: string, template: string, variables: PromptVariables): void => {
  const used = new Set([...namesIn(template, sectionNamePattern), ...namesIn(template, placeholderPattern)]);
  const unused = Object.keys(variables).find((variable) => !used.has(variable));

  if (unused !== undefined) {
    throw new Error(`The prompt "${promptName}" does not use the variable "${unused}"`);
  }
};

const keepPresentSections = (promptName: string, template: string, variables: PromptVariables): string =>
  template.replace(sectionPattern, (_section, variable: string, body: string) => {
    if (!hasVariable(variables, variable)) {
      throw needsVariable(promptName, variable);
    }

    return variables[variable] === undefined ? "" : body;
  });

const fillPlaceholders = (promptName: string, template: string, variables: PromptVariables): string =>
  template.replace(placeholderPattern, (_placeholder, variable: string) => {
    const value = variables[variable];

    if (value === undefined) {
      throw needsVariable(promptName, variable);
    }

    return value;
  });

export const renderTemplate = (promptName: string, template: string, variables: PromptVariables): string => {
  assertEveryVariableIsUsed(promptName, template, variables);

  return fillPlaceholders(promptName, keepPresentSections(promptName, template, variables), variables);
};
