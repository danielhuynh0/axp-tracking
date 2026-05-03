import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { distributeHours } from "@/lib/hours";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const userId = await getCurrentUserId();
  const task = await prisma.task.findFirst({ where: { id: taskId, project: { userId } } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entries = await prisma.weeklyEntry.findMany({
    where: { taskId },
    orderBy: { weekStartDate: "desc" },
    include: { entryHours: { include: { category: true } } },
  });
  return NextResponse.json(entries);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const userId = await getCurrentUserId();

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { userId } },
    include: { categoryWeights: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { weekStartDate, totalHours } = await request.json();
  if (!weekStartDate || totalHours == null || totalHours <= 0) {
    return NextResponse.json({ error: "weekStartDate and positive totalHours required" }, { status: 400 });
  }

  const weekDate = new Date(weekStartDate);
  const distributed = distributeHours(
    Number(totalHours),
    task.categoryWeights.map((w) => ({ categoryId: w.categoryId, weight: Number(w.weight) }))
  );

  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.weeklyEntry.upsert({
      where: { taskId_weekStartDate: { taskId, weekStartDate: weekDate } },
      update: { totalHours },
      create: { taskId, weekStartDate: weekDate, totalHours },
    });

    await tx.weeklyEntryHours.deleteMany({ where: { weeklyEntryId: created.id } });
    await tx.weeklyEntryHours.createMany({
      data: distributed.map((d) => ({
        weeklyEntryId: created.id,
        categoryId: d.categoryId,
        hours: d.hours,
      })),
    });

    return tx.weeklyEntry.findUnique({
      where: { id: created.id },
      include: { entryHours: { include: { category: true } } },
    });
  });

  return NextResponse.json(entry, { status: 201 });
}
