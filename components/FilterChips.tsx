"use client";

import { motion } from "framer-motion";

interface FilterChipsProps {
  filters: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export default function FilterChips({ filters, activeFilter, onFilterChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {filters.map((filter, index) => (
        <motion.button
          key={filter}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onFilterChange(filter)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeFilter === filter
              ? "bg-rabbit-mint-500/20 text-rabbit-mint-400 border border-rabbit-mint-500/50"
              : "bg-rabbit-card text-gray-400 border border-rabbit-border hover:border-rabbit-border/80 hover:text-gray-300"
          }`}
        >
          {filter}
        </motion.button>
      ))}
    </div>
  );
}
