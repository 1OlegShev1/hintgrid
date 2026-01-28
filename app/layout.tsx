import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorProvider } from "@/contexts/ErrorContext";
import { GameProvider } from "@/components/GameContext";
import { SoundProvider } from "@/contexts/SoundContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "HintGrid",
  description: "A multiplayer word guessing party game",
};

// Inline script to prevent flash of wrong theme
const themeScript = `
  (function() {
    const stored = localStorage.getItem('hintgrid-theme');
    let theme = stored;
    if (!theme || theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.add(theme);
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
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
