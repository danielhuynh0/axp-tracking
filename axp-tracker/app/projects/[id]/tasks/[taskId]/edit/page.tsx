import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { weightsToExactPercentages } from "@/lib/hours";
import { TaskForm } from "../../new/TaskForm";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: projectId, taskId } = await params;
  const userId = await getCurrentUserId();

  const [project, task, categories] = await Promise.all([
    prisma.project.findFirst({ where: { id: projectId, userId } }),
    prisma.task.findFirst({
      where: { id: taskId, projectId, project: { userId } },
      include: { categoryWeights: true },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  if (!project || !task) notFound();

  const initialWeights = weightsToExactPercentages(
    task.categoryWeights.map((w) => ({ categoryId: w.categoryId, weight: Number(w.weight) }))
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/projects/${projectId}`} className="text-sm text-blue-600 hover:underline">
          ← {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-100 mt-2">Edit Task</h1>
      </div>
      <TaskForm
        projectId={projectId}
        categories={categories}
        initialName={task.name}
        initialDescription={task.description ?? ""}
        initialWeights={initialWeights}
        taskId={taskId}
      />
    </div>
  );
}
