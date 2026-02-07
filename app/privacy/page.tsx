import type { Metadata } from "next";
import Link from "next/link";
import { ThemeBackground } from "@/components/ThemeBackground";

export const metadata: Metadata = {
  title: "Privacy Policy - HintGrid",
  description: "HintGrid privacy policy — what data we collect and how we use it.",
};

export default function PrivacyPolicy() {
  return (
    <main className="relative min-h-[calc(100vh-3.5rem-1px)] bg-transparent">
      <ThemeBackground />
      <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-6 py-10">
        <article className="bg-surface-elevated/80 backdrop-blur-sm rounded-xl border border-border p-6 sm:p-10 space-y-6 text-foreground">
          <header>
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-sm text-muted">Last updated: February 7, 2026</p>
          </header>

          <p>
            HintGrid (&quot;we&quot;, &quot;us&quot;, or &quot;the game&quot;) is a free,
            browser-based multiplayer word guessing game available at{" "}
            <a href="https://hintgrid.com" className="text-primary hover:underline">
              hintgrid.com
            </a>
            . This Privacy Policy explains what information we collect, how we use it, and
            your choices.
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>

            <h3 className="text-lg font-medium text-muted">Anonymous Authentication</h3>
            <p>
              We use Firebase Anonymous Authentication to assign each browser session a
              random, anonymous identifier (UID). We do <strong>not</strong> collect your
              name, email address, phone number, or any other personal account information.
              The display name and emoji avatar you choose in-game are stored only in your
              browser&apos;s local storage and in the temporary game room data.
            </p>

            <h3 className="text-lg font-medium text-muted">Game Data</h3>
            <p>
              When you create or join a room, your chosen display name, avatar, team
              assignment, and in-game chat messages are stored temporarily in our Firebase
              Realtime Database. This data is automatically deleted when the room is closed
              (i.e., when all players leave).
            </p>

            <h3 className="text-lg font-medium text-muted">Analytics</h3>
            <p>
              We use Firebase Analytics to collect anonymous usage data such as page views
              and in-game events (e.g., rooms created, games completed). This data is
              aggregated and cannot be used to identify individual users. Firebase Analytics
              may use cookies or similar technologies. You can block analytics by using a
              browser ad-blocker.
            </p>

            <h3 className="text-lg font-medium text-muted">Error Tracking</h3>
            <p>
              We use Sentry to capture application errors and crashes. Error reports may
              include your anonymous UID, the room code you were in, and technical
              information about the error (browser type, stack trace). No personal
              information is included.
            </p>

            <h3 className="text-lg font-medium text-muted">Local Storage</h3>
            <p>
              We store your preferences (display name, avatar, theme, sound settings)
              in your browser&apos;s local storage. This data never leaves your device and
              is not transmitted to our servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 text-foreground/90">
              <li>To operate the game and enable multiplayer functionality</li>
              <li>To understand how the game is used and improve it</li>
              <li>To detect and fix errors and bugs</li>
              <li>To enforce our profanity filter and moderation rules</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Data Sharing</h2>
            <p>
              We do not sell, rent, or share your data with third parties. The only
              third-party services that receive data are:
            </p>
            <ul className="list-disc list-inside space-y-1 text-foreground/90">
              <li>
                <strong>Firebase</strong> (Google) — authentication, database, hosting,
                and analytics
              </li>
              <li>
                <strong>Sentry</strong> — error monitoring
              </li>
            </ul>
            <p>
              These services process data according to their own privacy policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Data Retention</h2>
            <p>
              Game room data is deleted automatically when all players leave. There is no
              persistent user account or profile data stored on our servers. Anonymous
              analytics data is retained according to Firebase&apos;s default retention
              policies (typically 14 months).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Children&apos;s Privacy</h2>
            <p>
              HintGrid is not directed at children under 13. We do not knowingly collect
              personal information from children. Since the game uses anonymous
              authentication and does not require any personal details, no personal
              information about children is collected.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Your Choices</h2>
            <ul className="list-disc list-inside space-y-1 text-foreground/90">
              <li>
                <strong>Clear local data:</strong> You can clear your browser&apos;s local
                storage at any time to reset your preferences and anonymous session.
              </li>
              <li>
                <strong>Block analytics:</strong> Use a browser ad-blocker or disable
                JavaScript to prevent analytics collection.
              </li>
              <li>
                <strong>Leave a room:</strong> When you leave a room, your player data
                in that room is cleaned up automatically.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The &quot;Last
              updated&quot; date at the top will reflect the most recent revision. Continued
              use of HintGrid after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, you can reach us by opening
              an issue on our project page or contacting the HintGrid team.
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
