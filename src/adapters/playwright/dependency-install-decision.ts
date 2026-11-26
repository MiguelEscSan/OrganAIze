const namesOf = (value: unknown): string[] =>
  typeof value === "object" && value !== null ? Object.keys(value) : [];

export const declaredDependencyNames = (packageJsonText: string | null): string[] => {
  if (packageJsonText === null) {
    return [];
  }

  try {
    const manifest: unknown = JSON.parse(packageJsonText);

    if (typeof manifest !== "object" || manifest === null) {
      return [];
    }

    const { dependencies, devDependencies } = manifest as Record<string, unknown>;

    return [...namesOf(dependencies), ...namesOf(devDependencies)];
  } catch {
    return [];
  }
};

export const needsDependencyInstall = (packageJsonText: string | null, installedNames: readonly string[]): boolean =>
  declaredDependencyNames(packageJsonText).some((name) => !installedNames.includes(name));
