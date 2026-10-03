export const views = [
  { value: 'runners', label: 'Runners' },
  { value: 'runs', label: 'Runs' },
] as const;

export type ActivityView = (typeof views)[number]['value'];
