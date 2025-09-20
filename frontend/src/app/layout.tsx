import type { Metadata } from "next";
import { Fira_Code } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AI Research Assistant",
  description: "Unlock the power of intelligent research with AI-driven insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <body
        className={`${firaCode.variable} antialiased font-mono bg-gray-950 h-full overflow-hidden`}
      >
        <Navigation />
        <main className="h-[calc(100vh-4rem)] overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
