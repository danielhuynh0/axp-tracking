import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const userId = await getCurrentUserId();

  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, description, weights } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      name: name.trim(),
      description: description?.trim() || null,
      categoryWeights: {
        create: (weights as { categoryId: string; weight: number }[])
          .filter((w) => w.weight >= 0)
          .map((w) => ({ categoryId: w.categoryId, weight: w.weight })),
      },
    },
    include: { categoryWeights: { include: { category: true } } },
  });
  return NextResponse.json(task, { status: 201 });
}
