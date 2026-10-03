import fs from 'node:fs';
import path from 'node:path';

export function licenseFiles(directory: string, fallback?: string | null): string[] {
  const files = fs.readdirSync(directory).filter((name) => {
    const matches = /^(licen[cs]e|copying|notice)/i.test(name);
    return matches && fs.statSync(path.join(directory, name)).isFile();
  });

  if (!files.length && fallback) files.push(fallback);
  if (!files.length) throw new Error(`Missing license text: ${directory}`);
  return files;
}

export function licenseText(directory: string, files: string[]): string {
  return files
    .map((file) => {
      const content = fs.readFileSync(path.join(directory, file), 'utf8');
      return `\n--- ${file} ---\n${content}\n`;
    })
    .join('');
}

export const noticeSeparator = '='.repeat(72);
