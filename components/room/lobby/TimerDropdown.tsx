import { ChevronDown, Check } from "lucide-react";
import type { TimerPreset } from "@/shared/types";
import { TIMER_PRESETS } from "@/shared/constants";
import { useDropdown } from "./useDropdown";

const timerPresetOptions: { label: string; value: TimerPreset }[] = [
  { label: `Fast (${TIMER_PRESETS.fast.clue}/${TIMER_PRESETS.fast.guess}s)`, value: "fast" },
  { label: `Normal (${TIMER_PRESETS.normal.clue}/${TIMER_PRESETS.normal.guess}s)`, value: "normal" },
  { label: `Relaxed (${TIMER_PRESETS.relaxed.clue}/${TIMER_PRESETS.relaxed.guess}s)`, value: "relaxed" },
];

interface TimerDropdownProps {
  selectedPreset: TimerPreset;
  onPresetChange: (preset: TimerPreset) => void;
}

export function TimerDropdown({ selectedPreset, onPresetChange }: TimerDropdownProps) {
  const { isOpen, setIsOpen, containerRef } = useDropdown();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 border border-border rounded-lg bg-surface-elevated text-sm font-medium flex items-center gap-1 min-w-[100px] hover:border-muted transition-colors"
      >
        <span>{TIMER_PRESETS[selectedPreset].label}</span>
        <ChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed sm:absolute left-4 right-4 sm:left-0 sm:right-auto top-1/4 sm:top-full sm:mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg z-50 sm:min-w-[200px] touch-pan-y overscroll-contain">
            <div className="p-2 space-y-1">
              {timerPresetOptions.map((option) => {
                const isSelected = selectedPreset === option.value;
                const preset = TIMER_PRESETS[option.value];
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onPresetChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded flex items-center justify-between ${
                      isSelected ? "bg-primary/20 text-primary" : "hover:bg-surface"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium">{preset.label}</div>
                      <div className="text-xs text-muted">
                        {preset.clue}s clue / {preset.guess}s guess
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-border px-3 py-2">
              <p className="text-xs text-muted">
                First clue gets +{TIMER_PRESETS[selectedPreset].firstClueBonus}s bonus
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
