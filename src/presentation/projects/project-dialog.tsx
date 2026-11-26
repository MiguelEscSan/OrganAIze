import { useEffect, useId, useState, type FormEvent } from "react";

export type ProjectFormValues = { name: string; rootPath: string };

type ProjectDialogProps = {
  mode: "create" | "edit";
  initialValues: ProjectFormValues;
  error: string | null;
  pending: boolean;
  onSubmit: (values: ProjectFormValues) => void;
  onDelete: () => void;
  onClose: () => void;
};

export const ProjectDialog = ({ mode, initialValues, error, pending, onSubmit, onDelete, onClose }: ProjectDialogProps) => {
  const titleId = useId();
  const [name, setName] = useState(initialValues.name);
  const [rootPath, setRootPath] = useState(initialValues.rootPath);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ name, rootPath });
  };

  const handleDeleteClick = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    onDelete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-paper p-6 ring-1 ring-line">
        <h2 id={titleId} className="text-lg font-bold">
          {mode === "create" ? "New project" : "Edit project"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              name="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-lg border border-black/10 bg-transparent px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Project folder (absolute path, optional)
            <input
              name="rootPath"
              placeholder="Leave empty to store the files in cloud storage"
              value={rootPath}
              onChange={(event) => setRootPath(event.target.value)}
              className="rounded-lg border border-black/10 bg-transparent px-3 py-2"
            />
          </label>
          {error ? (
            <p role="alert" className="rounded-lg bg-terracotta/10 px-4 py-2 text-sm text-terracotta">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {mode === "edit" ? (
              <button
                type="button"
                disabled={pending}
                onClick={handleDeleteClick}
                className="rounded-lg px-3 py-2 text-sm text-terracotta ring-1 ring-terracotta/40 disabled:opacity-50"
              >
                {confirmingDelete ? "Confirm delete" : "Delete"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={onClose} className="rounded-lg px-3 py-2 text-sm ring-1 ring-line disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={pending} className="rounded-lg bg-black/80 px-3 py-2 text-sm text-white disabled:opacity-50">
                {pending ? "Saving" : mode === "create" ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
