const plainCommand = "npm run dev";

const devScriptOf = (packageJsonText: string | null): string | null => {
  if (packageJsonText === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(packageJsonText);
    const scripts = (parsed as { scripts?: { dev?: unknown } } | null)?.scripts;

    return typeof scripts?.dev === "string" ? scripts.dev : null;
  } catch {
    return null;
  }
};

const runsVite = (devScript: string): boolean => /^vite(\s|$)/.test(devScript.trim());

export const devCommandFor = (packageJsonText: string | null, port: number): string => {
  const devScript = devScriptOf(packageJsonText);

  return devScript !== null && runsVite(devScript)
    ? `${plainCommand} -- --host 127.0.0.1 --port ${port} --strictPort`
    : plainCommand;
};
