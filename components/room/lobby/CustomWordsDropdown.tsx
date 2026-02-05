import { useState } from "react";
import { MAX_CUSTOM_WORDS_ON_BOARD } from "@/shared/constants";
import { parseCustomWordsInput } from "@/shared/validation";
import { useDropdown } from "./useDropdown";

interface CustomWordsDropdownProps {
  customWords: string[];
  onCustomWordsChange: (words: string[]) => void;
}

export function CustomWordsDropdown({ customWords, onCustomWordsChange }: CustomWordsDropdownProps) {
  const { isOpen, setIsOpen, containerRef, dropdownRef } = useDropdown();
  const [input, setInput] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const handleAdd = () => {
    if (!input.trim()) return;
    const { words, errors: parseErrors } = parseCustomWordsInput(input, customWords);
    setErrors(parseErrors);
    if (words.length > 0) {
      onCustomWordsChange([...customWords, ...words]);
      setInput("");
    }
  };

  const handleRemove = (word: string) => {
    onCustomWordsChange(customWords.filter((w) => w !== word));
  };

  const handleClearAll = () => {
    onCustomWordsChange([]);
    setErrors([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 border border-border rounded-lg bg-surface-elevated text-sm font-medium flex items-center gap-1.5 hover:border-muted transition-colors"
      >
        <span>{customWords.length || "0"}</span>
        <svg
          className={`w-4 h-4 text-muted shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={dropdownRef}
            className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-1/4 sm:top-full sm:mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg z-50 sm:w-[320px] touch-pan-y overscroll-contain"
          >
            <div className="p-3 space-y-3">
              {/* Input section */}
              <div>
                <label className="block text-xs text-muted mb-1">
                  Add words (comma or newline separated):
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="pizza, rocket, unicorn..."
                  className="w-full h-16 px-2 py-1.5 text-sm border border-border rounded-lg bg-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!input.trim()}
                  className="mt-2 w-full px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Words
                </button>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="text-xs text-error space-y-0.5">
                  {errors.slice(0, 3).map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                  {errors.length > 3 && <p>...and {errors.length - 3} more</p>}
                </div>
              )}

              {/* Word chips */}
              {customWords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                  {customWords.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full"
                    >
                      {word}
                      <button
                        type="button"
                        onClick={() => handleRemove(word)}
                        className="hover:text-accent/80"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="border-t border-border px-3 py-2 flex justify-between items-center">
              <span className="text-xs text-muted">
                {customWords.length} words (up to {MAX_CUSTOM_WORDS_ON_BOARD} appear)
              </span>
              {customWords.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-error hover:text-error/80 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
