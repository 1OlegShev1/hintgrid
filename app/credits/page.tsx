import type { Metadata } from "next";
import Link from "next/link";
import { ThemeBackground } from "@/components/ThemeBackground";

export const metadata: Metadata = {
  title: "Credits - HintGrid",
  description: "HintGrid credits — sound effects, music, and open source attributions.",
};

export default function Credits() {
  return (
    <main className="relative min-h-[calc(100vh-3.5rem-1px)] bg-transparent">
      <ThemeBackground />
      <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-6 py-10">
        <article className="bg-surface-elevated/80 backdrop-blur-sm rounded-xl border border-border p-6 sm:p-10 space-y-8 text-foreground">
          <header>
            <h1 className="text-3xl font-bold mb-2">Credits</h1>
            <p className="text-muted">
              HintGrid is made possible by these talented creators and open source projects.
            </p>
          </header>

          {/* Background Music */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Background Music</h2>
            <p className="text-sm text-muted">
              All music is licensed under{" "}
              <a
                href="https://creativecommons.org/publicdomain/zero/1.0/"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                CC0 1.0 (Public Domain)
              </a>{" "}
              via{" "}
              <a
                href="https://opengameart.org"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                OpenGameArt.org
              </a>
              .
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="pb-2 pr-4">Track</th>
                    <th className="pb-2 pr-4">Artist</th>
                    <th className="pb-2">Used In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="py-2 pr-4">
                      <a href="https://opengameart.org/content/lofi-compilation" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        Cat Caffe
                      </a>
                    </td>
                    <td className="py-2 pr-4">TAD</td>
                    <td className="py-2 text-muted">Lobby</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">
                      <a href="https://opengameart.org/content/lofi-compilation" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        Cue
                      </a>
                    </td>
                    <td className="py-2 pr-4">TAD</td>
                    <td className="py-2 text-muted">Fast games</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">
                      <a href="https://opengameart.org/content/lofi-compilation" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        Florist
                      </a>
                    </td>
                    <td className="py-2 pr-4">TAD</td>
                    <td className="py-2 text-muted">Normal games</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">
                      <a href="https://opengameart.org/content/lofi-compilation" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        Oceanside
                      </a>
                    </td>
                    <td className="py-2 pr-4">TAD</td>
                    <td className="py-2 text-muted">Relaxed games</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">
                      <a href="https://opengameart.org/content/happy-lofi-day" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        Happy Lofi Day
                      </a>
                    </td>
                    <td className="py-2 pr-4">Tarush Singhal</td>
                    <td className="py-2 text-muted">Victory screen</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Sound Effects */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Sound Effects</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="pb-2 pr-4">Sound</th>
                    <th className="pb-2 pr-4">Source</th>
                    <th className="pb-2">License</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="py-2 pr-4">Game start</td>
                    <td className="py-2 pr-4">
                      <a href="https://mixkit.co" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Mixkit</a>
                    </td>
                    <td className="py-2 text-muted">
                      <a href="https://mixkit.co/license/#sfxFree" className="hover:underline" target="_blank" rel="noopener noreferrer">Mixkit Free</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Turn change</td>
                    <td className="py-2 pr-4">
                      <a href="https://mixkit.co" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Mixkit</a>
                    </td>
                    <td className="py-2 text-muted">Mixkit Free</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Card reveal</td>
                    <td className="py-2 pr-4">
                      <a href="https://mixkit.co" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Mixkit</a>
                    </td>
                    <td className="py-2 text-muted">Mixkit Free</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Clue submit</td>
                    <td className="py-2 pr-4">
                      <a href="https://mixkit.co" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Mixkit</a>
                    </td>
                    <td className="py-2 text-muted">Mixkit Free</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Game over (applause)</td>
                    <td className="py-2 pr-4">
                      <a href="https://bigsoundbank.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">BigSoundBank</a>
                    </td>
                    <td className="py-2 text-muted">CC0</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Game lose</td>
                    <td className="py-2 pr-4">
                      <a href="https://opengameart.org/content/oooooooooooooo" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">AuraVoice</a> via OpenGameArt
                    </td>
                    <td className="py-2 text-muted">CC0</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Trap snap</td>
                    <td className="py-2 pr-4">
                      <a href="https://opengameart.org/content/metal-clang-sounds" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">bart</a> via OpenGameArt
                    </td>
                    <td className="py-2 text-muted">CC0</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Timer ticks</td>
                    <td className="py-2 pr-4">
                      <a href="https://bigsoundbank.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">BigSoundBank</a>
                    </td>
                    <td className="py-2 text-muted">CC0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Technology */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Built With</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {[
                ["Next.js", "https://nextjs.org"],
                ["React", "https://react.dev"],
                ["Firebase", "https://firebase.google.com"],
                ["Tailwind CSS", "https://tailwindcss.com"],
                ["Howler.js", "https://howlerjs.com"],
                ["Sentry", "https://sentry.io"],
              ].map(([name, url]) => (
                <a
                  key={name}
                  href={url}
                  className="px-3 py-1.5 rounded-full bg-surface border border-border text-muted hover:text-primary hover:border-primary/50 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {name}
                </a>
              ))}
            </div>
          </section>

          <footer className="pt-4 border-t border-border">
            <Link href="/" className="text-primary hover:underline text-sm">
              &larr; Back to HintGrid
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
