import { failedServer, refused, succeeded } from "@/adapters/server/json-responses";
import { loadProjectFiles } from "@/adapters/server/project-files-loader";

type ProjectFilesRouteContext = { params: Promise<{ id: string }> };

export const GET = async (_request: Request, context: ProjectFilesRouteContext): Promise<Response> => {
  try {
    const { id } = await context.params;
    const files = await loadProjectFiles(id);

    return files ? succeeded({ files }) : refused("The project was not found");
  } catch (error) {
    return failedServer(error);
  }
};
