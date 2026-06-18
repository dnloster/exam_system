import { cn } from "./cn";

type AlertVariant = "info" | "success" | "warning" | "error";

const variants: Record<AlertVariant, string> = {
  info: "alert-info",
  success: "alert-success",
  warning: "alert-warning",
  error: "alert-error",
};

export default function Alert({
  children,
  variant = "info",
  className,
}: {
  children: React.ReactNode;
  variant?: AlertVariant;
  className?: string;
}) {
  return (
    <div className={cn("alert", variants[variant], className)}>{children}</div>
  );
}
