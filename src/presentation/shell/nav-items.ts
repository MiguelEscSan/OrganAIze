export type NavItem = {
  href: string;
  label: string;
};

export const navItems: readonly NavItem[] = [
  { href: "/", label: "Board" },
  { href: "/projects", label: "Projects" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" },
];
