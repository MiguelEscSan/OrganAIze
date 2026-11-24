export const browserCheckEnabledIn = (environment: Readonly<Record<string, string | undefined>>): boolean =>
  environment.BROWSER_CHECK_ENABLED === "true";

export const browserCheckEnabled = (): boolean => browserCheckEnabledIn(process.env);
