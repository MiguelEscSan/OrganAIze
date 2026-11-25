"use client";

import type { MouseEvent } from "react";

export type CardMenuItem = {
  label: string;
  onSelect: () => void;
  isDestructive?: boolean;
};

type CardMenuProps = {
  title: string;
  items: readonly CardMenuItem[];
};

const closeMenuOf = (event: MouseEvent<HTMLElement>) => {
  event.currentTarget.closest("details")?.removeAttribute("open");
};

export const CardMenu = ({ title, items }: CardMenuProps) => (
  <details className="relative">
    <summary
      aria-label={`More actions for ${title}`}
      className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-muted hover:bg-cream hover:text-ink [&::-webkit-details-marker]:hidden"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <circle cx="5" cy="12" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="19" cy="12" r="1.8" />
      </svg>
    </summary>
    <div className="absolute right-0 bottom-full z-10 mb-1 flex min-w-36 flex-col rounded-xl bg-paper p-1 shadow-lg ring-1 ring-line">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={(event) => {
            closeMenuOf(event);
            item.onSelect();
          }}
          className={`min-h-11 rounded-lg px-3 text-left text-[13px] font-extrabold hover:bg-cream ${
            item.isDestructive ? "text-terracotta-deep" : "text-ink"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  </details>
);
