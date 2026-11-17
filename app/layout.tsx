import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "Placar", description: "Resultados de futebol ao vivo" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e1116" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
