import type { Metadata } from "next";
import Link from "next/link";
import { ThemeBackground } from "@/components/ThemeBackground";

export const metadata: Metadata = {
  title: "Terms of Service - HintGrid",
  description: "HintGrid terms of service — rules for using the game.",
};

export default function TermsOfService() {
  return (
    <main className="relative min-h-[calc(100vh-3.5rem-1px)] bg-transparent">
      <ThemeBackground />
      <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-6 py-10">
        <article className="bg-surface-elevated/80 backdrop-blur-sm rounded-xl border border-border p-6 sm:p-10 space-y-6 text-foreground">
          <header>
            <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
            <p className="text-sm text-muted">Last updated: February 7, 2026</p>
          </header>

          <p>
            Welcome to HintGrid! By accessing or playing HintGrid at{" "}
            <a href="https://hintgrid.com" className="text-primary hover:underline">
              hintgrid.com
            </a>{" "}
            (&quot;the game&quot;, &quot;the service&quot;), you agree to be bound by these
            Terms of Service (&quot;Terms&quot;). If you do not agree, please do not use the
            service.
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Description of Service</h2>
            <p>
              HintGrid is a free, browser-based multiplayer word guessing game. No account
              registration is required. The game uses anonymous sessions to enable
              multiplayer functionality.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Acceptable Use</h2>
            <p>When using HintGrid, you agree not to:</p>
            <ul className="list-disc list-inside space-y-1 text-foreground/90">
              <li>
                Use offensive, abusive, or harassing language in player names or chat
                messages (profanity filtering is applied automatically)
              </li>
              <li>
                Attempt to disrupt, exploit, or abuse the game or its infrastructure
              </li>
              <li>
                Use bots, scripts, or automated tools to interact with the game
              </li>
              <li>
                Impersonate other players or misrepresent your identity
              </li>
              <li>
                Attempt to access, tamper with, or interfere with other players&apos; data
                or game rooms
              </li>
            </ul>
            <p>
              Room owners may kick players who violate these rules. Kicked players receive a
              temporary ban from that room.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Intellectual Property</h2>
            <p>
              The HintGrid name, logo, user interface, and original code are the property of
              HintGrid. The word lists used in the game are curated by HintGrid.
            </p>
            <p>
              Sound effects and music are used under free licenses (Mixkit Free License and
              Creative Commons CC0). See the attribution files in the game&apos;s source
              repository for full credits.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. User Content</h2>
            <p>
              Any content you create within the game (player names, chat messages, custom
              word lists) is temporary and is deleted when the game room closes. You are
              responsible for the content you submit, and it must comply with the acceptable
              use rules above.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Availability &amp; Modifications</h2>
            <p>
              HintGrid is provided on an &quot;as available&quot; basis. We may modify,
              suspend, or discontinue the service at any time without notice. We may also
              update the game rules, features, or these Terms at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Disclaimer of Warranties</h2>
            <p>
              HintGrid is provided <strong>&quot;as is&quot;</strong> and{" "}
              <strong>&quot;as available&quot;</strong> without warranties of any kind,
              whether express or implied, including but not limited to warranties of
              merchantability, fitness for a particular purpose, or non-infringement.
            </p>
            <p>
              We do not guarantee that the service will be uninterrupted, error-free, or
              secure. Game rooms and data may be lost due to technical issues.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, HintGrid and its creators shall not be
              liable for any indirect, incidental, special, consequential, or punitive
              damages, or any loss of data or profits, arising from your use of the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. The &quot;Last updated&quot; date
              at the top will reflect the most recent revision. Continued use of HintGrid
              after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Contact</h2>
            <p>
              If you have questions about these Terms, you can reach us by opening an issue
              on our project page or contacting the HintGrid team.
            </p>
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
