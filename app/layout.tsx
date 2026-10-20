import type { Metadata } from "next";
import "./atlas.css";

export const metadata: Metadata = {
  title: "Layout Atlas — From website to layout library",
  description: "Discover reusable website section layouts, review generic examples, and export a source-linked HTML presentation.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
