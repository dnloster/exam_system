import bcrypt from "bcryptjs";

export async function hashQuizAccessPassword(password: string) {
  return bcrypt.hash(password.trim(), 10);
}

export async function verifyQuizAccessPassword(
  password: string,
  hash: string | null | undefined
) {
  if (!hash) return true;
  if (!password?.trim()) return false;
  return bcrypt.compare(password.trim(), hash);
}

export function stripQuizPasswordHash<
  T extends { accessPasswordHash?: string | null },
>(quiz: T) {
  const { accessPasswordHash, ...rest } = quiz;
  return {
    ...rest,
    hasAccessPassword: Boolean(accessPasswordHash),
  };
}

export async function resolveAccessPasswordUpdate(
  accessPassword: string | null | undefined,
  removeAccessPassword?: boolean
): Promise<{ accessPasswordHash: string | null } | null> {
  if (removeAccessPassword) {
    return { accessPasswordHash: null };
  }
  if (accessPassword === undefined) {
    return null;
  }
  const trimmed = accessPassword.trim();
  if (!trimmed) {
    return null;
  }
  return { accessPasswordHash: await hashQuizAccessPassword(trimmed) };
}
