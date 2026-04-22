"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export function AnimatedTabContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduce = useReducedMotion();
  // Key on the last path segment only (e.g. "progress", "scope", "test-checklist")
  // NOT the full pathname — avoids unmounting children on every route change,
  // which would kill Supabase subscriptions and force full refetches.
  const tabKey = pathname.split("/").pop() ?? "progress";

  if (shouldReduce) {
    return <div className="flex-1 overflow-auto p-3 md:p-6">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex-1 overflow-auto p-3 md:p-6"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
