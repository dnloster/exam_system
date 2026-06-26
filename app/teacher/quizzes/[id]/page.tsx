import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function QuizEditIndexPage({ params }: Props) {
  const { id } = await params;
  redirect(`/teacher/quizzes/${id}/questions`);
}
