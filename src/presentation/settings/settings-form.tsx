export const SettingsForm = () => (
  <section className="flex flex-col gap-6 p-6 md:p-10">
    <header className="flex flex-col gap-1">
      <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
      <p className="text-muted">Adjust how the board behaves for your team.</p>
    </header>
    <form className="flex max-w-xl flex-col gap-5 rounded-2xl bg-paper p-6 ring-1 ring-line">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Team name</span>
        <input
          name="teamName"
          defaultValue="Agent Team"
          className="rounded-lg border border-line bg-cream px-3 py-2 outline-none focus:border-terracotta"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Maximum attempts per task</span>
        <select
          name="maxAttempts"
          defaultValue="3"
          className="rounded-lg border border-line bg-cream px-3 py-2 outline-none focus:border-terracotta"
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
        <span className="text-xs text-muted">After this many failed QA attempts a task is marked as blocked.</span>
      </label>
      <label className="flex items-center justify-between gap-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">Refresh board automatically</span>
          <span className="text-xs text-muted">The board checks for changes every two seconds.</span>
        </span>
        <input type="checkbox" name="autoRefresh" defaultChecked className="h-5 w-5 accent-terracotta" />
      </label>
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-full bg-terracotta px-5 py-2 text-sm font-bold text-paper transition-opacity hover:opacity-90"
        >
          Save changes
        </button>
      </div>
    </form>
  </section>
);
