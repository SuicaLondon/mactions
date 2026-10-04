// Generate the tap formula from the final release archive, after signing and notarization.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { bundlePath, repo } from './shared/paths.ts';

const defaultOutput = path.join(repo, 'dist/homebrew/Formula/mactions.rb');

function archiveVersion(archive: string) {
  const version = path
    .basename(archive)
    .match(/^mactions-(\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?)-macos-arm64\.tar\.gz$/)?.[1];
  if (!version) throw new Error('Expected a mactions-VERSION-macos-arm64.tar.gz archive');
  const directory = `mactions-${version}-macos-arm64`;
  const entries = execFileSync('/usr/bin/tar', ['-tzf', archive], { encoding: 'utf8' }).split('\n');
  for (const file of ['manifest.json', 'mactions', 'libexec/gh']) {
    if (!entries.includes(`${directory}/${file}`))
      throw new Error(`Release archive is missing ${file}`);
  }
  const manifest: unknown = JSON.parse(
    execFileSync('/usr/bin/tar', ['-xOf', archive, `${directory}/manifest.json`], {
      encoding: 'utf8',
    }),
  );
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !('version' in manifest) ||
    manifest.version !== version ||
    !('arch' in manifest) ||
    manifest.arch !== 'arm64' ||
    !('min_macos' in manifest) ||
    manifest.min_macos !== 12
  )
    throw new Error('Release manifest must match the archive version, arm64, and macOS 12');
  return version;
}

export function generateHomebrewFormula(archive: string, output = defaultOutput) {
  const version = archiveVersion(archive);
  const checksum = createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  const formula = `class Mactions < Formula
  desc "Manage local self-hosted GitHub Actions runners"
  homepage "https://github.com/SuicaLondon/mactions"
  url "https://github.com/SuicaLondon/mactions/releases/download/v${version}/mactions-${version}-macos-arm64.tar.gz"
  version "${version}"
  sha256 "${checksum}"
  license "MIT"

  depends_on arch: :arm64
  depends_on macos: :monterey

  def install
    libexec.install Dir["*"]
    bin.write_exec_script libexec/"mactions"
  end

  service do
    run [opt_bin/"mactions", "serve"]
    keep_alive true
    working_dir Dir.home
    environment_variables HOME: Dir.home,
                          PATH: "#{HOMEBREW_PREFIX}/bin:#{HOMEBREW_PREFIX}/sbin:/usr/bin:/bin:/usr/sbin:/sbin"
    # brew services creates the log directories before launching the manager.
    log_path "#{Dir.home}/.mactions/manager-logs/stdout.log"
    error_log_path "#{Dir.home}/.mactions/manager-logs/stderr.log"
  end

  def caveats
    <<~EOS
      Start the manager now and at login for your current account:
        brew services start mactions
        mactions open

      Update with mactions update, or brew upgrade mactions.
      Runners and data stay in ~/.mactions when this formula is removed.
      Use the installer script on macOS 12-14, where Homebrew is unsupported.
    EOS
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/mactions --version")
    assert_path_exists libexec/"libexec/gh"
    assert_match "gh version", shell_output("#{libexec}/libexec/gh --version")
  end
end
`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, formula);
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 4) throw new Error('Usage: scripts/homebrew.ts [ARCHIVE] [OUTPUT]');
  const archive = path.resolve(process.argv[2] ?? `${bundlePath()}.tar.gz`);
  const output = path.resolve(process.argv[3] ?? defaultOutput);
  console.log(`Created ${generateHomebrewFormula(archive, output)}`);
}
