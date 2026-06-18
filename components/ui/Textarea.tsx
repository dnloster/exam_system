import { TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

export default function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("textarea", className)} {...props} />;
}
