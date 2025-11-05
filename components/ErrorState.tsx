'use client';

import { motion } from 'framer-motion';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 15 }}
        className="text-6xl mb-4"
      >
        😕
      </motion.div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">Oops!</h3>
      <p className="text-gray-400 mb-6 max-w-sm">{message}</p>
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="px-6 py-3 bg-rabbit-mint-500 hover:bg-rabbit-mint-600 text-white rounded-xl font-medium transition-colors"
        >
          Try Again
        </motion.button>
      )}
    </motion.div>
  );
}
