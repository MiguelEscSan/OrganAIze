import * as ts from "typescript";
import type { ProjectFile } from "@/ports/project-files";
import type { ProjectTypeChecker, TypeFailure } from "@/ports/project-type-checker";

const virtualRoot = "/project";
const typeScriptSourcePattern = /\.(ts|tsx)$/;
const quotedValuePattern = /'([^']+)'|"([^"]+)"/g;
const codeExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);
const unavailableGlobalNames = new Set(["React", "JSX", "NodeJS"]);
const packageTypingMessagePattern = /\b(JSX|React|ImportMeta)\b/;

const reportedDiagnostics = new Map<number, string>([
  [2307, "Unresolved relative import"],
  [2304, "Unknown name"],
  [2305, "Missing exported member"],
  [2614, "Missing exported member"],
  [2552, "Misspelled name"],
  [2551, "Misspelled property"],
  [2554, "Wrong argument count"],
  [2555, "Wrong argument count"],
  [2322, "Type mismatch"],
  [2345, "Argument type mismatch"],
  [2339, "Unknown property"],
]);

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.Preserve,
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  isolatedModules: true,
  esModuleInterop: true,
  resolveJsonModule: true,
  types: [],
};

const withForwardSlashes = (path: string): string => path.replace(/\\/g, "/");

const defaultLibraryPath = (options: ts.CompilerOptions): string => withForwardSlashes(ts.getDefaultLibFilePath(options));

const libraryDirectory = defaultLibraryPath(compilerOptions).replace(/\/[^/]+$/, "");
const librarySources = new Map<string, ts.SourceFile | null>();

