import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { EntryForm } from "./EntryForm";
import {
  addWeeks,
  buildReport,
  categoryName,
  formatHours,
  formatWeek,
  snapToWeek,
  weekStartOf,
  type Entry,
  type EntryInput,
} from "./domain";
import { WeekSummary } from "./WeekSummary";

export function LogWeek({ onError }: { onError: (err: unknown) => void }) {
  const [weekStart, setWeekStart] = useState(() => weekStartOf(new Date()));
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ text: string; week: string } | null>(null);

  const load = useCallback(async () => {
    setEntries(null);
    try {
      setEntries(await api.listEntries(weekStart, weekStart));
    } catch (err) {
      onError(err);
    }
  }, [weekStart, onError]);

  useEffect(() => {
    load();
    setEditingId(null);
    setNotice(null);
  }, [load]);

  // Project suggestions from the last ~6 months
  useEffect(() => {
    const today = weekStartOf(new Date());
    api
      .listEntries(addWeeks(today, -26), today)
      .then((all) => setProjects([...new Set(all.map((e) => e.project))].sort()))
      .catch(() => {});
  }, []);

  const total = useMemo(() => (entries ?? []).reduce((sum, e) => sum + e.hours, 0), [entries]);
  const summary = useMemo(
    () => (entries?.length ? buildReport(entries, weekStart, weekStart).weeks[0] : null),
    [entries, weekStart],
  );
  const allProjects = useMemo(
    () => [...new Set([...projects, ...(entries ?? []).map((e) => e.project)])].sort(),
    [projects, entries],
  );

  async function create(input: EntryInput) {
    const entry = await api.createEntry(input);
    setProjects((cur) => (cur.includes(entry.project) ? cur : [...cur, entry.project]));
    if (entry.weekStart === weekStart) {
      setEntries((cur) => [...(cur ?? []), entry]);
      setNotice(null);
    } else {
      setNotice({ text: `Added ${formatHours(entry.hours)} to ${formatWeek(entry.weekStart)}.`, week: entry.weekStart });
    }
  }

  async function update(id: string, input: EntryInput) {
    const entry = await api.updateEntry(id, input);
    setEntries((cur) => (cur ?? []).map((e) => (e.id === id ? entry : e)));
    setEditingId(null);
  }

  async function remove(entry: Entry) {
    if (!confirm(`Delete ${formatHours(entry.hours)} on "${entry.project}"?`)) return;
    try {
      await api.deleteEntry(entry.id);
      setEntries((cur) => (cur ?? []).filter((e) => e.id !== entry.id));
    } catch (err) {
      onError(err);
    }
  }

  const thisWeek = weekStartOf(new Date());

  return (
    <section>
      <div className="week-nav">
        <button className="secondary" onClick={() => setWeekStart(addWeeks(weekStart, -1))} aria-label="Previous week">
          ‹
        </button>
        <div className="week-title">
          <h2>{formatWeek(weekStart)}</h2>
          <span className="muted">{entries ? `${formatHours(total)} total` : "Loading…"}</span>
        </div>
        <button className="secondary" onClick={() => setWeekStart(addWeeks(weekStart, 1))} aria-label="Next week">
          ›
        </button>
      </div>
      <div className="week-jump">
        <label>
          Jump to week of
          <input type="date" value={weekStart} onChange={(e) => e.target.value && setWeekStart(snapToWeek(e.target.value))} />
        </label>
        {weekStart !== thisWeek && (
          <button className="link" onClick={() => setWeekStart(thisWeek)}>
            Jump to this week
          </button>
        )}
      </div>

      <div className="card">
        <h3>Add entry</h3>
        <EntryForm weekStart={weekStart} projectSuggestions={allProjects} onSave={create} />
        {notice && (
          <p className="muted notice">
            {notice.text}{" "}
            <button className="link" onClick={() => setWeekStart(notice.week)}>
              View that week
            </button>
          </p>
        )}
      </div>

      {summary && <WeekSummary week={summary} title="Week summary by category" />}

      
      <h3 className="section-title">Entries for this week</h3>
      {entries && entries.length === 0 && <p className="muted center">No entries this week yet.</p>}

      <ul className="entries">
        {entries?.map((entry) =>
          editingId === entry.id ? (
            <li key={entry.id} className="card">
              <EntryForm
                weekStart={weekStart}
                initial={entry}
                projectSuggestions={allProjects}
                onSave={(input) => update(entry.id, input)}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={entry.id} className="card entry">
              <div className="entry-head">
                <strong>{entry.project}</strong>
                <span className="hours-badge">{formatHours(entry.hours)}</span>
              </div>
              {entry.note && <p className="note">{entry.note}</p>}
              <p className="muted">{entry.categories.map(categoryName).join(" · ")}</p>
              <div className="actions">
                <button className="link" onClick={() => setEditingId(entry.id)}>
                  Edit
                </button>
                <button className="link danger" onClick={() => remove(entry)}>
                  Delete
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
