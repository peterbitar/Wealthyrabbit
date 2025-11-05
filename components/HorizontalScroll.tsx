'use client';

import { ReactNode, useRef } from 'react';
import { motion } from 'framer-motion';

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
  showGradients?: boolean;
}

export default function HorizontalScroll({
  children,
  className = '',
  showGradients = true
}: HorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative group">
      {/* Left gradient fade */}
      {showGradients && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-rabbit-dark to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      {/* Scrollable container */}
      <motion.div
        ref={scrollRef}
        className={`flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>

      {/* Right gradient fade */}
      {showGradients && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-rabbit-dark to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}
