export const STATUS = {
  NOT_ATTEMPTED: 'not_attempted',
  ANSWERED: 'answered',
  SKIPPED: 'skipped',
  FLAGGED: 'flagged',
  ACTIVE: 'active'
};

export const STATUS_CONFIG = {
  [STATUS.NOT_ATTEMPTED]: { color: 'var(--ink3)', label: 'Not Attempted', bg: 'var(--surface)' },
  [STATUS.ANSWERED]: { color: 'white', label: 'Answered', bg: 'var(--green)' },
  [STATUS.SKIPPED]: { color: 'white', label: 'Skipped', bg: 'var(--amber)' },
  [STATUS.FLAGGED]: { color: 'white', label: 'Flagged', bg: 'var(--red)' },
  [STATUS.ACTIVE]: { color: 'white', label: 'Active', bg: 'var(--accent)' }
};