const normalizedPath = (path: string): string => withForwardSlashes(path).replace(/^\.\//, "").replace(/^\/+/, "");

const virtualPathOf = (path: string): string => `${virtualRoot}/${normalizedPath(path)}`;

const isLibraryFile = (fileName: string): boolean => fileName.startsWith(`${libraryDirectory}/`);

const libraryContent = (fileName: string): string | undefined => {
  try {
    return ts.sys.readFile(fileName);
  } catch {
    return undefined;
  }
};

const librarySource = (fileName: string, languageVersion: ts.ScriptTarget | ts.CreateSourceFileOptions): ts.SourceFile | undefined => {
  if (!librarySources.has(fileName)) {
    const content = libraryContent(fileName);

    librarySources.set(fileName, content === undefined ? null : ts.createSourceFile(fileName, content, languageVersion));
  }

  return librarySources.get(fileName) ?? undefined;
};

const directoriesOf = (fileNames: Iterable<string>): Set<string> => {
  const directories = new Set<string>([virtualRoot]);

  for (const fileName of fileNames) {
    for (let index = fileName.lastIndexOf("/"); index > 0; index = fileName.lastIndexOf("/", index - 1)) {
      directories.add(fileName.slice(0, index));
    }
  }

  return directories;
};

const createHost = (contents: ReadonlyMap<string, string>): ts.CompilerHost => {
  const directories = directoriesOf(contents.keys());

  return {
    getSourceFile: (fileName, languageVersion) => {
      if (isLibraryFile(fileName)) {
        return librarySource(fileName, languageVersion);
      }

      const content = contents.get(fileName);

      return content === undefined ? undefined : ts.createSourceFile(fileName, content, languageVersion);
    },
    getDefaultLibFileName: defaultLibraryPath,
    writeFile: () => undefined,
    getCurrentDirectory: () => virtualRoot,
    getDirectories: () => [],
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    fileExists: (fileName) => contents.has(fileName) || (isLibraryFile(fileName) && libraryContent(fileName) !== undefined),
    readFile: (fileName) => contents.get(fileName) ?? (isLibraryFile(fileName) ? libraryContent(fileName) : undefined),
    directoryExists: (directory) => directories.has(directory) || isLibraryFile(`${directory}/`),
  };
};

const quotedValues = (text: string): string[] =>
  [...text.matchAll(quotedValuePattern)].map((match) => match[1] ?? match[2] ?? "");

const isRelativeSpecifier = (specifier: string): boolean => specifier.startsWith("./") || specifier.startsWith("../");

const extensionOf = (specifier: string): string => {
  const lastSegment = specifier.slice(specifier.lastIndexOf("/") + 1);
  const dot = lastSegment.lastIndexOf(".");

  return dot <= 0 ? "" : lastSegment.slice(dot);
};

const isUnresolvedCodeImport = (message: string): boolean => {
  const specifier = quotedValues(message)[0] ?? "";
  const extension = extensionOf(specifier);

  return isRelativeSpecifier(specifier) && (extension === "" || codeExtensions.has(extension));
};

const importedNames = (clause: ts.ImportClause): string[] => {
  const bindings = clause.namedBindings;
  const defaultName = clause.name ? [clause.name.text] : [];

  if (bindings && ts.isNamespaceImport(bindings)) {
    return [...defaultName, bindings.name.text];
  }

  return bindings ? [...defaultName, ...bindings.elements.map((element) => element.name.text)] : defaultName;
};

const isPackageImport = (statement: ts.ImportDeclaration): boolean =>
  ts.isStringLiteral(statement.moduleSpecifier) && !isRelativeSpecifier(statement.moduleSpecifier.text);

const unresolvedPackageNames = (source: ts.SourceFile): Set<string> =>
  new Set(
    source.statements
      .filter(ts.isImportDeclaration)
      .filter(isPackageImport)
      .flatMap((statement) => (statement.importClause ? importedNames(statement.importClause) : [])),
  );

const mentionsAny = (message: string, names: ReadonlySet<string>): boolean =>
  quotedValues(message).some((value) => [...names].some((name) => new RegExp(`\\b${name}\\b`).test(value)));

const isRealMistake = (diagnostic: ts.Diagnostic, message: string, packageNames: ReadonlySet<string>): boolean => {
  switch (diagnostic.code) {
    case 2307:
      return isUnresolvedCodeImport(message);
    case 2304:
    case 2552:
      return !unavailableGlobalNames.has(quotedValues(message)[0] ?? "");
    case 2322:
    case 2345:
    case 2339:
    case 2551:
      return !packageTypingMessagePattern.test(message) && !mentionsAny(message, packageNames);
    default:
      return true;
  }
};

const lineOf = (diagnostic: ts.Diagnostic): number | null =>
  diagnostic.file && diagnostic.start !== undefined
    ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1
    : null;

const failuresOf = (program: ts.Program, source: ts.SourceFile, displayPath: string): TypeFailure[] => {
  const packageNames = unresolvedPackageNames(source);
  const diagnostics = [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];

  return diagnostics.flatMap((diagnostic) => {
    const name = reportedDiagnostics.get(diagnostic.code);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");

    return name !== undefined && isRealMistake(diagnostic, message, packageNames)
      ? [{ file: displayPath, line: lineOf(diagnostic), message: `${name}: ${message}` }]
      : [];
  });
};

const checkProject = (files: readonly ProjectFile[], ownPaths: readonly string[]): TypeFailure[] => {
  const contents = new Map(files.map((file) => [virtualPathOf(file.path), file.content]));
  const rootNames = [...contents.keys()].filter((fileName) => typeScriptSourcePattern.test(fileName));
  const program = ts.createProgram({ rootNames, options: compilerOptions, host: createHost(contents) });

  return ownPaths.flatMap((path) => {
    const source = program.getSourceFile(virtualPathOf(path));

    return source && typeScriptSourcePattern.test(path) ? failuresOf(program, source, normalizedPath(path)) : [];
  });
};

export const createTypeScriptProjectTypeChecker = (): ProjectTypeChecker => ({
  check: async (files, ownPaths) => checkProject(files, ownPaths),
});
