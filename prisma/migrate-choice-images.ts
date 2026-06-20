/**
 * Migration: image choice options
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/migrate-choice-images.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Migrating choice image options...");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE AnswerOption
      ADD COLUMN mediaType ENUM('TEXT', 'IMAGE') NOT NULL DEFAULT 'TEXT',
      ADD COLUMN imageUrl TEXT NULL
  `).catch((e: Error) => {
    if (!e.message.includes("Duplicate column")) throw e;
    console.log("Columns may already exist, skipping...");
  });

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
