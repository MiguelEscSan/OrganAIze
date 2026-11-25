import type { ReactNode } from "react";

type RequestFamilyProps = {
  parent: ReactNode | null;
  title: string;
  deployed: number;
  total: number;
  children: ReactNode[];
};

const HierarchyIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="size-4 shrink-0 text-family-ink"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="3" width="6" height="5" rx="1" />
    <rect x="3" y="16" width="6" height="5" rx="1" />
    <rect x="15" y="16" width="6" height="5" rx="1" />
    <path d="M12 8v4M6 16v-4h12v4" />
  </svg>
);

const GhostHead = ({ title, deployed, total }: Pick<RequestFamilyProps, "title" | "deployed" | "total">) => (
  <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-dashed border-family-line px-3 py-2.5">
    <span className="flex min-w-0 items-center gap-2">
      <HierarchyIcon />
      <span className="truncate text-[13px] font-extrabold text-family-ink">{title}</span>
    </span>
    <span className="shrink-0 text-xs font-bold text-muted">
      {deployed} of {total} deployed
    </span>
  </div>
);

const Connector = ({ isLast }: { isLast: boolean }) => (
  <span aria-hidden="true" className="relative w-[22px] flex-none">
    <span
      className={`absolute top-[-8px] left-[9px] w-0.5 bg-family-line ${isLast ? "h-[35px]" : "bottom-0"}`}
    />
    <span className="absolute top-[26px] left-[9px] h-0.5 w-[13px] bg-family-line" />
  </span>
);

export const RequestFamily = ({ parent, title, deployed, total, children }: RequestFamilyProps) => (
  <div className="flex flex-col gap-2 rounded-2xl bg-family p-2">
    {parent ?? <GhostHead title={title} deployed={deployed} total={total} />}
    <ul className="flex flex-col">
      {children.map((child, index) => {
        const isLast = index === children.length - 1;

        return (
          <li key={index} className="flex">
            <Connector isLast={isLast} />
            <div className={`min-w-0 flex-1 ${isLast ? "" : "mb-2"}`}>{child}</div>
          </li>
        );
      })}
    </ul>
  </div>
);
