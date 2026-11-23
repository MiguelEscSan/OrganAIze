type ApiKeyStatusProps = {
  configured: boolean;
};

export const ApiKeyStatus = ({ configured }: ApiKeyStatusProps) => (
  <div className="flex flex-col gap-3 rounded-2xl bg-paper p-6 ring-1 ring-line">
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-bold">Agent API key</h2>
        <p className="text-xs text-muted">The key is read from the LLM_API_KEY environment variable and is never stored by this app.</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
          configured ? "bg-sage/15 text-sage" : "bg-terracotta/15 text-terracotta"
        }`}
      >
        {configured ? "Configured" : "Missing"}
      </span>
    </div>
    {!configured && (
      <ol className="list-decimal space-y-1 pl-5 text-xs text-muted">
        <li>Add LLM_API_KEY=your_key to .env.local for local work.</li>
        <li>Add the same variable in the Vercel project settings for deployment.</li>
        <li>Restart the dev server or redeploy.</li>
      </ol>
    )}
  </div>
);
