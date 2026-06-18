import { SelectHTMLAttributes } from "react";
import { cn } from "./cn";

export default function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("select", className)} {...props}>
      {children}
    </select>
  );
}
