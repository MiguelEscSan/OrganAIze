import { BoardContainer } from "@/presentation/board/board-container";
import { sampleTasks } from "@/adapters/in-memory/sample-tasks";

export default function Home() {
  return (
    <section className="flex flex-col gap-2">
      <header className="flex flex-col gap-1 px-6 pt-6 md:px-10 md:pt-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Board</h1>
        <p className="text-muted">Define a request, send it to Ready, and the agents take it from there.</p>
      </header>
      <BoardContainer initialTasks={sampleTasks} />
    </section>
  );
}
