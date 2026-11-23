export const succeeded = (body: unknown, status = 200): Response => Response.json({ ok: true, ...(body as object) }, { status });

export const refused = (reason: string, status = 400): Response => Response.json({ ok: false, reason }, { status });

export const failedServer = (error: unknown): Response =>
  refused(error instanceof Error ? error.message : "Unexpected server error", 500);
