import { motion } from "motion/react";

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 mt-6 pt-5 border-t border-line">
      {Array.from({ length: totalPages }, (_, i) => {
        const isActive = i === currentPage;
        return (
          <motion.button
            key={i}
            onClick={() => onPageChange(i)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
            className={[
              "font-mono text-[11px] tabular-nums tracking-[0.05em]",
              "px-2.5 py-1.5 rounded-md transition-colors",
              isActive
                ? "text-accent bg-accent/10 font-medium"
                : "text-faint hover:text-fg",
            ].join(" ")}
            aria-label={`עבור לעמוד ${i + 1}`}
            aria-current={isActive ? "page" : undefined}
          >
            {String(i + 1).padStart(2, "0")}
          </motion.button>
        );
      })}
    </div>
  );
}
