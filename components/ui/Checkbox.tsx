import { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export default function Checkbox({
  className,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={cn("checkbox-label", className)}>
      <input type="checkbox" className="checkbox" {...props} />
      {label && <span>{label}</span>}
    </label>
  );
}
