import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const user = await db.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      displayName: "Demo User",
      timeZone: "UTC",
      passwordHash: null,
    },
  });

  const category = await db.category.upsert({
    where: {
      userId_normalizedName: {
        userId: user.id,
        normalizedName: "personal",
      },
    },
    update: {},
    create: {
      userId: user.id,
      name: "Personal",
      normalizedName: "personal",
    },
  });

  await db.task.deleteMany({ where: { userId: user.id } });
  await db.task.createMany({
    data: [
      {
        userId: user.id,
        categoryId: category.id,
        title: "Review the Todo development plan",
        notes: "Confirm the MVP scope before implementing task management.",
        status: "in_progress",
        priority: "high",
      },
      {
        userId: user.id,
        categoryId: category.id,
        title: "Create your first task",
        status: "todo",
        priority: "medium",
      },
    ],
  });
}

main()
  .then(async () => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
