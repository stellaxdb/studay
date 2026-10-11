import { cn } from "@/components/ui/cn";

export interface BarDatum {
  key: string;
  /** Short x-axis label, e.g. "월" or "10/6" */
  label: string;
  value: number;
  /** Value as shown to people, e.g. "1시간 20분" */
  display: string;
  highlight?: boolean;
}

/**
 * Plain vertical bar chart. Single accent color, labelled axis, values shown
 * on hover/focus and in a visually hidden table for screen readers.
 */
export function BarChart({
  data,
  caption,
  valueHeader,
  height = 180,
}: {
  data: BarDatum[];
  caption: string;
  valueHeader: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <div aria-hidden className="flex items-end gap-1.5 sm:gap-3" style={{ height }}>
        {data.map((d) => {
          const pct = (d.value / max) * 100;
          return (
            <div key={d.key} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
              <span className="tabular text-fg-secondary mb-1 hidden truncate text-center text-[11px] group-hover:block">
                {d.display}
              </span>
              <div
                className={cn(
                  "w-full rounded-t-md transition-[height] duration-200",
                  d.value === 0
                    ? "bg-surface-subtle"
                    : d.highlight
                      ? "bg-primary"
                      : "bg-primary/45",
                )}
                style={{ height: d.value === 0 ? 3 : `max(${pct}%, 3px)` }}
                title={`${d.label}: ${d.display}`}
              />
            </div>
          );
        })}
      </div>
      <div aria-hidden className="border-border mt-2 flex gap-1.5 border-t pt-2 sm:gap-3">
        {data.map((d) => (
          <span
            key={d.key}
            className={cn(
              "tabular min-w-0 flex-1 truncate text-center text-xs",
              d.highlight ? "text-fg font-semibold" : "text-fg-secondary",
            )}
          >
            {d.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">기간</th>
            <th scope="col">{valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{d.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
