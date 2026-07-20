import { motion } from 'motion/react';
import React from 'react';

interface TaskEmptyStateProps {
  hasActiveFilters: boolean;
}

export default function TaskEmptyState({ hasActiveFilters }: TaskEmptyStateProps) {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="py-16 text-center text-xs text-text-muted"
    >
      {hasActiveFilters
        ? 'No tasks match the current filters.'
        : 'No records match current parameters.'}
    </motion.div>
  );
}
