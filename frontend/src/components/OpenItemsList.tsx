import { motion } from "motion/react";
import type { OpenItem } from "../types/contracts";
import { SectionHeading } from "./SummarySection";

interface Props {
  items: OpenItem[];
  onProvenance?: (query: string) => void;
}

const listContainer = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const listItem = {
  initial: { opacity: 0, x: 8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function OpenItemsList({ items, onProvenance }: Props) {
  return (
    <section>
      <SectionHeading
        number="05"
        label="נושאים פתוחים"
        count={items.length}
        copyText={
          items.length > 0
            ? items.map((o) => `• ${o.text}`).join("\n")
            : undefined
        }
      />
      {items.length === 0 ? (
        <p className="text-faint italic">אין נושאים פתוחים</p>
      ) : (
        <motion.ul
          className="space-y-5"
          variants={listContainer}
          initial="initial"
          animate="animate"
        >
          {items.map((o, i) => (
            <motion.li
              key={i}
              variants={listItem}
              onClick={() => onProvenance?.(o.text)}
              className={[
                "flex gap-4 items-start rounded-lg -mx-3 px-3 py-1 transition-colors",
                onProvenance && "cursor-pointer hover:bg-card-2/60",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span
                dir="ltr"
                aria-hidden
                className="font-mono text-[11px] text-faint tabular-nums pt-1 shrink-0"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-fg text-[16px] leading-[1.7]">{o.text}</p>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </section>
  );
}
