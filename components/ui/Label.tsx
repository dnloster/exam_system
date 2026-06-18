import { LabelHTMLAttributes } from "react";
import { cn } from "./cn";

export default function Label({
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("label", className)} {...props}>
      {children}
    </label>
  );
}
