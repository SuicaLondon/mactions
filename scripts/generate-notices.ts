// Developer utility: resolve locked dependencies and collect their license texts.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { repo } from './lib.ts';
process.chdir(repo);
const triple = process.arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin';
interface CargoPackage {
  name: string; version: string; manifest_path: string;
  source: string | null; license_file: string | null; license: string | null; repository: string | null;
}
const metadata: { packages: CargoPackage[] } = JSON.parse(execFileSync('cargo', ['metadata','--locked','--format-version','1','--filter-platform',triple], {encoding:'utf8', maxBuffer:16*1024*1024}));
let text = 'mactions dependency license texts\nGenerated from Cargo.lock; includes build and test dependencies.\n';
for (const pkg of metadata.packages.filter(p => p.source).sort((a,b) => a.name.localeCompare(b.name))) {
  const root = path.dirname(pkg.manifest_path);
  const files = fs.readdirSync(root).filter(name => /^(licen[cs]e|copying|notice)/i.test(name) && fs.statSync(path.join(root,name)).isFile());
  if (!files.length && pkg.license_file) files.push(pkg.license_file);
  if (!files.length) throw new Error(`No license file for ${pkg.name}; review before distributing`);
  text += `\n${'='.repeat(72)}\n${pkg.name} ${pkg.version}\nLicense: ${pkg.license || 'See included license'}\nSource: ${pkg.repository || pkg.source}\n`;
  for (const file of files) text += `\n--- ${file} ---\n${fs.readFileSync(path.join(root,file),'utf8')}\n`;
}
fs.writeFileSync('docs/DEPENDENCY-LICENSES.txt',text);
console.log('Wrote docs/DEPENDENCY-LICENSES.txt');
