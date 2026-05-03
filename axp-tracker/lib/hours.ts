const QUARTER = 0.25;

export interface WeightEntry {
  categoryId: string;
  weight: number;
}

export interface HoursEntry {
  categoryId: string;
  hours: number;
}

/**
 * Distributes totalHours across categories using relative weights.
 * All resulting hours are multiples of 0.25 and sum exactly to totalHours.
 * Categories with weight=0 are excluded.
 */
export function distributeHours(
  totalHours: number,
  weights: WeightEntry[]
): HoursEntry[] {
  const active = weights.filter((w) => w.weight > 0);
  if (active.length === 0) return [];

  const totalWeight = active.reduce((sum, w) => sum + w.weight, 0);

  const floored = active.map((w) => {
    const raw = totalHours * (w.weight / totalWeight);
    const fl = Math.floor(raw / QUARTER) * QUARTER;
    return { categoryId: w.categoryId, floored: fl, remainder: raw - fl };
  });

  const sumFloored = floored.reduce((s, w) => s + w.floored, 0);
  const quartersToDistribute = Math.round((totalHours - sumFloored) / QUARTER);

  // Sort by largest fractional remainder to assign the leftover quarters fairly
  const byRemainder = [...floored].sort((a, b) => b.remainder - a.remainder);
  const result = new Map(floored.map((w) => [w.categoryId, w.floored]));

  for (let i = 0; i < quartersToDistribute; i++) {
    const cat = byRemainder[i % byRemainder.length];
    result.set(cat.categoryId, result.get(cat.categoryId)! + QUARTER);
  }

  return active.map((w) => ({
    categoryId: w.categoryId,
    hours: Math.round(result.get(w.categoryId)! * 100) / 100,
  }));
}

export function weightsToPercentages(
  weights: WeightEntry[]
): Record<string, number> {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  if (total === 0) return Object.fromEntries(weights.map((w) => [w.categoryId, 0]));
  return Object.fromEntries(
    weights.map((w) => [w.categoryId, Math.round((w.weight / total) * 100)])
  );
}

/**
 * Converts relative weights to integer percentages that sum to exactly 100.
 * Uses the largest-remainder method so rounding never causes off-by-one totals.
 * Inactive categories (weight=0) remain 0 and are excluded from the 100 budget.
 */
export function weightsToExactPercentages(
  weights: WeightEntry[]
): Record<string, number> {
  const result: Record<string, number> = Object.fromEntries(
    weights.map((w) => [w.categoryId, 0])
  );
  const active = weights.filter((w) => w.weight > 0);
  if (active.length === 0) return result;

  const total = active.reduce((s, w) => s + w.weight, 0);
  const floored = active.map((w) => {
    const exact = (w.weight / total) * 100;
    return { categoryId: w.categoryId, floored: Math.floor(exact), remainder: exact % 1 };
  });

  const leftover = 100 - floored.reduce((s, w) => s + w.floored, 0);
  floored.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < leftover; i++) floored[i].floored += 1;

  for (const w of floored) result[w.categoryId] = w.floored;
  return result;
}
