import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { JSX } from "react";

export const metadata: Metadata = {
  title: "Timeflow API",
  description: "Timeflow API server",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
