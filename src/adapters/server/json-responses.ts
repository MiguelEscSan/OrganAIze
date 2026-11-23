export const succeeded = (body: unknown, status = 200): Response => Response.json({ ok: true, ...(body as object) }, { status });

export const refused = (reason: string, status = 400): Response => Response.json({ ok: false, reason }, { status });

export const failedServer = (error: unknown): Response =>
  refused(error instanceof Error ? error.message : "Unexpected server error", 500);

export const readJsonObject = async (request: Request): Promise<Record<string, unknown> | null> => {
  try {
    const body: unknown = await request.json();

    return typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};
