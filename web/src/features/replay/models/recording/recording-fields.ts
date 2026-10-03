import { isValid, parseISO } from 'date-fns';

export function invalid(field: string): never {
  throw new Error(`Invalid recording: ${field}.`);
}

export function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid(field);
  return value as Record<string, unknown>;
}

export function text(value: unknown, field: string): string {
  if (typeof value === 'string') return value;
  return invalid(field);
}

export function integer(value: unknown, field: string, minimum = 1): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum) return value;
  return invalid(field);
}

export function array(value: unknown, field: string): unknown[] {
  if (Array.isArray(value)) return value;
  return invalid(field);
}

export function date(value: unknown, field: string): string {
  const result = text(value, field);
  if (isValid(parseISO(result))) return result;
  return invalid(field);
}

export function optionalDate(value: unknown, field: string): string | null {
  if (value == null) return null;
  return date(value, field);
}

export function githubURL(value: unknown, field: string): string {
  const result = text(value, field);
  try {
    const url = new URL(result);
    if (
      url.protocol === 'https:' &&
      url.hostname === 'github.com' &&
      !url.port &&
      !url.username &&
      !url.password
    )
      return url.href;
  } catch {
    /* Invalid URLs are rejected below. */
  }
  return invalid(`${field} must be an HTTPS GitHub link`);
}

export function nullableText(value: unknown, field: string): string | null {
  if (value == null) return null;
  return text(value, field);
}

export function optionalInteger(value: unknown, field: string): number | null {
  if (value == null) return null;
  return integer(value, field);
}

export function optionalGithubURL(value: unknown, field: string): string | null {
  if (value == null) return null;
  return githubURL(value, field);
}
