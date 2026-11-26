type ProjectFilesUnavailableProps = { reason: string };

export const ProjectFilesUnavailable = ({ reason }: ProjectFilesUnavailableProps) => (
  <div role="alert" className="mx-6 flex flex-col gap-1 rounded-lg bg-terracotta/10 px-4 py-3 text-sm text-terracotta md:mx-10">
    <p className="font-bold">The project files are not available</p>
    <p>{reason}</p>
    <p>Check that the storage behind this project is running and configured, then reload.</p>
  </div>
);
