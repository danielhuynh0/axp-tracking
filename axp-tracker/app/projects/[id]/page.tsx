import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { weightsToPercentages } from "@/lib/hours";

const CATEGORY_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-green-100 text-green-800",
  "bg-orange-100 text-orange-800",
  "bg-red-100 text-red-800",
  "bg-teal-100 text-teal-800",
];

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      tasks: {
        orderBy: { createdAt: "asc" },
        include: {
          categoryWeights: {
            include: { category: true },
            orderBy: { category: { sortOrder: "asc" } },
          },
          _count: { select: { weeklyEntries: true } },
        },
      },
    },
  });

  if (!project) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link href="/projects" className="text-sm text-blue-600 hover:underline">
          ← Projects
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{project.name}</h1>
            {project.description && (
              <p className="text-gray-500 mt-1">{project.description}</p>
            )}
          </div>
          <Link href={`/projects/${id}/tasks/new`}>
            <Button>+ New Task</Button>
          </Link>
        </div>
      </div>

      {project.tasks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-gray-500 mb-4">No tasks yet.</p>
            <Link href={`/projects/${id}/tasks/new`}>
              <Button>Add your first task</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {project.tasks.map((task) => {
            const weights = task.categoryWeights.map((w) => ({
              categoryId: w.categoryId,
              weight: Number(w.weight),
            }));
            const percentages = weightsToPercentages(weights);

            return (
              <Link key={task.id} href={`/projects/${id}/tasks/${task.id}`}>
                <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-gray-100 text-lg truncate">
                          {task.name}
                        </h2>
                        {task.description && (
                          <p className="text-sm text-gray-500 mt-0.5 truncate">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {task._count.weeklyEntries} week
                        {task._count.weeklyEntries !== 1 ? "s" : ""} logged
                      </span>
                    </div>

                    {task.categoryWeights.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {task.categoryWeights
                          .filter((w) => Number(w.weight) > 0)
                          .map((w, i) => (
                            <span
                              key={w.categoryId}
                              className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                            >
                              {w.category.name} · {percentages[w.categoryId]}%
                            </span>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
