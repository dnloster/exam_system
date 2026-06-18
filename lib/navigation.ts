import { Role } from "@prisma/client";

export function getPostLoginPath(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/users";
    case "TEACHER":
      return "/teacher/quizzes";
    default:
      return "/quizzes";
  }
}
