/** Trims a message and ends it with a period unless it already ends with `.`, `!` or `?`. */
export function sentence(message: string) {
  const text = message.trim();
  if (!text || /[.!?]$/u.test(text)) return text;
  return `${text}.`;
}
