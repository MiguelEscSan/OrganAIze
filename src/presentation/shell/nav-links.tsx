"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isNavItemActive } from "./is-nav-item-active";
import { navItems, type NavIcon } from "./nav-items";

const iconPaths: Record<NavIcon, ReactNode> = {
  projects: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  team: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14a5 5 0 0 1 4 5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>
  ),
};

const NavIconView = ({ icon }: { icon: NavIcon }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="size-5 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {iconPaths[icon]}
  </svg>
);

const linkClassName = (isActive: boolean): string =>
  `flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 text-sm transition-colors ${
    isActive ? "bg-ink font-extrabold text-paper" : "font-bold text-muted hover:bg-cream hover:text-ink"
  }`;

export const NavLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => {
        const isActive = isNavItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={linkClassName(isActive)}
          >
            <NavIconView icon={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
};
