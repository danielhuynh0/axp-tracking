import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { addWeeks, buildReport, formatHours, formatWeek, snapToWeek, weekStartOf, type Entry } from "./domain";
import { WeekSummary } from "./WeekSummary";

export function Report({ onError }: { onError: (err: unknown) => void }) {
  const thisWeek = weekStartOf(new Date());
  const [from, setFrom] = useState(() => addWeeks(thisWeek, -3));
  const [to, setTo] = useState(thisWeek);
  const [entries, setEntries] = useState<Entry[] | null>(null);

  const validRange = from <= to;

  useEffect(() => {
    if (!validRange) return;
    let cancelled = false;
    setEntries(null);
    api
      .listEntries(from, to)
      .then((data) => !cancelled && setEntries(data))
      .catch(onError);
    return () => {
      cancelled = true;
    };
  }, [from, to, validRange, onError]);

  const report = useMemo(() => (entries ? buildReport(entries, from, to) : null), [entries, from, to]);
  const rangeLabel = `${formatWeek(from).split(" – ")[0]} – ${formatWeek(to).split(" – ")[1]}`;

  function print() {
    // The document title becomes the default PDF filename
    const previous = document.title;
    document.title = `AXP Hours ${from} to ${to}`;
    window.print();
    document.title = previous;
  }

  return (
    <section>
      <div className="card range no-print">
        <label>
          From week of
          <input type="date" value={from} onChange={(e) => e.target.value && setFrom(snapToWeek(e.target.value))} />
        </label>
        <label>
          To week of
          <input type="date" value={to} onChange={(e) => e.target.value && setTo(snapToWeek(e.target.value))} />
        </label>
        <button onClick={print} disabled={!report}>
          Print / Save as PDF
        </button>
      </div>

      {!validRange && <p className="error">"From" must be on or before "To".</p>}
      {validRange && !report && <p className="muted center">Loading…</p>}

      {report && (
        <>
          <div className="print-only report-title">
            <h1>AXP Hours Report</h1>
            <p className="muted">Generated {new Date().toLocaleDateString()}</p>
          </div>

          <div className="card summary">
            <div className="entry-head">
              <h3>{rangeLabel}</h3>
              <span className="hours-badge">{formatHours(report.total)}</span>
            </div>
            <table className="totals">
              <tbody>
                {report.totals.map((c) => (
                  <tr key={c.id} className={c.total === 0 ? "muted" : ""}>
                    <td>{c.name}</td>
                    <td className="num">{formatHours(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {report.weeks.map((week) => (
            <WeekSummary key={week.weekStart} week={week} title={formatWeek(week.weekStart)} />
          ))}
        </>
      )}
    </section>
  );
}
