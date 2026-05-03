import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { TaskForm } from "./TaskForm";

export default async function NewTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const userId = await getCurrentUserId();

  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) notFound();

  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/projects/${projectId}`} className="text-sm text-blue-600 hover:underline">
          ← {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-100 mt-2">New Task</h1>
      </div>
      <TaskForm projectId={projectId} categories={categories} />
    </div>
  );
}
