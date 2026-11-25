import { Suspense, type ReactNode } from "react";
import { NavLinks, NavLinksView } from "./nav-links";

type AppShellProps = {
  children: ReactNode;
};

export const AppShell = ({ children }: AppShellProps) => (
  <div className="flex min-h-screen flex-col md:flex-row">
    <aside className="border-b border-line bg-paper md:w-60 md:border-r md:border-b-0">
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-terracotta text-sm font-extrabold text-paper">
          AT
        </span>
        <span className="text-base font-extrabold">Agent Team</span>
      </div>
      <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
        <Suspense fallback={<NavLinksView pathname={null} />}>
          <NavLinks />
        </Suspense>
      </nav>
    </aside>
    <main className="min-w-0 flex-1">{children}</main>
  </div>
);
