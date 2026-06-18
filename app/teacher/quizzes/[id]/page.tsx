import { redirect } from "next/navigation";

type Props = { params: { id: string } };

export default function QuizEditIndexPage({ params }: Props) {
  redirect(`/teacher/quizzes/${params.id}/questions`);
}
