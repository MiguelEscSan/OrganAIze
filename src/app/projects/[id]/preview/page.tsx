import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { loadProjectFiles } from "@/adapters/server/project-files-loader";
import { ProjectPreview } from "@/presentation/project-files/project-preview";

type PreviewPageProps = { params: Promise<{ id: string }> };

const LivePreview = async ({ params }: PreviewPageProps) => {
  await connection();
  const { id } = await params;
  const files = await loadProjectFiles(id);

  if (!files) {
    notFound();
  }

  return <ProjectPreview files={files} />;
};

export default function PreviewPage({ params }: PreviewPageProps) {
  return (
    <Suspense fallback={<p className="px-6 text-muted md:px-10">Loading the preview</p>}>
      <LivePreview params={params} />
    </Suspense>
  );
}
