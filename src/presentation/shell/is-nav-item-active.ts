export const isNavItemActive = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);
