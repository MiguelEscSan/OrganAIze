import { failedServer, refused } from "@/adapters/server/json-responses";
import { loadProjectArchive } from "@/adapters/server/project-archive-loader";

type ProjectDownloadRouteContext = { params: Promise<{ id: string }> };

export const GET = async (_request: Request, context: ProjectDownloadRouteContext): Promise<Response> => {
  try {
    const { id } = await context.params;
    const archive = await loadProjectArchive(id);

    if (!archive) {
      return refused("The project was not found", 404);
    }

    return new Response(new Blob([archive.bytes as BlobPart], { type: "application/zip" }), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${archive.filename}"`,
      },
    });
  } catch (error) {
    return failedServer(error);
  }
};
