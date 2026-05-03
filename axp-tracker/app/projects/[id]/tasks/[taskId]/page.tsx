import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import {
  getCurrentWeekStart,
  getAvailableWeeks,
  formatWeekRange,
  weekToParam,
  dbDateToParam,
} from "@/lib/dates";
import { weightsToPercentages } from "@/lib/hours";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const CATEGORY_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-red-100 text-red-700",
  "bg-teal-100 text-teal-700",
];

export default async function TaskPage({
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
      include: {
        categoryWeights: {
          include: { category: true },
          orderBy: { category: { sortOrder: "asc" } },
        },
        weeklyEntries: {
          orderBy: { weekStartDate: "desc" },
          include: {
            entryHours: {
              include: { category: true },
              orderBy: { category: { sortOrder: "asc" } },
            },
          },
        },
      },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  if (!project || !task) notFound();

  const weights = task.categoryWeights.map((w) => ({
    categoryId: w.categoryId,
    weight: Number(w.weight),
  }));
  const percentages = weightsToPercentages(weights);
  const activeWeights = task.categoryWeights.filter((w) => Number(w.weight) > 0);
  const activeCategories = categories.filter((c) =>
    activeWeights.some((w) => w.categoryId === c.id)
  );

  const availableWeeks = getAvailableWeeks();
  const currentWeekStart = getCurrentWeekStart();

  const loggedWeekParams = new Set(
    task.weeklyEntries.map((e) => dbDateToParam(new Date(e.weekStartDate)))
  );

  // Weeks to show: available (upcoming + current) + past logged entries
  const pastEntries = task.weeklyEntries.filter((e) => {
    const param = dbDateToParam(new Date(e.weekStartDate));
    return !availableWeeks.some((w) => weekToParam(w) === param);
  });

  return (
    <div>
      <div className="mb-6">
        <Link href={`/projects/${projectId}`} className="text-sm text-blue-600 hover:underline">
          ← {project.name}
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{task.name}</h1>
            {task.description && (
              <p className="text-gray-500 mt-1">{task.description}</p>
            )}
          </div>
          <Link href={`/projects/${projectId}/tasks/${taskId}/edit`}>
            <Button variant="secondary" size="sm">Edit Task</Button>
          </Link>
        </div>
      </div>

      {/* Category weights */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-semibold text-gray-800">Category Weights</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {task.categoryWeights
              .filter((w) => Number(w.weight) > 0)
              .map((w, i) => (
                <span
                  key={w.categoryId}
                  className={`inline-flex items-center text-sm px-3 py-1 rounded-full font-medium ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                >
                  {w.category.name} · {percentages[w.categoryId]}%
                </span>
              ))}
            {activeWeights.length === 0 && (
              <p className="text-sm text-gray-400">
                No weights configured.{" "}
                <Link href={`/projects/${projectId}/tasks/${taskId}/edit`} className="text-blue-600 hover:underline">
                  Edit task
                </Link>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly log */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-100 text-lg">Weekly Log</h2>
      </div>

      <div className="space-y-3">
        {/* Available weeks (current + next 2) */}
        {availableWeeks.map((week) => {
          const param = weekToParam(week);
          const isCurrentWeek =
            weekToParam(week) === weekToParam(currentWeekStart);
          const entry = task.weeklyEntries.find(
            (e) => dbDateToParam(new Date(e.weekStartDate)) === param
          );
          const isLogged = loggedWeekParams.has(param);

          return (
            <Link
              key={param}
              href={`/projects/${projectId}/tasks/${taskId}/log/${param}`}
            >
              <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {isCurrentWeek && (
                        <span className="text-xs font-medium bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                      <span className="font-medium text-gray-900">
                        {formatWeekRange(week)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {isLogged && entry ? (
                        <span className="text-sm font-semibold text-gray-900">
                          {Number(entry.totalHours).toFixed(2)} hrs
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Not logged</span>
                      )}
                      <span className="text-blue-600 text-sm font-medium">
                        {isLogged ? "Edit" : "Log"}
                      </span>
                    </div>
                  </div>
                  {isLogged && entry && entry.entryHours.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {entry.entryHours.map((h, i) => (
                        <span
                          key={h.categoryId}
                          className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                        >
                          {h.category.name}: {Number(h.hours).toFixed(2)} hrs
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {/* Past logged entries */}
        {pastEntries.length > 0 && (
          <>
            <div className="pt-2 pb-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Past weeks
              </span>
            </div>
            {pastEntries.map((entry) => {
              const param = dbDateToParam(new Date(entry.weekStartDate));
              return (
                <Link
                  key={entry.id}
                  href={`/projects/${projectId}/tasks/${taskId}/log/${param}`}
                >
                  <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium text-gray-900">
                          {formatWeekRange(new Date(entry.weekStartDate))}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {Number(entry.totalHours).toFixed(2)} hrs
                          </span>
                          <span className="text-blue-600 text-sm font-medium">Edit</span>
                        </div>
                      </div>
                      {entry.entryHours.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {entry.entryHours.map((h, i) => (
                            <span
                              key={h.categoryId}
                              className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                            >
                              {h.category.name}: {Number(h.hours).toFixed(2)} hrs
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </>
        )}

        {task.weeklyEntries.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-400">
              No hours logged yet. Click a week above to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
