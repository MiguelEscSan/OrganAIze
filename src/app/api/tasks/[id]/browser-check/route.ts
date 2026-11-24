import { browserCheckEnabled } from "@/adapters/server/browser-check-enabled";
import { getAppServices } from "@/adapters/server/app-services";
import { failedServer, readJsonObject, refused, succeeded } from "@/adapters/server/json-responses";
import type { Outcome } from "@/application/shared/outcome";

type BrowserCheckRouteContext = { params: Promise<{ id: string }> };

export const POST = async (request: Request, context: BrowserCheckRouteContext): Promise<Response> => {
  if (!browserCheckEnabled()) {
    return refused("The browser check runs only on a local machine");
  }

  const body = await readJsonObject(request);

  if (!body || body.confirmed !== true) {
    return refused("The browser check must be confirmed");
  }

  try {
    const { id } = await context.params;
    const { mediator } = getAppServices();
    const outcome = await mediator.send<
      { kind: "RunBrowserCheck"; taskId: string; confirmed: true },
      Outcome<null>
    >({ kind: "RunBrowserCheck", taskId: id, confirmed: true });

    return outcome.ok ? succeeded({}) : refused(outcome.reason);
  } catch (error) {
    return failedServer(error);
  }
};
