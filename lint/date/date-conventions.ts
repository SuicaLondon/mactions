import type { Linter } from 'eslint';

export default {
  'no-restricted-properties': [
    'error',
    { object: 'Date', property: 'parse', message: 'Use date-fns parseISO to parse timestamps.' },
    { object: 'Date', property: 'UTC', message: 'Use date-fns with the UTC context.' },
    {
      object: 'Date',
      property: 'now',
      message: 'Use the shared date-fns currentDate helper for clock reads.',
    },
    { property: 'toISOString', message: 'Use the shared date-fns formatUtcTimestamp helper.' },
    { property: 'toLocaleString', message: 'Use date-fns intlFormat or the shared date helpers.' },
    { property: 'toLocaleDateString', message: 'Use date-fns intlFormat or formatShortDate.' },
    { property: 'toLocaleTimeString', message: 'Use date-fns intlFormat or formatTime.' },
    { property: 'toDateString', message: 'Use date-fns to format dates.' },
    { property: 'toTimeString', message: 'Use date-fns to format times.' },
    { property: 'toUTCString', message: 'Use date-fns with the UTC context.' },
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: "NewExpression[callee.name='Date']",
      message: 'Use date-fns parseISO, toDate, or the shared currentDate helper.',
    },
    {
      selector: "CallExpression[callee.name='Date']",
      message: 'Use date-fns to format dates or the shared currentDate helper for clock reads.',
    },
  ],
} satisfies Linter.RulesRecord;
