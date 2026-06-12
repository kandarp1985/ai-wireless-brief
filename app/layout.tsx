import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI + Wireless Daily Brief",
  description: "Daily intelligence on AI, machine learning, 5G, 6G, AI-RAN, and wireless technology — updated weekdays at noon PST.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%230d1117'/><text y='.9em' font-size='70' x='12'>📡</text></svg>",
  },
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