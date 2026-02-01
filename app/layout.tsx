import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorProvider } from "@/contexts/ErrorContext";
import { GameProvider } from "@/components/GameContext";
import { SoundProvider } from "@/contexts/SoundContext";
import Navbar from "@/components/Navbar";

// Pixel fonts for synthwave aesthetic
const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-retro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HintGrid",
  description: "A multiplayer word guessing party game",
};

// Inline script to prevent flash of wrong theme
const themeScript = `
  (function() {
    // Handle light/dark mode
    const storedMode = localStorage.getItem('hintgrid-theme');
    let mode = storedMode;
    if (!mode || mode === 'system') {
      mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.add(mode);
    
    // Handle theme style (classic/synthwave)
    const storedStyle = localStorage.getItem('hintgrid-style');
    const style = storedStyle || 'synthwave';
    document.documentElement.classList.add('theme-' + style);
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${pressStart.variable} ${vt323.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <AuthProvider>
            <ErrorProvider>
              <SoundProvider>
                <GameProvider>
                  <Navbar />
                  {children}
                </GameProvider>
              </SoundProvider>
            </ErrorProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
