const declaresEntries = (value: unknown): boolean =>
  typeof value === "object" && value !== null && Object.keys(value).length > 0;

const declaresDependencies = (packageJsonText: string): boolean => {
  try {
    const manifest: unknown = JSON.parse(packageJsonText);

    if (typeof manifest !== "object" || manifest === null) {
      return false;
    }

    const { dependencies, devDependencies } = manifest as Record<string, unknown>;

    return declaresEntries(dependencies) || declaresEntries(devDependencies);
  } catch {
    return false;
  }
};

export const needsDependencyInstall = (packageJsonText: string | null, nodeModulesExists: boolean): boolean =>
  packageJsonText !== null && !nodeModulesExists && declaresDependencies(packageJsonText);
