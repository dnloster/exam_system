/**
 * Migration: random question slots
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/migrate-random-questions.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Migrating random question support...");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE QuizQuestion
      MODIFY questionId INT NULL,
      ADD COLUMN slotType ENUM('FIXED', 'RANDOM') NOT NULL DEFAULT 'FIXED',
      ADD COLUMN randomCategoryId INT NULL,
      ADD COLUMN includeSubcategories TINYINT(1) NOT NULL DEFAULT 0
  `).catch((e: Error) => {
    if (!e.message.includes("Duplicate column")) throw e;
    console.log("QuizQuestion columns may already exist, skipping ALTER...");
  });

  await prisma.$executeRawUnsafe(`
    ALTER TABLE QuizQuestion
      ADD CONSTRAINT QuizQuestion_randomCategoryId_fkey
      FOREIGN KEY (randomCategoryId) REFERENCES QuestionCategory(id) ON DELETE CASCADE
  `).catch((e: Error) => {
    if (!e.message.includes("Duplicate")) throw e;
  });

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS AttemptRandomDraw (
      id INT NOT NULL AUTO_INCREMENT,
      attemptId INT NOT NULL,
      quizQuestionId INT NOT NULL,
      questionId INT NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY AttemptRandomDraw_attemptId_quizQuestionId_key (attemptId, quizQuestionId),
      CONSTRAINT AttemptRandomDraw_attemptId_fkey FOREIGN KEY (attemptId) REFERENCES QuizAttempt(id) ON DELETE CASCADE,
      CONSTRAINT AttemptRandomDraw_quizQuestionId_fkey FOREIGN KEY (quizQuestionId) REFERENCES QuizQuestion(id) ON DELETE CASCADE,
      CONSTRAINT AttemptRandomDraw_questionId_fkey FOREIGN KEY (questionId) REFERENCES Question(id) ON DELETE CASCADE
    )
  `);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
