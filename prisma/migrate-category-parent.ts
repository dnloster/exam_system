import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function columnExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ Field: string }[]>(
    `SHOW COLUMNS FROM QuestionCategory LIKE '${name}'`
  );
  return rows.length > 0;
}

async function indexExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ Key_name: string }[]>(
    `SHOW INDEX FROM QuestionCategory WHERE Key_name = '${name}'`
  );
  return rows.length > 0;
}

async function main() {
  if (!(await columnExists("parentId"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE QuestionCategory ADD COLUMN parentId INT NULL`
    );
    console.log("Added parentId column");
  }

  if (!(await indexExists("QuestionCategory_quizId_idx"))) {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX QuestionCategory_quizId_idx ON QuestionCategory(quizId)`
    );
    console.log("Added quizId index");
  }

  if (await indexExists("QuestionCategory_quizId_name_key")) {
    await prisma.$executeRawUnsafe(
      `DROP INDEX QuestionCategory_quizId_name_key ON QuestionCategory`
    );
    console.log("Dropped old unique index");
  }

  if (!(await indexExists("QuestionCategory_quizId_parentId_name_key"))) {
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX QuestionCategory_quizId_parentId_name_key ON QuestionCategory(quizId, parentId, name)`
    );
    console.log("Added new unique index");
  }

  const fkRows = await prisma.$queryRawUnsafe<{ CONSTRAINT_NAME: string }[]>(`
    SELECT CONSTRAINT_NAME
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'QuestionCategory'
      AND CONSTRAINT_NAME = 'QuestionCategory_parentId_fkey'
  `);

  if (fkRows.length === 0) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE QuestionCategory
      ADD CONSTRAINT QuestionCategory_parentId_fkey
      FOREIGN KEY (parentId) REFERENCES QuestionCategory(id)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    console.log("Added parentId foreign key");
  }

  console.log("Migration complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
