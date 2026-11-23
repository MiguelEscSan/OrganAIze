import * as ts from "typescript";

export type CheckedFile = { path: string; content: string | null };

export type CheckFailure = { file: string; line: number | null; message: string };

const typeScriptFilePattern = /\.tsx?$/;

const missingFileFailure = (path: string): CheckFailure => ({
  file: path,
  line: null,
  message: `File ${path} does not exist`,
});

const lineOfDiagnostic = (diagnostic: ts.Diagnostic): number | null => {
  if (!diagnostic.file || diagnostic.start === undefined) {
    return null;
  }

  return diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
};

const syntaxFailures = (path: string, content: string): CheckFailure[] =>
  (ts.transpileModule(content, { fileName: path, reportDiagnostics: true }).diagnostics ?? []).map((diagnostic) => ({
    file: path,
    line: lineOfDiagnostic(diagnostic),
    message: `Syntax error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`,
  }));

const checkFile = (file: CheckedFile): CheckFailure[] => {
  if (file.content === null) {
    return [missingFileFailure(file.path)];
  }

  return typeScriptFilePattern.test(file.path) ? syntaxFailures(file.path, file.content) : [];
};

export const runDeterministicChecks = (files: readonly CheckedFile[]): CheckFailure[] => files.flatMap(checkFile);
