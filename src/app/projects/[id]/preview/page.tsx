import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { loadProjectFilesForPage } from "@/adapters/server/project-files-loader";
import { LiveProjectPreview } from "@/presentation/project-files/live-project-files";
import { ProjectFilesUnavailable } from "@/presentation/project-files/project-files-unavailable";

type PreviewPageProps = { params: Promise<{ id: string }> };

const LivePreview = async ({ params }: PreviewPageProps) => {
  await connection();
  const { id } = await params;
  const load = await loadProjectFilesForPage(id);

  if (load.kind === "missing") {
    notFound();
  }

  if (load.kind === "unavailable") {
    return <ProjectFilesUnavailable reason={load.reason} />;
  }

  return <LiveProjectPreview boardId={id} initialFiles={load.files} />;
};

export default function PreviewPage({ params }: PreviewPageProps) {
  return (
    <Suspense fallback={<p className="px-6 text-muted md:px-10">Loading the preview</p>}>
      <LivePreview params={params} />
    </Suspense>
  );
}
