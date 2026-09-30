export const REVISION_CATEGORIES = [
  'Runtime Error',
  'Missing Edge Case',
  'UI / Layout Defect',
  'Test Failure',
] as const;

export type RevisionCategory = (typeof REVISION_CATEGORIES)[number];
