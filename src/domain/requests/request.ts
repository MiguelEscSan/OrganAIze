export type Request = {
  id: string;
  title: string;
  description: string;
};

export type RequestDetails = {
  title: string;
  description: string;
};

export type RequestDetailsResult =
  | { ok: true; details: RequestDetails }
  | { ok: false; reason: string };

export const normalizeRequestDetails = (details: RequestDetails): RequestDetailsResult => {
  const title = details.title.trim();

  if (title.length === 0) {
    return { ok: false, reason: "A request needs a title" };
  }

  return { ok: true, details: { title, description: details.description } };
};
