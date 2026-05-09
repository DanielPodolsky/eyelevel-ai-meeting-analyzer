import { motion } from "motion/react";
import type { Decision } from "../types/contracts";
import { SectionHeading } from "./SummarySection";

interface Props {
  decisions: Decision[];
}

export function DecisionsList({ decisions }: Props) {
  return (
    <section>
      <SectionHeading number="03" label="החלטות" count={decisions.length} />
      {decisions.length === 0 ? (
        <p className="text-faint italic">לא התקבלו החלטות</p>
      ) : (
        <ol className="space-y-4">
          {decisions.map((d, i) => (
            <motion.li
              key={i}
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              className="relative rounded-xl bg-card-2/60 border border-line px-6 py-5 hover:border-line-strong transition-colors"
            >
              <span
                aria-hidden
                className="absolute right-0 top-5 bottom-5 w-[3px] rounded-full bg-accent"
              />
              <p className="font-display text-[18px] text-fg leading-[1.6] font-medium">
                {d.text}
              </p>
              {d.context && (
                <p className="text-muted text-[15px] leading-[1.7] italic mt-3">
                  {d.context}
                </p>
              )}
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  );
}
