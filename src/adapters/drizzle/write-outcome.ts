import type { WriteOutcome } from "@/ports/task-repository";

export class WriteConflict extends Error {
  constructor() {
    super("write conflict");
  }
}

const uniqueViolationCode = "23505";

const codeOf = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const direct = (error as { code?: unknown }).code;

  if (typeof direct === "string") {
    return direct;
  }

  return codeOf((error as { cause?: unknown }).cause);
};

export const runWrite = async (write: () => Promise<void>): Promise<WriteOutcome> => {
  try {
    await write();
    return "applied";
  } catch (error) {
    if (error instanceof WriteConflict || codeOf(error) === uniqueViolationCode) {
      return "conflict";
    }

    throw error;
  }
};
