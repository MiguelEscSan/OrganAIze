import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/presentation/shell/app-shell";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agent Team",
  description: "Watch three AI agents plan, build and review work on a shared board.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
