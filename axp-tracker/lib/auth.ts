import { prisma } from "./db";

// TODO: replace with real auth session lookup (e.g. NextAuth)
export async function getCurrentUserId(): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { email: "dev@axptracker.local" },
  });
  if (!user) throw new Error("Dev user not found - run: npm run db:seed");
  return user.id;
}
