export type ChoiceMediaType = "TEXT" | "IMAGE";

export function isLikelyImageUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^\/uploads\//i.test(v)) return true;
  if (!/^https?:\/\//i.test(v)) return false;
  return /\.(png|jpe?g|gif|webp|svg|bmp)(\?|#|$)/i.test(v);
}

/** Phân tích nội dung lựa chọn từ Aiken / import */
export function parseChoiceOptionContent(raw: string): {
  mediaType: ChoiceMediaType;
  text: string;
  imageUrl?: string;
} {
  const trimmed = raw.trim();

  const imageTag = trimmed.match(/^\[IMAGE\]\s*(.+)$/i);
  if (imageTag) {
    const url = imageTag[1].trim();
    return { mediaType: "IMAGE", text: "Hình ảnh", imageUrl: url };
  }

  const markdown = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (markdown) {
    const url = markdown[2].trim();
    return {
      mediaType: "IMAGE",
      text: markdown[1]?.trim() || "Hình ảnh",
      imageUrl: url,
    };
  }

  const html = trimmed.match(
    /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/i
  );
  if (html) {
    return {
      mediaType: "IMAGE",
      text: html[2]?.trim() || "Hình ảnh",
      imageUrl: html[1].trim(),
    };
  }

  if (isLikelyImageUrl(trimmed)) {
    return { mediaType: "IMAGE", text: "Hình ảnh", imageUrl: trimmed };
  }

  return { mediaType: "TEXT", text: trimmed };
}

export function choiceOptionLabel(opt: {
  mediaType?: string | null;
  text: string;
  imageUrl?: string | null;
}): string {
  if (opt.mediaType === "IMAGE" || opt.imageUrl) {
    return opt.text?.trim() || "Hình ảnh";
  }
  return opt.text;
}

export function resolveChoiceImageUrl(opt: {
  mediaType?: string | null;
  imageUrl?: string | null;
  text?: string;
}): string | null {
  if (opt.mediaType === "IMAGE") {
    return opt.imageUrl?.trim() || null;
  }
  if (opt.imageUrl?.trim()) return opt.imageUrl.trim();
  if (opt.text && isLikelyImageUrl(opt.text)) return opt.text.trim();
  return null;
}
