import { cn } from "./cn";

type BadgeVariant = "success" | "warning" | "muted" | "primary";

const variants: Record<BadgeVariant, string> = {
  success: "badge-success",
  warning: "badge-warning",
  muted: "badge-muted",
  primary: "badge-primary",
};

export default function Badge({
  children,
  variant = "muted",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span className={cn("badge", variants[variant], className)}>{children}</span>
  );
}
