export type NavIcon = "projects" | "team" | "settings";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

export const navItems: readonly NavItem[] = [
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/team", label: "Team", icon: "team" },
  { href: "/settings", label: "Settings", icon: "settings" },
];
