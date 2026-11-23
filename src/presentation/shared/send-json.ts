export type ApiOutcome = { ok: boolean; reason?: string };

const unreachableServerReason = "The server could not be reached";

export const sendJson = async (method: "POST" | "PUT" | "DELETE", url: string, body?: unknown): Promise<ApiOutcome> => {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const parsed = (await response.json()) as ApiOutcome | null;

    if (!response.ok || !parsed?.ok) {
      return { ok: false, reason: parsed?.reason ?? `The server answered with status ${response.status}` };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: unreachableServerReason };
  }
};
