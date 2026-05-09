import { motion } from "motion/react";
import { SectionHeading } from "./SummarySection";

interface Props {
  participants: string[];
}

const rosterContainer = {
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const rosterItem = {
  initial: { opacity: 0, y: 3 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function ParticipantsList({ participants }: Props) {
  return (
    <section>
      <SectionHeading
        number="02"
        label="משתתפים"
        count={participants.length}
        copyText={
          participants.length > 0
            ? participants.map((p) => `• ${p}`).join("\n")
            : undefined
        }
      />
      {participants.length === 0 ? (
        <p className="text-faint italic">—</p>
      ) : (
        <motion.ul
          variants={rosterContainer}
          initial="initial"
          animate="animate"
          className="flex flex-wrap items-baseline gap-x-8 gap-y-2.5"
        >
          {participants.map((p, i) => (
            <motion.li
              key={i}
              variants={rosterItem}
              className="text-fg text-[15px] leading-none cursor-default transition-colors hover:text-accent"
            >
              {p}
            </motion.li>
          ))}
        </motion.ul>
      )}
    </section>
  );
}
