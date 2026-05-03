"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { distributeHours } from "@/lib/hours";

interface WeightEntry {
  categoryId: string;
  categoryName: string;
  weight: number;
}

interface ExistingHours {
  entryId: string;
  totalHours: number;
}

interface WeeklyLogFormProps {
  projectId: string;
  taskId: string;
  weekStartParam: string;
  activeWeights: WeightEntry[];
  existingHours?: ExistingHours;
}

const BAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-green-500",
  "bg-orange-500", "bg-red-500", "bg-teal-500",
];

export function WeeklyLogForm({
  projectId,
  taskId,
  weekStartParam,
  activeWeights,
  existingHours,
}: WeeklyLogFormProps) {
  const router = useRouter();
  const [totalHoursInput, setTotalHoursInput] = useState(
    existingHours ? String(existingHours.totalHours) : ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const totalHours = parseFloat(totalHoursInput);
  const isValidHours = !isNaN(totalHours) && totalHours > 0;

  const distribution = isValidHours
    ? distributeHours(totalHours, activeWeights)
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidHours) { setError("Enter a valid number of hours greater than 0."); return; }
    setLoading(true);
    setError("");

    let res: Response;
    if (existingHours) {
      res = await fetch(`/api/weekly-entries/${existingHours.entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalHours }),
      });
    } else {
      res = await fetch(`/api/tasks/${taskId}/weekly-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartDate: weekStartParam, totalHours }),
      });
    }

    if (res.ok) {
      router.push(`/projects/${projectId}/tasks/${taskId}`);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save.");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!existingHours || !confirm("Delete this week's entry?")) return;
    setLoading(true);
    const res = await fetch(`/api/weekly-entries/${existingHours.entryId}`, { method: "DELETE" });
    if (res.ok) {
      router.push(`/projects/${projectId}/tasks/${taskId}`);
      router.refresh();
    } else {
      setError("Failed to delete.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardContent className="py-5">
          <Label htmlFor="totalHours" required>Total Hours This Week</Label>
          <div className="flex items-center gap-3 mt-1">
            <Input
              id="totalHours"
              type="number"
              min={0.25}
              step={0.25}
              value={totalHoursInput}
              onChange={(e) => setTotalHoursInput(e.target.value)}
              placeholder="e.g. 12.5"
              className="max-w-[160px]"
              autoFocus
            />
            <span className="text-sm text-gray-500">hours</span>
          </div>
        </CardContent>
      </Card>

      {/* Live distribution preview */}
      {isValidHours && distribution.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-800">Hours Distribution</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Distributed in 0.25-hr increments, proportional to weights
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {distribution.map((d, i) => {
                const entry = activeWeights.find((w) => w.categoryId === d.categoryId);
                const pct = Math.round((d.hours / totalHours) * 100);
                return (
                  <div key={d.categoryId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{entry?.categoryName}</span>
                      <span className="text-gray-900 font-semibold tabular-nums">
                        {d.hours.toFixed(2)} hrs
                        <span className="text-gray-400 font-normal ml-1">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${BAR_COLORS[i % BAR_COLORS.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-900 flex justify-between text-sm font-semibold">
              <span className="text-gray-700">Total</span>
              <span className="text-gray-900 tabular-nums">
                {distribution.reduce((s, d) => s + d.hours, 0).toFixed(2)} hrs
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Button type="submit" disabled={loading || !isValidHours}>
            {loading ? "Saving…" : existingHours ? "Update" : "Save"}
          </Button>
          <Link href={`/projects/${projectId}/tasks/${taskId}`}>
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
        </div>
        {existingHours && (
          <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={loading}>
            Delete Entry
          </Button>
        )}
      </div>
    </form>
  );
}
