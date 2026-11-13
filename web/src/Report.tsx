import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { addWeeks, buildReport, formatHours, formatWeek, snapToWeek, weekStartOf, type Entry } from "./domain";

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

  return (
    <section>
      <div className="card range">
        <label>
          From week of
          <input type="date" value={from} onChange={(e) => e.target.value && setFrom(snapToWeek(e.target.value))} />
        </label>
        <label>
          To week of
          <input type="date" value={to} onChange={(e) => e.target.value && setTo(snapToWeek(e.target.value))} />
        </label>
      </div>

      {!validRange && <p className="error">"From" must be on or before "To".</p>}
      {validRange && !report && <p className="muted center">Loading…</p>}

      {report && (
        <>
          <div className="card">
            <div className="entry-head">
              <h3>
                {formatWeek(from).split(" – ")[0]} – {formatWeek(to).split(" – ")[1]}
              </h3>
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
            <div key={week.weekStart} className="card week">
              <div className="entry-head">
                <h3>{formatWeek(week.weekStart)}</h3>
                <span className="hours-badge">{formatHours(week.total)}</span>
              </div>
              {week.categories.length === 0 && <p className="muted">No hours logged.</p>}
              {week.categories.map((cat) => (
                <div key={cat.id} className="report-category">
                  <div className="entry-head">
                    <strong>{cat.name}</strong>
                    <span>{formatHours(cat.total)}</span>
                  </div>
                  <ul>
                    {cat.lines.map((line) => (
                      <li key={line.entryId}>
                        <div className="entry-head">
                          <span>{line.project}</span>
                          <span className="muted">{formatHours(line.hours)}</span>
                        </div>
                        {line.note && <p className="note muted">{line.note}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
