"use client";

import { cn } from "@/components/ui/cn";
import { resolveChoiceImageUrl } from "@/lib/choice-media";

type ChoiceOptionContentProps = {
  text: string;
  mediaType?: string | null;
  imageUrl?: string | null;
  className?: string;
  imageClassName?: string;
};

export default function ChoiceOptionContent({
  text,
  mediaType,
  imageUrl,
  className,
  imageClassName,
}: ChoiceOptionContentProps) {
  const url = resolveChoiceImageUrl({ mediaType, imageUrl, text });
  const isImage = mediaType === "IMAGE" || !!url;

  if (isImage && url) {
    return (
      <span className={cn("inline-flex flex-col gap-1", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={text?.trim() || "Đáp án hình ảnh"}
          className={cn(
            "max-h-40 max-w-full rounded-lg border border-slate-200 object-contain",
            imageClassName
          )}
          loading="lazy"
        />
        {text?.trim() && text !== "Hình ảnh" && (
          <span className="text-xs text-slate-500">{text}</span>
        )}
      </span>
    );
  }

  return <span className={className}>{text}</span>;
}
