import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { loadProjectFiles } from "@/adapters/server/project-files-loader";
import { LiveFilesBrowser } from "@/presentation/project-files/live-project-files";

type FilesPageProps = { params: Promise<{ id: string }> };

const LiveFiles = async ({ params }: FilesPageProps) => {
  await connection();
  const { id } = await params;
  const files = await loadProjectFiles(id);

  if (!files) {
    notFound();
  }

  return <LiveFilesBrowser boardId={id} initialFiles={files} />;
};

export default function FilesPage({ params }: FilesPageProps) {
  return (
    <Suspense fallback={<p className="px-6 text-muted md:px-10">Loading the files</p>}>
      <LiveFiles params={params} />
    </Suspense>
  );
}
