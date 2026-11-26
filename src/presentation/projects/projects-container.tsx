"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Board } from "@/domain/boards/board";
import { sendJson, type ApiOutcome } from "../shared/send-json";
import { ProjectDialog, type ProjectFormValues } from "./project-dialog";
import { ProjectsList } from "./projects-list";

type DialogState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; board: Board };

type ProjectsContainerProps = {
  boards: Board[];
  loadError: string | null;
};

const emptyValues: ProjectFormValues = { name: "", rootPath: "" };

const boardPath = (boardId: string): string => `/api/boards/${encodeURIComponent(boardId)}`;

export const ProjectsContainer = ({ boards, loadError }: ProjectsContainerProps) => {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const [pending, setPending] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const closeDialog = () => {
    setDialog({ mode: "closed" });
    setDialogError(null);
  };

  const openCreate = () => {
    setDialogError(null);
    setDialog({ mode: "create" });
  };

  const openEdit = (board: Board) => {
    setDialogError(null);
    setDialog({ mode: "edit", board });
  };

  const finish = async (outcome: Promise<ApiOutcome>, fallbackReason: string) => {
    setPending(true);
    const result = await outcome;
    setPending(false);

    if (!result.ok) {
      setDialogError(result.reason ?? fallbackReason);
      return;
    }

    closeDialog();
    router.refresh();
  };

  const handleSave = async (values: ProjectFormValues) => {
    if (dialog.mode === "create") {
      await finish(sendJson("POST", "/api/boards", values), "The project could not be created");
      return;
    }

    if (dialog.mode === "edit") {
      await finish(sendJson("PUT", boardPath(dialog.board.id), values), "The project could not be saved");
    }
  };

  const handleDelete = async () => {
    if (dialog.mode === "edit") {
      await finish(sendJson("DELETE", boardPath(dialog.board.id)), "The project could not be deleted");
    }
  };

  const dialogInitialValues: ProjectFormValues =
    dialog.mode === "edit" ? { name: dialog.board.name, rootPath: dialog.board.rootPath ?? "" } : emptyValues;

  return (
    <div className="flex flex-col gap-3">
      {loadError ? (
        <p role="alert" className="mx-6 rounded-lg bg-terracotta/10 px-4 py-2 text-sm text-terracotta md:mx-10">
          {loadError}
        </p>
      ) : null}
      <ProjectsList boards={boards} onCreate={openCreate} onEdit={openEdit} />
      {dialog.mode === "closed" ? null : (
        <ProjectDialog
          key={dialog.mode === "edit" ? dialog.board.id : "create"}
          mode={dialog.mode}
          initialValues={dialogInitialValues}
          error={dialogError}
          pending={pending}
          onSubmit={handleSave}
          onDelete={handleDelete}
          onClose={closeDialog}
        />
      )}
    </div>
  );
};
