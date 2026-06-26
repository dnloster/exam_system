import { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      fullName: string;
      role: Role;
      unitId: number | null;
      unitName: string | null;
    };
  }

  interface User {
    id: string;
    username: string;
    fullName: string;
    role: Role;
    unitId: number | null;
    unitName: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    fullName: string;
    role: Role;
    unitId: number | null;
    unitName: string | null;
  }
}
