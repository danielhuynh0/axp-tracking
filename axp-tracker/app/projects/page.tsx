import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function ProjectsPage() {
  const userId = await getCurrentUserId();
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Projects</h1>
        <Link href="/projects/new">
          <Button>+ New Project</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-gray-500 mb-4">No projects yet.</p>
            <Link href="/projects/new">
              <Button>Create your first project</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="py-5">
                  <h2 className="font-semibold text-gray-100 text-lg mb-1 truncate">
                    {project.name}
                  </h2>
                  {project.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-auto">
                    {project._count.tasks} task{project._count.tasks !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
