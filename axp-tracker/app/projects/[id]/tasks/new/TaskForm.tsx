"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

interface TaskFormProps {
  projectId: string;
  categories: Category[];
  initialName?: string;
  initialDescription?: string;
  initialWeights?: Record<string, number>;
  taskId?: string;
}

const BAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-green-500",
  "bg-orange-500", "bg-red-500", "bg-teal-500",
];

export function TaskForm({
  projectId,
  categories,
  initialName = "",
  initialDescription = "",
  initialWeights,
  taskId,
}: TaskFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [weights, setWeights] = useState<Record<string, number>>(
    initialWeights ?? Object.fromEntries(categories.map((c) => [c.id, 0]))
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEdit = !!taskId;
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  const totalRounded = Math.round(total * 10) / 10;
  const isExact = Math.abs(total - 100) <= 1;
  const isOver = total > 101;

  function setPct(categoryId: string, value: string) {
    const num = Math.max(0, Math.min(100, parseFloat(value) || 0));
    setWeights((prev) => ({ ...prev, [categoryId]: num }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Task name is required."); return; }
    if (!isExact) {
      setError(`Category percentages must sum to 100% (currently ${totalRounded}%).`);
      return;
    }

    setLoading(true);
    setError("");

    const weightEntries = categories.map((c) => ({
      categoryId: c.id,
      weight: weights[c.id] ?? 0,
    }));

    const url = isEdit ? `/api/tasks/${taskId}` : `/api/projects/${projectId}/tasks`;
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, weights: weightEntries }),
    });

    if (res.ok) {
      router.push(`/projects/${projectId}`);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save task.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">Task Details</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name" required>Task Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Schematic Design Phase"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">Category Distribution</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Enter the percentage of hours for each AXP category. Must total 100%.
            Set a category to 0% to exclude it.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((category, i) => {
              const pct = weights[category.id] ?? 0;
              const active = pct > 0;
              return (
                <div key={category.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-sm font-medium ${active ? "text-gray-900" : "text-gray-400"}`}>
                      {category.name}
                    </span>
                    <div className="relative flex items-center">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={pct}
                        onChange={(e) => setPct(category.id, e.target.value)}
                        className="w-20 text-right pr-7"
                      />
                      <span className="absolute right-2.5 text-sm text-gray-400 pointer-events-none">%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-150 ${BAR_COLORS[i % BAR_COLORS.length]}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Running total */}
          <div className={`mt-5 pt-4 border-t flex items-center justify-between text-sm font-semibold ${
            isExact ? "text-green-600" : isOver ? "text-red-600" : "text-amber-600"
          }`}>
            <span>Total</span>
            <span>
              {totalRounded}%
              {isExact && "  ✓"}
              {!isExact && !isOver && ` — ${Math.round((100 - total) * 10) / 10}% remaining`}
              {isOver && ` — ${Math.round((total - 100) * 10) / 10}% over`}
            </span>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Task"}
        </Button>
        <Link href={`/projects/${projectId}`}>
          <Button type="button" variant="secondary">Cancel</Button>
        </Link>
      </div>
    </form>
  );
}
