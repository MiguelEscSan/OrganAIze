import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { loadProjectFiles } from "@/adapters/server/project-files-loader";
import { FilesBrowser } from "@/presentation/project-files/files-browser";

type FilesPageProps = { params: Promise<{ id: string }> };

const LiveFiles = async ({ params }: FilesPageProps) => {
  await connection();
  const { id } = await params;
  const files = await loadProjectFiles(id);

  if (!files) {
    notFound();
  }

  return <FilesBrowser files={files} />;
};

export default function FilesPage({ params }: FilesPageProps) {
  return (
    <Suspense fallback={<p className="px-6 text-muted md:px-10">Loading the files</p>}>
      <LiveFiles params={params} />
    </Suspense>
  );
}
