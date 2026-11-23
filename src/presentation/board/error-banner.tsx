type ErrorBannerProps = {
  title: string;
  reason: string;
  detail: string;
  onDismiss: () => void;
};

export const ErrorBanner = ({ title, reason, detail, onDismiss }: ErrorBannerProps) => (
  <div
    role="alert"
    className="fixed bottom-4 left-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl bg-paper p-4 text-sm text-terracotta shadow-lg ring-1 ring-line"
  >
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="font-semibold">{title}</p>
      <p className="text-ink">{reason}</p>
      <p className="break-words text-xs text-muted">{detail}</p>
    </div>
    <button
      type="button"
      aria-label="Dismiss"
      onClick={onDismiss}
      className="shrink-0 rounded-md px-2 text-lg leading-none text-muted hover:text-ink"
    >
      ×
    </button>
  </div>
);
