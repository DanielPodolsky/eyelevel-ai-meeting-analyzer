import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";
const STORAGE_KEY = "eyelevel-theme";

function readSavedTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return "dark"; // Editorial Quietude is dark-first by design intent.
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readSavedTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <motion.button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 24 }}
      className="fixed top-5 left-5 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card/80 backdrop-blur-md text-fg hover:border-line-strong transition-colors"
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          // Moon icon — currently dark mode, click to go light
          <motion.svg
            key="moon"
            initial={{ rotate: -45, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 45, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M13 9.5A6 6 0 0 1 6.5 3a.5.5 0 0 0-.7-.45A6 6 0 1 0 13.45 10.2a.5.5 0 0 0-.45-.7Z" />
          </motion.svg>
        ) : (
          // Sun icon — currently light mode, click to go dark
          <motion.svg
            key="sun"
            initial={{ rotate: 45, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -45, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1.5v1.5M8 13v1.5M14.5 8H13M3 8H1.5M12.6 3.4l-1 1M4.4 11.6l-1 1M12.6 12.6l-1-1M4.4 4.4l-1-1" />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
