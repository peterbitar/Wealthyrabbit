'use client';

import { motion } from 'framer-motion';

interface PercentageBadgeProps {
  value: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PercentageBadge({
  value,
  showIcon = true,
  size = 'md',
  className = ''
}: PercentageBadgeProps) {
  const isPositive = value >= 0;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const baseClasses = isPositive
    ? 'bg-rabbit-success/20 text-rabbit-success border border-rabbit-success/30'
    : 'bg-rabbit-error/20 text-rabbit-error border border-rabbit-error/30';

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClasses[size]} ${baseClasses} ${className}`}
    >
      {showIcon && (
        <span className="text-xs">
          {isPositive ? '▲' : '▼'}
        </span>
      )}
      <span>
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </span>
    </motion.div>
  );
}
