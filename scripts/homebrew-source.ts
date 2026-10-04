// Prepare a core formula from the exact licensed source archive, without publishing a release.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { repo } from './shared/paths.ts';

const defaultOutput = path.join(repo, 'dist/homebrew-core/mactions.rb');

function sourceVersion(archive: string) {
  const entries = execFileSync('/usr/bin/tar', ['-tzf', archive], { encoding: 'utf8' })
    .trim()
    .split('\n');
  const manifests = entries.filter((entry) => /^[^/]+\/Cargo\.toml$/.test(entry));
  if (manifests.length !== 1) throw new Error('Expected one source directory with Cargo.toml');
  const directory = path.posix.dirname(manifests[0]);
  for (const entry of entries) {
    if (!entry.startsWith(`${directory}/`) || entry.split('/').includes('..'))
      throw new Error('Source archive entries must stay inside one directory');
  }
  for (const file of [
    'Cargo.toml',
    'Cargo.lock',
    'LICENSE',
    'build.rs',
    'src/main.rs',
    'src/lib.rs',
    'docs/THIRD-PARTY-NOTICES.md',
    'scripts/frontend-notices.ts',
    'scripts/generate-notices.ts',
    'scripts/notices/licenses.ts',
    'scripts/shared/paths.ts',
    'web/package.json',
    'web/package-lock.json',
    'web/index.html',
    'web/src/main.tsx',
  ]) {
    if (!entries.includes(`${directory}/${file}`))
      throw new Error(`Source archive is missing ${file}`);
  }
  const read = (file: string) =>
    execFileSync('/usr/bin/tar', ['-xOf', archive, `${directory}/${file}`], {
      encoding: 'utf8',
    });
  const manifest = read('Cargo.toml')
    .split(/^\[/m)
    .find((section) => section.startsWith('package]'));
  const version = manifest?.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  if (!version || !/^\d+\.\d+\.\d+$/.test(version))
    throw new Error('Source archive requires a stable package version');
  if (!/^name\s*=\s*"mactions"/m.test(manifest ?? ''))
    throw new Error('Source archive must contain the mactions package');
  if (!/^license\s*=\s*"MIT"/m.test(manifest ?? ''))
    throw new Error('Source Cargo.toml must declare the MIT license');
  const license = read('LICENSE');
  if (
    !license.startsWith('MIT License\n') ||
    !/Copyright \(c\) 20\d{2} SuicaLondon/.test(license) ||
    !license.includes('Permission is hereby granted, free of charge') ||
    !license.includes('THE SOFTWARE IS PROVIDED "AS IS"')
  )
    throw new Error('Source archive requires the SuicaLondon MIT license');
  const frontend: unknown = JSON.parse(read('web/package.json'));
  if (
    !frontend ||
    typeof frontend !== 'object' ||
    !('scripts' in frontend) ||
    !frontend.scripts ||
    typeof frontend.scripts !== 'object' ||
    !('build:assets' in frontend.scripts) ||
    typeof frontend.scripts['build:assets'] !== 'string'
  )
    throw new Error('Source frontend must provide the build:assets script');
  return version;
}

function validatedUrl(source: string, archive: string, version: string) {
  const url = new URL(source);
  const release = `https://github.com/SuicaLondon/mactions/archive/refs/tags/v${version}.tar.gz`;
  if (url.href === release) return release;
  if (
    url.protocol === 'file:' &&
    !url.search &&
    !url.hash &&
    fileURLToPath(url) === path.resolve(archive)
  )
    return url.href;
  throw new Error('Use the matching GitHub tag source URL or the local archive file URL');
}

export function generateHomebrewSourceFormula(
  archive: string,
  source: string,
  output = defaultOutput,
) {
  const version = sourceVersion(archive);
  const url = validatedUrl(source, archive, version);
  const checksum = createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  let versionLine = '';
  if (url.startsWith('file:')) versionLine = `  version "${version}"\n`;
  const formula = `class Mactions < Formula
  desc "Manage local self-hosted GitHub Actions runners"
  homepage "https://github.com/SuicaLondon/mactions"
  url "${url}"
${versionLine}  sha256 "${checksum}"
  license "MIT"

  depends_on "node" => :build
  depends_on "rust" => :build
  depends_on arch: :arm64
  depends_on "gh"
  depends_on macos: :monterey

  def fetch
    system "npm", "--prefix", "web", "ci", "--ignore-scripts", "--no-audit", "--no-fund"
    system "cargo", "fetch", "--locked"
  end

  def install
    system "npm", "--prefix", "web", "run", "build:assets"
    system "node", "--experimental-strip-types", "scripts/frontend-notices.ts"
    system "cargo", "install", *std_cargo_args
    system "node", "--experimental-strip-types", "scripts/generate-notices.ts"
    pkgshare.install "LICENSE", "docs/THIRD-PARTY-NOTICES.md"
    pkgshare.install "dist/licenses/DEPENDENCY-LICENSES.txt", "dist/licenses/FRONTEND-LICENSES.txt"
  end

  service do
    run [opt_bin/"mactions", "serve"]
    keep_alive true
    working_dir Dir.home
    environment_variables HOME: Dir.home, PATH: std_service_path_env
    log_path "#{Dir.home}/.mactions/manager-logs/stdout.log"
    error_log_path "#{Dir.home}/.mactions/manager-logs/stderr.log"
  end

  def caveats
    <<~EOS
      Start the manager now and at login for your current account:
        brew services start mactions
        mactions open

      Runners and data stay in ~/.mactions when this formula is removed.
      Use the installer script on macOS releases unsupported by Homebrew.
    EOS
  end

  test do
    assert_path_exists pkgshare/"LICENSE"
    assert_path_exists pkgshare/"THIRD-PARTY-NOTICES.md"
    assert_path_exists pkgshare/"DEPENDENCY-LICENSES.txt"
    assert_path_exists pkgshare/"FRONTEND-LICENSES.txt"
    data = testpath/"data"
    result = JSON.parse(shell_output("#{bin}/mactions --data-dir #{data} list --local"))
    assert_equal [], result.fetch("runners")
    assert_equal false, result.fetch("operation_running")
    assert_path_exists data
    assert_equal data.realpath.to_s, result.fetch("data_directory")

    port = free_port
    base = "http://127.0.0.1:#{port}"
    pid = fork do
      exec bin/"mactions", "--data-dir", data.to_s, "serve", "--bind", "127.0.0.1:#{port}"
    end
    begin
      curl = "curl -fsS --retry 20 --retry-connrefused --retry-delay 1 --retry-max-time 20 --max-time 2"
      health = JSON.parse(shell_output("#{curl} #{base}/api/manager/health"))
      assert_equal version.to_s, health.fetch("version")
      assert_equal data.realpath.to_s, health.fetch("data_dir")
      assert_equal pid, health.fetch("process_id")

      html = shell_output("curl -fsS --max-time 5 #{base}/")
      assert_match 'id="root"', html
      assets = html.scan(%r{(?:src|href)="(/assets/[^"]+\\.(?:js|css))"}).flatten
      assert assets.any? { |asset| asset.end_with?(".js") }
      assert assets.any? { |asset| asset.end_with?(".css") }
      assets.each do |asset|
        assert_match(/\\S/, shell_output("curl -fsS --max-time 5 #{base}#{asset}"))
      end
    ensure
      Process.kill("TERM", pid)
      Process.wait(pid)
    end
  end
end
`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, formula);
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length < 4 || process.argv.length > 5)
    throw new Error('Usage: scripts/homebrew-source.ts ARCHIVE SOURCE_URL [OUTPUT]');
  const archive = path.resolve(process.argv[2]);
  const output = path.resolve(process.argv[4] ?? defaultOutput);
  console.log(`Created ${generateHomebrewSourceFormula(archive, process.argv[3], output)}`);
}
