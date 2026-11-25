import { strToU8, zipSync } from "fflate";
import type { ArchiveWriter } from "@/ports/archive-writer";

export const createFflateArchiveWriter = (): ArchiveWriter => ({
  write: (files) => zipSync(Object.fromEntries(files.map((file) => [file.path, strToU8(file.content)]))),
});
