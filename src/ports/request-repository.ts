import type { Request } from "@/domain/requests/request";

export type RequestRepository = {
  list(): Promise<Request[]>;
  save(request: Request): Promise<void>;
  remove(requestId: string): Promise<void>;
};
