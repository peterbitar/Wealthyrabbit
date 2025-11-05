'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  gradient?: boolean;
}

export default function Card({
  children,
  className = '',
  hoverable = false,
  onClick,
  gradient = false
}: CardProps) {
  const baseClasses = "bg-rabbit-card/80 backdrop-blur-sm border border-rabbit-border rounded-2xl transition-all duration-300 shadow-md shadow-black/20";

  const hoverClasses = hoverable
    ? "cursor-pointer hover:border-rabbit-mint-500/50 hover:shadow-2xl hover:shadow-rabbit-mint-500/20"
    : "";

  const gradientClass = gradient
    ? "bg-gradient-to-br from-rabbit-card/80 via-rabbit-card/60 to-rabbit-border/80"
    : "";

  return (
    <motion.div
      whileHover={hoverable ? { y: -4, scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      onClick={onClick}
      className={`${baseClasses} ${hoverClasses} ${gradientClass} ${className}`}
    >
      {children}
    </motion.div>
  );
}
