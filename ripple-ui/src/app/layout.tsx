import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ripple — Code Intelligence Platform",
  description: "Understand the blast radius of every code change before it ships. AI-powered static analysis meets intelligent retrieval.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
