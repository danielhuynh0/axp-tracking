import { formatHours, type ReportWeek } from "./domain";

// Week → category (total) → entry (split hours) + note
export function WeekSummary({ week, title }: { week: ReportWeek; title: string }) {
  return (
    <div className="card week">
      <div className="entry-head">
        <h3>{title}</h3>
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
  );
}
