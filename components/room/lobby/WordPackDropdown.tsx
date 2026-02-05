import { ChevronDown } from "lucide-react";
import type { WordPack } from "@/shared/types";
import { WORD_PACKS } from "@/shared/constants";
import { getPackDisplayName, getWordCount } from "@/shared/words";
import { useDropdown } from "./useDropdown";

const wordPackOptions: { label: string; value: WordPack }[] = WORD_PACKS.map(pack => ({
  label: getPackDisplayName(pack as WordPack),
  value: pack as WordPack,
}));

interface WordPackDropdownProps {
  selectedPacks: WordPack[];
  onPackChange: (packs: WordPack[]) => void;
}

export function WordPackDropdown({ selectedPacks, onPackChange }: WordPackDropdownProps) {
  const { isOpen, setIsOpen, containerRef, dropdownRef } = useDropdown();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 border border-border rounded-lg bg-surface-elevated text-sm font-medium flex items-center gap-1 w-[160px] hover:border-primary/50 transition-colors"
      >
        <span className="truncate flex-1 text-left">
          {selectedPacks.length === 1
            ? getPackDisplayName(selectedPacks[0])
            : `${selectedPacks.length} packs selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
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
            className="fixed sm:absolute left-4 right-4 sm:left-0 sm:right-auto top-1/4 sm:top-full sm:mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg z-50 sm:min-w-[260px] touch-pan-y overscroll-contain"
          >
            <div className="p-2 space-y-1 max-h-[50vh] sm:max-h-[400px] overflow-y-auto scrollbar-thin">
              {wordPackOptions.map((option) => {
                const isSelected = selectedPacks.includes(option.value);
                const packWordCount = getWordCount(option.value);
                const isLastSelected = isSelected && selectedPacks.length === 1;
                return (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer ${
                      isLastSelected
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-surface active:bg-surface"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isLastSelected}
                      onChange={() => {
                        if (isLastSelected) return;
                        const newPacks = isSelected
                          ? selectedPacks.filter((p) => p !== option.value)
                          : [...selectedPacks, option.value];
                        onPackChange(newPacks);
                      }}
                      className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-base font-medium flex-1">{option.label}</span>
                    <span className="text-sm text-muted">{packWordCount}</span>
                  </label>
                );
              })}
            </div>
            <div className="border-t border-border px-3 py-2.5 flex justify-between items-center">
              <span className="text-sm text-muted">
                Total: {getWordCount(selectedPacks)} words
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-sm text-primary hover:text-primary/80 font-medium px-3 py-1"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
