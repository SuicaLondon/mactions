import { useEffect, useState } from 'react';

const debounceMs = 150;

/**
 * Owns the search field text and the query that drives matching. The query follows the text
 * after a short pause; `commit` applies the typed text at once, as Enter does.
 */
export function useLogSearchQuery() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (input === query) return;
    const timer = setTimeout(() => setQuery(input), debounceMs);
    return () => clearTimeout(timer);
  }, [input, query]);

  return {
    input,
    query,
    setInput,
    commit: () => setQuery(input),
    clear: () => {
      setInput('');
      setQuery('');
    },
  };
}
