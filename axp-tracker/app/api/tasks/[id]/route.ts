import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

async function getTask(taskId: string, userId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, project: { userId } },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const task = await prisma.task.findFirst({
    where: { id, project: { userId } },
    include: {
      categoryWeights: { include: { category: true }, orderBy: { category: { sortOrder: "asc" } } },
      weeklyEntries: {
        orderBy: { weekStartDate: "desc" },
        include: { entryHours: { include: { category: true } } },
      },
    },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const task = await getTask(id, userId);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, description, weights } = await request.json();

  const updated = await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.task.update({
      where: { id },
      data: {
        ...(name?.trim() && { name: name.trim() }),
        description: description !== undefined ? (description?.trim() || null) : undefined,
      },
    });

    if (weights) {
      await tx.taskCategoryWeight.deleteMany({ where: { taskId: id } });
      await tx.taskCategoryWeight.createMany({
        data: (weights as { categoryId: string; weight: number }[])
          .filter((w) => w.weight >= 0)
          .map((w) => ({ taskId: id, categoryId: w.categoryId, weight: w.weight })),
      });
    }

    return updatedTask;
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const task = await getTask(id, userId);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
