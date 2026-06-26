"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";

type MoodleFieldsetProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export default function MoodleFieldset({
  title,
  defaultOpen = true,
  children,
}: MoodleFieldsetProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="fieldset-card">
      <button
        type="button"
        className="fieldset-header w-full text-left"
        onClick={() => setOpen(!open)}
      >
        <span
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500 transition",
            open && "rotate-0"
          )}
        >
          {open ? "−" : "+"}
        </span>
        {title}
      </button>
      {open && <div className="fieldset-body">{children}</div>}
    </div>
  );
}
