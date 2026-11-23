export type InterfaceProbeResult =
  | { ok: true; pageText: string; consoleErrors: string[] }
  | { ok: false; reason: string };

export type InterfaceProbe = {
  inspect: (rootPath: string) => Promise<InterfaceProbeResult>;
};
