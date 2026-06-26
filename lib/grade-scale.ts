/** Ngưỡng xếp loại theo thang % (quy ước: khá ≥65%, giỏi ≥80%). */
export const GRADE_GOOD_MIN = 65;
export const GRADE_EXCELLENT_MIN = 80;

export function isGoodOrAbove(score: number): boolean {
  return score >= GRADE_GOOD_MIN;
}

export function isBelowPassing(score: number, passingScore: number): boolean {
  return score < passingScore;
}

export function gradeLabel(
  score: number,
  passingScore: number
): "Giỏi" | "Khá" | "Đạt" | "Không đạt" {
  if (score >= GRADE_EXCELLENT_MIN) return "Giỏi";
  if (score >= GRADE_GOOD_MIN) return "Khá";
  if (score >= passingScore) return "Đạt";
  return "Không đạt";
}
