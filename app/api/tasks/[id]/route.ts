import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const TaskStatus = { completed: "completed" } as const;
const input = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  priority: z.enum(["none", "low", "medium", "high"]).optional(),
  dueDate: z.string().date().nullable().optional(),
  category: z.string().trim().max(50).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

const include = { category: true, tags: { include: { tag: true } } } as const;
type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof include }>;
const serialize = (task: TaskWithRelations) => ({
  ...task,
  dueDate: task.dueDate?.toISOString().slice(0, 10) ?? null,
  tags: task.tags.map(({ tag }) => tag),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    throw error;
  }
  const parsed = input.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid task" },
      { status: 400 },
    );
  const existing = await db.task.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  const data = parsed.data;

  const task = await db.$transaction(async (tx) => {
    let categoryId = existing.categoryId;
    if (data.category !== undefined) {
      const name = data.category?.trim();
      categoryId = name
        ? (
            await tx.category.upsert({
              where: {
                userId_normalizedName: {
                  userId: session.user.id,
                  normalizedName: name.toLowerCase(),
                },
              },
              update: { name },
              create: {
                userId: session.user.id,
                name,
                normalizedName: name.toLowerCase(),
              },
            })
          ).id
        : null;
    }
    if (data.tags) {
      const tags = await Promise.all(
        [...new Set(data.tags.map((tag) => tag.trim().toLowerCase()))].map((name) =>
          tx.tag.upsert({
            where: {
              userId_normalizedName: { userId: session.user.id, normalizedName: name },
            },
            update: {},
            create: { userId: session.user.id, name, normalizedName: name },
          }),
        ),
      );
      await tx.taskTag.deleteMany({ where: { taskId: id } });
      if (tags.length)
        await tx.taskTag.createMany({
          data: tags.map((tag) => ({ taskId: id, tagId: tag.id })),
        });
    }
    const status = data.status ?? existing.status;
    return tx.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(`${data.dueDate}T00:00:00.000Z`) : null,
        }),
        ...(data.category !== undefined && { categoryId }),
        ...(data.status !== undefined && {
          status,
          completedAt:
            status === TaskStatus.completed
              ? (existing.completedAt ?? new Date())
              : null,
        }),
      },
      include,
    });
  });
  return NextResponse.json(serialize(task));
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.task.deleteMany({ where: { id, userId: session.user.id } });
  return new NextResponse(null, { status: 204 });
}
