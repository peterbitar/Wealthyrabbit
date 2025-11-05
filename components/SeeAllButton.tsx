'use client';

import { motion } from 'framer-motion';

interface SeeAllButtonProps {
  count?: number;
  onClick?: () => void;
  className?: string;
}

export default function SeeAllButton({ count, onClick, className = '' }: SeeAllButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, x: 2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`text-xs font-medium text-rabbit-mint-400 hover:text-rabbit-mint-300 transition-colors flex items-center gap-1 ${className}`}
    >
      <span>See All</span>
      {count !== undefined && count > 0 && (
        <span className="px-1.5 py-0.5 bg-rabbit-mint-500/10 rounded text-rabbit-mint-400">
          {count}
        </span>
      )}
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </motion.button>
  );
}
