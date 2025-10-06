import type { Metadata } from "next";
import {
  Inter,
  Playfair_Display,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";
import { UserProvider } from "./contexts";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-mono",
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
    <html lang="en" className="h-full">
      <body
        className={`${inter.variable} ${playfair.variable} ${plexMono.variable} antialiased bg-transparent min-h-screen`}
      >
        <UserProvider>
          <Navigation />
          <div className="relative min-h-[calc(100vh-4rem)]">
            <div className="pointer-events-none absolute inset-0 bg-glow-iris opacity-80 blur-3xl" aria-hidden="true" />
            <main className="relative min-h-full overflow-x-hidden overflow-y-auto">
              {children}
            </main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
