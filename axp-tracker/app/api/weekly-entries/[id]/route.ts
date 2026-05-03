import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { distributeHours } from "@/lib/hours";

async function getEntry(entryId: string, userId: string) {
  return prisma.weeklyEntry.findFirst({
    where: { id: entryId, task: { project: { userId } } },
    include: { task: { include: { categoryWeights: true } } },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const entry = await prisma.weeklyEntry.findFirst({
    where: { id, task: { project: { userId } } },
    include: { entryHours: { include: { category: true } } },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const entry = await getEntry(id, userId);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { totalHours } = await request.json();
  if (totalHours == null || totalHours <= 0) {
    return NextResponse.json({ error: "Positive totalHours required" }, { status: 400 });
  }

  const distributed = distributeHours(
    Number(totalHours),
    entry.task.categoryWeights.map((w) => ({ categoryId: w.categoryId, weight: Number(w.weight) }))
  );

  const updated = await prisma.$transaction(async (tx) => {
    await tx.weeklyEntry.update({ where: { id }, data: { totalHours } });
    await tx.weeklyEntryHours.deleteMany({ where: { weeklyEntryId: id } });
    await tx.weeklyEntryHours.createMany({
      data: distributed.map((d) => ({
        weeklyEntryId: id,
        categoryId: d.categoryId,
        hours: d.hours,
      })),
    });
    return tx.weeklyEntry.findUnique({
      where: { id },
      include: { entryHours: { include: { category: true } } },
    });
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const entry = await getEntry(id, userId);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.weeklyEntry.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
