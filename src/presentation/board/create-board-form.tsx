import { useState, type FormEvent } from "react";

export type BoardFormValues = { name: string; rootPath: string };

type CreateBoardFormProps = {
  onSubmit: (values: BoardFormValues) => void;
  error: string | null;
  pending: boolean;
};

export const CreateBoardForm = ({ onSubmit, error, pending }: CreateBoardFormProps) => {
  const [name, setName] = useState("");
  const [rootPath, setRootPath] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ name, rootPath });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Add a project</h2>
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
        Project folder (absolute path)
        <input
          name="rootPath"
          required
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
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-black/80 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add project"}
      </button>
    </form>
  );
};
