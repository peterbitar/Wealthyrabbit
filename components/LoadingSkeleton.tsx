import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'circle' | 'button';
  className?: string;
  count?: number;
}

export default function LoadingSkeleton({
  variant = 'card',
  className = '',
  count = 1
}: LoadingSkeletonProps) {
  const baseClasses = "bg-rabbit-border/50 animate-pulse";

  const variantClasses = {
    card: "h-24 rounded-2xl w-full",
    text: "h-4 rounded w-full",
    circle: "h-12 w-12 rounded-full",
    button: "h-12 rounded-xl w-full"
  };

  const items = Array.from({ length: count });

  return (
    <>
      {items.map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 }}
          className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
          <div className="h-full w-full bg-gradient-to-r from-transparent via-rabbit-border/30 to-transparent animate-[shimmer_2s_infinite]" />
        </motion.div>
      ))}
    </>
  );
}
