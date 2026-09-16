import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const taskStatuses = ["todo", "in_progress", "completed"] as const;
const taskPriorities = ["none", "low", "medium", "high"] as const;
const TaskStatus = {
  todo: "todo",
  in_progress: "in_progress",
  completed: "completed",
} as const;
const taskInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  notes: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(taskStatuses).default(TaskStatus.todo),
  priority: z.enum(taskPriorities).default("none"),
  dueDate: z.string().date().optional().nullable(),
  category: z.string().trim().max(50).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

const taskInclude = {
  category: true,
  tags: { include: { tag: true } },
} as const;

type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function serializeTask(task: TaskWithRelations) {
  return {
    ...task,
    dueDate: task.dueDate?.toISOString().slice(0, 10) ?? null,
    tags: task.tags.map(({ tag }) => tag),
  };
}

async function getUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const view = searchParams.get("view");
  const sort = searchParams.get("sort") ?? "updatedAt";
  const direction: Prisma.SortOrder =
    searchParams.get("direction") === "asc" ? "asc" : "desc";
  const today = new Date();
  const todayValue = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  const where = {
    userId,
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { notes: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status && taskStatuses.includes(status as (typeof taskStatuses)[number]) ? { status } : {}),
    ...(priority && taskPriorities.includes(priority as (typeof taskPriorities)[number]) ? { priority } : {}),
    ...(category ? { category: { normalizedName: category.toLowerCase() } } : {}),
    ...(tag ? { tags: { some: { tag: { normalizedName: tag.toLowerCase() } } } } : {}),
    ...(view === "active" ? { status: { not: TaskStatus.completed } } : {}),
    ...(view === "completed" ? { status: TaskStatus.completed } : {}),
    ...(view === "today" ? { dueDate: todayValue } : {}),
    ...(view === "overdue"
      ? { dueDate: { lt: todayValue }, status: { not: TaskStatus.completed } }
      : {}),
  };

  const orderBy =
    sort === "title"
      ? { title: direction }
      : sort === "priority"
        ? { priority: direction }
        : sort === "dueDate"
          ? { dueDate: direction }
          : sort === "createdAt"
            ? { createdAt: direction }
            : { updatedAt: direction };

  const [tasks, categories, tags, counts] = await Promise.all([
    db.task.findMany({
      where,
      include: taskInclude,
      orderBy: [orderBy, { id: "asc" }],
    }),
    db.category.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    db.tag.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    db.task.groupBy({ by: ["status"], where: { userId }, _count: true }),
  ]);

  return NextResponse.json({
    tasks: tasks.map(serializeTask),
    categories,
    tags,
    counts: counts.reduce<Record<string, number>>((result, item) => {
      result[item.status] = item._count;
      return result;
    }, {}),
  });
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    throw error;
  }
  const parsed = taskInput.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid task" },
      { status: 400 },
    );
  const data = parsed.data;
  const categoryName = data.category?.trim();
  const tagNames = [...new Set(data.tags.map((tag) => tag.trim()).filter(Boolean))];

  const task = await db.$transaction(async (tx) => {
    const category = categoryName
      ? await tx.category.upsert({
          where: {
            userId_normalizedName: {
              userId,
              normalizedName: categoryName.toLowerCase(),
            },
          },
          update: { name: categoryName },
          create: {
            userId,
            name: categoryName,
            normalizedName: categoryName.toLowerCase(),
          },
        })
      : null;
    const tags = await Promise.all(
      tagNames.map((name) =>
        tx.tag.upsert({
          where: {
            userId_normalizedName: { userId, normalizedName: name.toLowerCase() },
          },
          update: { name },
          create: { userId, name, normalizedName: name.toLowerCase() },
        }),
      ),
    );
    return tx.task.create({
      data: {
        userId,
        title: data.title,
        notes: data.notes || null,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(`${data.dueDate}T00:00:00.000Z`) : null,
        categoryId: category?.id ?? null,
        completedAt: data.status === TaskStatus.completed ? new Date() : null,
        tags: { create: tags.map((tag) => ({ tagId: tag.id })) },
      },
      include: taskInclude,
    });
  });

  return NextResponse.json(serializeTask(task), { status: 201 });
}
