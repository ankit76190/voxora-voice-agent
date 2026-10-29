import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voxora | Enterprise AI Voice Platform",
  description:
    "High-fidelity real-time AI voice orchestration and telephone dispatch platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-charcoal text-ivory antialiased selection:bg-champagne/20 selection:text-ivory">
        {children}
      </body>
    </html>
  );
}

