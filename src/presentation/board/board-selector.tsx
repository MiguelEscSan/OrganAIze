import type { Board } from "@/domain/boards/board";

type BoardSelectorProps = {
  boards: Board[];
  selectedBoardId: string | null;
  onSelect: (boardId: string) => void;
};

export const BoardSelector = ({ boards, selectedBoardId, onSelect }: BoardSelectorProps) => {
  if (boards.length === 0) {
    return <p className="text-sm text-muted">No projects yet. Add one to start a board.</p>;
  }

  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      Project
      <select
        className="rounded-lg border border-black/10 bg-transparent px-3 py-2"
        value={selectedBoardId ?? boards[0].id}
        onChange={(event) => onSelect(event.target.value)}
      >
        {boards.map((board) => (
          <option key={board.id} value={board.id}>
            {board.name}
          </option>
        ))}
      </select>
    </label>
  );
};
