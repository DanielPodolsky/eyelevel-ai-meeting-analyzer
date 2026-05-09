import { motion } from "motion/react";
import { SectionHeading } from "./SummarySection";

interface Props {
  participants: string[];
}

const pillContainer = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const pillItem = {
  initial: { opacity: 0, y: 4, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function ParticipantsList({ participants }: Props) {
  return (
    <section>
      <SectionHeading
        number="02"
        label="משתתפים"
        count={participants.length}
      />
      {participants.length === 0 ? (
        <p className="text-faint italic">—</p>
      ) : (
        <motion.ul
          className="flex flex-wrap gap-2.5"
          variants={pillContainer}
          initial="initial"
          animate="animate"
        >
          {participants.map((p, i) => (
            <motion.li
              key={i}
              variants={pillItem}
              className="rounded-full border border-line bg-card-2 px-4 py-2 text-fg text-[15px] flex items-center gap-2"
            >
              <span
                dir="ltr"
                className="font-mono text-[10px] text-faint tabular-nums"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{p}</span>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </section>
  );
}
