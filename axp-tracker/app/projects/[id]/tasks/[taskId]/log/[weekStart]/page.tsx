import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { paramToWeek, formatWeekRange, weekToParam } from "@/lib/dates";
import { WeeklyLogForm } from "./WeeklyLogForm";

export default async function WeeklyLogPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string; weekStart: string }>;
}) {
  const { id: projectId, taskId, weekStart } = await params;
  const userId = await getCurrentUserId();

  const [project, task] = await Promise.all([
    prisma.project.findFirst({ where: { id: projectId, userId } }),
    prisma.task.findFirst({
      where: { id: taskId, projectId, project: { userId } },
      include: {
        categoryWeights: {
          include: { category: true },
          orderBy: { category: { sortOrder: "asc" } },
        },
      },
    }),
  ]);

  if (!project || !task) notFound();

  const weekDate = paramToWeek(weekStart);
  const existingEntry = await prisma.weeklyEntry.findUnique({
    where: { taskId_weekStartDate: { taskId, weekStartDate: weekDate } },
    include: { entryHours: true },
  });

  const activeWeights = task.categoryWeights
    .filter((w) => Number(w.weight) > 0)
    .map((w) => ({
      categoryId: w.categoryId,
      categoryName: w.category.name,
      weight: Number(w.weight),
    }));

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/tasks/${taskId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← {task.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-100 mt-2">
          Log Hours
        </h1>
        <p className="text-gray-500 mt-1 font-medium">
          {formatWeekRange(weekDate)}
        </p>
      </div>

      <WeeklyLogForm
        projectId={projectId}
        taskId={taskId}
        weekStartParam={weekStart}
        activeWeights={activeWeights}
        existingHours={
          existingEntry
            ? {
                entryId: existingEntry.id,
                totalHours: Number(existingEntry.totalHours),
              }
            : undefined
        }
      />
    </div>
  );
}
