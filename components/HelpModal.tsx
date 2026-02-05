"use client";

import { CircleHelp } from "lucide-react";
import { Modal } from "@/components/ui";
import HelpContent from "./HelpContent";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

function QuestionMarkIcon({ className }: { className?: string }) {
  return <CircleHelp className={className} />;
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
