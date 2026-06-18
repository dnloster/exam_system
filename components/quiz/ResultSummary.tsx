import Link from "next/link";

type Answer = {
  id: number;
  isCorrect: boolean | null;
  scoreFraction?: number | null;
  question: { id: number; content: string };
  selectedOption: { id: number; text: string } | null;
  selectedTexts?: string[];
};

type ResultSummaryProps = {
  title: string;
  score: number;
  passingScore: number;
  answers: Answer[];
};

export default function ResultSummary({
  title,
  score,
  passingScore,
  answers,
}: ResultSummaryProps) {
  const fullCorrect = answers.filter((a) => a.isCorrect).length;
  const partialCorrect = answers.filter(
    (a) =>
      !a.isCorrect &&
      a.scoreFraction != null &&
      a.scoreFraction > 0 &&
      a.scoreFraction < 1
  ).length;
  const total = answers.length;
  const passed = score >= passingScore;

  return (
    <div className="space-y-6">
      <div
        className={`rounded border p-6 text-center ${
          passed ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
        }`}
      >
        <h1 className="text-2xl font-bold text-portal-primary">{title}</h1>
        <p className="mt-4 text-4xl font-bold">{score.toFixed(1)}%</p>
        <p className="mt-2 text-gray-700">
          {fullCorrect}/{total} câu đúng hoàn toàn
          {partialCorrect > 0 && ` · ${partialCorrect} câu đúng một phần`}
          {" · "}Điểm đạt: {passingScore}%
        </p>
        <p
          className={`mt-2 text-lg font-semibold ${
            passed ? "text-green-700" : "text-red-700"
          }`}
        >
          {passed ? "✓ Đạt yêu cầu" : "✗ Chưa đạt yêu cầu"}
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-portal-primary">Chi tiết từng câu</h2>
        {answers.map((answer, index) => {
          const partial =
            !answer.isCorrect &&
            answer.scoreFraction != null &&
            answer.scoreFraction > 0 &&
            answer.scoreFraction < 1;
          const statusClass = answer.isCorrect
            ? "border-green-200"
            : partial
              ? "border-amber-200"
              : "border-red-200";

          return (
          <div
            key={answer.id}
            className={`rounded border p-4 ${statusClass}`}
          >
            <p className="font-medium">
              Câu {index + 1}: {answer.question.content}
            </p>
            <p className="mt-2 text-sm">
              Bạn chọn:{" "}
              <span
                className={
                  answer.isCorrect
                    ? "text-green-700"
                    : partial
                      ? "text-amber-700"
                      : "text-red-700"
                }
              >
                {answer.selectedTexts?.length
                  ? answer.selectedTexts.join(", ")
                  : answer.selectedOption?.text ?? "Không trả lời"}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              {answer.isCorrect
                ? "✓ Đúng"
                : partial
                  ? `◐ Đúng một phần (${Math.round((answer.scoreFraction ?? 0) * 100)}%)`
                  : "✗ Sai"}
            </p>
          </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Link
          href="/quizzes"
          className="rounded bg-portal-primary px-4 py-2 text-white hover:bg-portal-primary-dark"
        >
          Danh sách bài kiểm tra
        </Link>
        <Link href="/" className="rounded border px-4 py-2 hover:bg-gray-50">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
