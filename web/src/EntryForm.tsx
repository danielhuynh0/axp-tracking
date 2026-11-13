import { useState, type FormEvent } from "react";
import { CATEGORIES, categoryName, formatHours, splitHours, type CategoryId, type EntryInput } from "./domain";

type Props = {
  weekStart: string;
  initial?: EntryInput;
  projectSuggestions: string[];
  onSave: (input: EntryInput) => Promise<void>;
  onCancel?: () => void;
};

export function EntryForm({ weekStart, initial, projectSuggestions, onSave, onCancel }: Props) {
  const [hours, setHours] = useState(initial ? String(initial.hours) : "");
  const [project, setProject] = useState(initial?.project ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [categories, setCategories] = useState<CategoryId[]>(initial?.categories ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hoursNum = Number(hours);
  const each = splitHours({ hours: hoursNum || 0, categories });

  const toggle = (id: CategoryId) =>
    setCategories((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Keep categories in NCARB order regardless of click order
      const ordered = CATEGORIES.map((c) => c.id).filter((id) => categories.includes(id));
      await onSave({ weekStart, hours: hoursNum, project, note, categories: ordered });
      if (!initial) {
        setHours("");
        setNote("");
        setCategories([]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const listId = `projects-${initial ? "edit" : "new"}`;

  return (
    <form className="entry-form" onSubmit={submit}>
      <div className="row">
        <label className="hours">
          Hours
          <input type="number" min="0.25" max="168" step="0.25" required value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
        <label className="grow">
          Project
          <input required maxLength={200} list={listId} value={project} onChange={(e) => setProject(e.target.value)} />
          <datalist id={listId}>
            {projectSuggestions.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
      </div>

      <label>
        Note
        <textarea rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <fieldset>
        <legend>Categories</legend>
        <div className="categories">
          {CATEGORIES.map((c) => (
            <label key={c.id} className="check">
              <input type="checkbox" checked={categories.includes(c.id)} onChange={() => toggle(c.id)} />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>

      {categories.length > 0 && hoursNum > 0 && (
        <p className="muted">
          Split: {categories.map((id) => `${formatHours(each)} ${categoryName(id)}`).join(" · ")}
        </p>
      )}

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="submit" disabled={busy || categories.length === 0}>
          {busy ? "Saving…" : initial ? "Save" : "Add entry"}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
