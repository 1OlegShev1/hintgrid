"use client";

import { getTeamClasses } from "@/components/ui";

export default function HelpContent() {
  return (
    <div className="space-y-5 text-left text-sm">
      {/* Overview */}
      <section>
        <h4 className="font-semibold text-foreground mb-2">Goal</h4>
        <p className="text-muted">
          Two teams compete to find all their hidden cards on the board first. 
          HintGrid is a game of word association, deduction, and teamwork.
        </p>
      </section>

      {/* Board Setup */}
      <section>
        <h4 className="font-semibold text-foreground mb-2">The Board</h4>
        <ul className="space-y-1.5 text-muted list-disc pl-4">
          <li>25 words arranged in a 5×5 grid</li>
          <li>
            <span className={getTeamClasses("red", "text")}>● Red team</span>: 8 or 9 cards
          </li>
          <li>
            <span className={getTeamClasses("blue", "text")}>● Blue team</span>: 8 or 9 cards
          </li>
          <li>7 neutral cards (beige)</li>
          <li>1 trap card (black) — game over if found!</li>
        </ul>
        <p className="text-muted mt-2">
          The team with 9 cards goes first.
        </p>
      </section>

      {/* Roles */}
      <section>
        <h4 className="font-semibold text-foreground mb-2">Roles</h4>
        <div className="space-y-2 text-muted">
          <p>
            <strong className="text-foreground">Hinter:</strong> Knows the secret identity of 
            all cards. Gives clues to guide teammates.
          </p>
          <p>
            <strong className="text-foreground">Seekers:</strong> See only the word grid. 
            Work together to guess which cards belong to your team.
          </p>
        </div>
      </section>

      {/* How to Play */}
      <section>
        <h4 className="font-semibold text-foreground mb-2">How to Play</h4>
        <ol className="space-y-2 text-muted list-decimal pl-4">
          <li>
            <strong className="text-foreground">Hinter gives a clue:</strong> One word and a 
            number (e.g., "Ocean 2"). The number tells how many cards relate to your clue.
          </li>
          <li>
            <strong className="text-foreground">Seekers discuss and vote:</strong> Click cards 
            to vote. When enough teammates vote, a seeker can confirm the guess.
          </li>
          <li>
            <strong className="text-foreground">Reveal:</strong> The card is flipped to show 
            its true color.
          </li>
          <li>
            <strong className="text-foreground">Continue or pass:</strong> Correct guess — 
            keep guessing! Wrong guess — turn passes to the other team.
          </li>
        </ol>
      </section>

      {/* Guessing Rules */}
      <section>
        <h4 className="font-semibold text-foreground mb-2">Guessing Rules</h4>
        <ul className="space-y-1.5 text-muted list-disc pl-4">
          <li>You get <strong className="text-foreground">one bonus guess</strong> beyond the clue number</li>
          <li>
            Guessing wrong ends your turn immediately:
            <ul className="mt-1 space-y-1 list-circle pl-4">
              <li>Opponent's card — their turn starts</li>
              <li>Neutral card — turn passes normally</li>
              <li>Trap card — <strong className="text-error">game over, you lose!</strong></li>
            </ul>
          </li>
        </ul>
      </section>

      {/* Clue Restrictions */}
      <section>
        <h4 className="font-semibold text-foreground mb-2">Clue Restrictions</h4>
        <ul className="space-y-1.5 text-muted list-disc pl-4">
          <li>Must be a single word</li>
          <li>Cannot be any word visible on the board</li>
          <li>Cannot be a word that contains or is contained by a board word (e.g., if "farmer" is on the board, "farm" is not allowed)</li>
          <li>Simple plurals (adding/removing "s" or "es") are blocked</li>
        </ul>
      </section>

      {/* Voting */}
      <section>
        <h4 className="font-semibold text-foreground mb-2">Voting System</h4>
        <p className="text-muted">
          To reveal a card, seekers must vote and then confirm. Vote threshold:
        </p>
        <ul className="mt-1.5 space-y-1 text-muted list-disc pl-4">
          <li>1 vote needed with 1–3 seekers</li>
          <li>2 votes needed with 4+ seekers</li>
        </ul>
      </section>

      {/* Winning */}
      <section>
        <h4 className="font-semibold text-foreground mb-2">Winning</h4>
        <p className="text-muted">
          First team to reveal all their cards wins! Watch out for the trap — 
          guessing it means instant defeat.
        </p>
      </section>

      {/* Tips */}
      <section className="bg-surface rounded-lg p-3 border border-border">
        <h4 className="font-semibold text-foreground mb-2">💡 Tips</h4>
        <ul className="space-y-1 text-muted list-disc pl-4">
          <li>Think about multiple meanings of words</li>
          <li>Consider your team's frame of mind</li>
          <li>Be careful with clues that could lead to the trap or opponent cards</li>
          <li>Sometimes it's better to stop guessing than risk a mistake</li>
          <li>Extra guess can be used tactically even with no planned targets</li>
        </ul>
      </section>
    </div>
  );
}
