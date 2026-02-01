// UI Primitives - Design System Components
// These are the foundational building blocks for consistent UI throughout the app.

// Button
export { Button, buttonVariants } from "./Button";
export type { ButtonProps } from "./Button";

// Card
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
} from "./Card";
export type { CardProps } from "./Card";

// Modal
export { Modal, ConfirmModal } from "./Modal";
export type { ModalProps, ConfirmModalProps, ModalAction } from "./Modal";

// Input
export { Input, Textarea, inputVariants, textareaVariants } from "./Input";
export type { InputProps, TextareaProps } from "./Input";

// Badge
export { Badge, AnimatedBadge, badgeVariants } from "./Badge";
export type { BadgeProps, AnimatedBadgeProps } from "./Badge";

// TeamIndicator
export {
  TeamIndicator,
  teamIndicatorVariants,
  getTeamClasses,
  getTeamTextClass,
  getTeamBgClass,
  getTeamLightBgClass,
  getTeamBorderClass,
  getTeamRingClass,
} from "./TeamIndicator";
export type { TeamIndicatorProps } from "./TeamIndicator";
