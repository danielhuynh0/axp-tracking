import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const CATEGORIES = [
  { name: "Practice Management", sortOrder: 1 },
  { name: "Project Management", sortOrder: 2 },
  { name: "Programming & Analysis", sortOrder: 3 },
  { name: "Project Planning & Design", sortOrder: 4 },
  { name: "Project Development & Documentation", sortOrder: 5 },
  { name: "Construction & Evaluation", sortOrder: 6 },
];

async function main() {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { sortOrder: category.sortOrder },
      create: category,
    });
  }
  console.log("Seeded 6 AXP categories.");

  await prisma.user.upsert({
    where: { email: "dev@axptracker.local" },
    update: {},
    create: { email: "dev@axptracker.local", name: "Dev User" },
  });
  console.log("Seeded dev user.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
