import type { ActionItem } from "../types/contracts";
import { SectionHeading } from "./SummarySection";

interface Props {
  items: ActionItem[];
  onProvenance?: (query: string) => void;
}

export function ActionItemsTable({ items, onProvenance }: Props) {
  const copyText =
    items.length > 0
      ? items.map((a) => `• ${a.who} — ${a.what} (${a.when})`).join("\n")
      : undefined;

  return (
    <section>
      <SectionHeading
        number="04"
        label="משימות לביצוע"
        count={items.length}
        copyText={copyText}
      />
      {items.length === 0 ? (
        <p className="text-faint italic">אין משימות לביצוע</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-card-2/60">
          <table className="w-full tnum">
            <thead>
              <tr className="border-b border-line bg-card/50">
                <th
                  scope="col"
                  className="text-start font-mono text-[10px] tracking-[0.22em] uppercase text-faint px-6 py-4 w-[140px]"
                >
                  מי
                </th>
                <th
                  scope="col"
                  className="text-start font-mono text-[10px] tracking-[0.22em] uppercase text-faint px-6 py-4"
                >
                  מה
                </th>
                <th
                  scope="col"
                  className="text-start font-mono text-[10px] tracking-[0.22em] uppercase text-faint px-6 py-4 w-[200px]"
                >
                  מתי
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((a, i) => (
                <tr
                  key={i}
                  onClick={() => onProvenance?.(a.what)}
                  className={[
                    "transition-colors hover:bg-card",
                    onProvenance && "cursor-pointer",
                    i < items.length - 1 ? "border-b border-line/60" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td className="px-6 py-5 align-top text-fg text-[16px] font-medium">
                    {a.who}
                  </td>
                  <td className="px-6 py-5 align-top text-fg text-[16px] leading-[1.65]">
                    {a.what}
                  </td>
                  <td className="px-6 py-5 align-top text-muted text-[15px] leading-[1.65]">
                    {a.when}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
