"use client";

import { Modal } from "@/components/ui";
import HelpContent from "./HelpContent";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

function QuestionMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" 
      />
    </svg>
  );
}

export default function HelpModal({ open, onClose }: HelpModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How to Play"
      customIcon={
        <div className="w-12 h-12 rounded-full bg-info/10 border border-info/30 flex items-center justify-center">
          <QuestionMarkIcon className="w-6 h-6 text-info" />
        </div>
      }
      size="xl"
      className="max-h-[85vh]"
      actions={[
        { label: "Got it!", onClick: onClose, variant: "primary" },
      ]}
    >
      <HelpContent />
    </Modal>
  );
}

// Re-export the icon so Navbar can use the same design
export { QuestionMarkIcon };
