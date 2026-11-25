import type { ProjectTypeChecker, TypeFailure } from "@/ports/project-type-checker";

export const createInMemoryProjectTypeChecker = (failures: readonly TypeFailure[] = []): ProjectTypeChecker => ({
  check: async () => [...failures],
});
