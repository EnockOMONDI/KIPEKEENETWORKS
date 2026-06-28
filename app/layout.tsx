import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kipekee Networks",
  description: "Hire AI employees trained on your business."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
