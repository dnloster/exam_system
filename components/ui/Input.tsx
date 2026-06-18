import { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export default function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", className)} {...props} />;
}
