"use client";

import { motion } from "framer-motion";

interface TimeFilterProps {
  activeTime: string;
  onTimeChange: (time: string) => void;
}

export default function TimeFilter({ activeTime, onTimeChange }: TimeFilterProps) {
  const timeOptions = ["Today", "This Week", "This Month", "All Time"];

  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs text-gray-500">Time:</span>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {timeOptions.map((time, index) => (
          <motion.button
            key={time}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onTimeChange(time)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeTime === time
                ? "bg-rabbit-lavender-500/20 text-rabbit-lavender-300 border border-rabbit-lavender-500/50"
                : "bg-rabbit-card/50 text-gray-500 border border-rabbit-border/50 hover:border-rabbit-border hover:text-gray-400"
            }`}
          >
            {time}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
