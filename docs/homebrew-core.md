# Homebrew core preparation

mactions is preparing a source-built formula for `Homebrew/homebrew-core`. This does not publish the separate tap, create a release, or make `brew install mactions` available to new users. The existing [tap template](../homebrew/README.md) continues to distribute the prebuilt, signed Apple Silicon bundle.

The project uses the [MIT license](../LICENSE), with copyright attributed to `2026 SuicaLondon`. The current preparation has not been included in a new public release; the existing `v0.2.0` source tag does not contain it. A public formula must use a new immutable licensed release and its actual checksum.

## Source formula

Generate a formula from a source archive and the URL identifying those exact bytes:

```sh
npm run homebrew:source -- SOURCE_ARCHIVE SOURCE_URL [OUTPUT]
```

The default output is `dist/homebrew-core/mactions.rb`. The generator checks the archive's Cargo version, MIT license, source files, and frontend lockfile, then computes SHA-256. A local `file://` URL is accepted for validation. A public formula uses the canonical GitHub version-tag archive URL; do not substitute a moving branch or use a local archive's checksum for different public bytes.

The formula declares Rust and Node.js as build dependencies and GitHub CLI (`gh`) as a runtime dependency. It does not bundle `gh`. Its fetch phase installs the locked frontend dependencies and fetches locked Cargo dependencies. Its install phase builds the static frontend, compiles Rust offline, and installs the MIT license plus the existing Rust/frontend dependency notices. `web`'s `build:assets` command builds production assets without requiring the repository's root Git-hook toolchain; normal project validation still runs the full checks.

The supported product remains Apple Silicon and macOS 12 or newer. The formula declares ARM64, macOS, and Monterey requirements. Homebrew's supported host versions and its dependency requirements can have a higher floor; use the prebuilt installer on macOS 12–14. Only a Homebrew CI build and test matrix establishes which Homebrew configurations work.

Homebrew owns manager upgrades. Source-built Homebrew installations direct users to `brew upgrade mactions`; the application's update action delegates to Homebrew instead of replacing its executable with a downloaded release bundle. Start its optional login service with `brew services start mactions` after installation.

## Validate the current checkout

Use a supported Apple Silicon Mac without an existing Homebrew `mactions` installation. These commands install declared Homebrew build dependencies and a temporary manager keg; `--skip-link` avoids replacing the user's command symlink. They do not start a launchd service, register a runner, or authorize GitHub.

From the repository root, create an archive of tracked and non-ignored source files, including the new license:

```sh
validation_dir=$(mktemp -d /private/tmp/mactions-core.XXXXXX)
source_archive="$validation_dir/mactions-source.tar.gz"
mkdir "$validation_dir/mactions-source"
git ls-files --cached --others --exclude-standard -z |
  COPYFILE_DISABLE=1 tar --null -T - -cf - |
  tar -xf - -C "$validation_dir/mactions-source"
COPYFILE_DISABLE=1 tar -czf "$source_archive" -C "$validation_dir" mactions-source
npm run homebrew:source -- "$source_archive" "file://$source_archive" "$validation_dir/mactions.rb"
```

This archive validates the checkout's source build. It is not a published release artifact. Keep Homebrew's downloads, build directories, and temporary formula trust in this task's directory:

```sh
export HOMEBREW_CACHE="$validation_dir/cache"
export HOMEBREW_TEMP="$validation_dir/tmp"
export HOMEBREW_XDG_CONFIG_HOME="$validation_dir/config"
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1
mkdir -p "$HOMEBREW_CACHE" "$HOMEBREW_TEMP"

validation_tap="suicalondon/mactions-validation-$(date +%s)"
brew tap-new --no-git "$validation_tap"
cp "$validation_dir/mactions.rb" "$(brew --repository "$validation_tap")/Formula/mactions.rb"
brew trust --formula "$validation_tap/mactions"
brew install --build-from-source --skip-link "$validation_tap/mactions"
brew test --force "$validation_tap/mactions"
brew audit --strict "$validation_tap/mactions"
brew style --formula "$validation_tap/mactions"
```

The formula test uses a temporary HOME and data directory. It checks the offline runner list, starts the installed manager on an unused loopback port, verifies version/data-directory/PID health, and fetches its embedded page and referenced JavaScript/CSS assets. It always terminates its test process. It does not exercise real runner registration, login/reboot services, or GitHub authorization.

Homebrew 7 audits formula names from a tap; `brew audit /path/mactions.rb` is disabled. The temporary tap's strict audit checks formula implementation, but skips some core-only acceptance checks. Do not call a successful temporary-tap audit official approval, or disable audit rules to hide remaining gates.

The pull-request [CI workflow](../.github/workflows/ci.yml) runs this native source-install validation after the project checks on Apple Silicon macOS 15. It archives the checked-out commit, generates a formula in a unique temporary tap, resolves normal Homebrew dependencies, and runs style, source installation, the installed functional test, and strict audit. Downloads and trust are isolated, linking and login services are skipped, and an exit handler removes the test keg, tap, and temporary files. Adding this step does not establish that its first CI run has passed; inspect the workflow result for the tested commit.

After recording results, remove only the validation keg and tap. Retain installed build dependencies; review them separately before removing any tools:

```sh
HOMEBREW_NO_AUTOREMOVE=1 brew uninstall "$validation_tap/mactions"
brew untap "$validation_tap"
rm -rf -- "$validation_dir"
unset HOMEBREW_CACHE HOMEBREW_TEMP HOMEBREW_XDG_CONFIG_HOME
unset HOMEBREW_NO_AUTO_UPDATE HOMEBREW_NO_INSTALL_CLEANUP HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK
```

## Prepare a public submission later

After publishing a new stable version containing this preparation, download the canonical source archive and generate its formula. Replace `X.Y.Z` with that actual release version:

```sh
version=X.Y.Z
source_url="https://github.com/SuicaLondon/mactions/archive/refs/tags/v$version.tar.gz"
source_archive="dist/mactions-$version-source.tar.gz"
mkdir -p dist
curl -fL "$source_url" -o "$source_archive"
npm run homebrew:source -- "$source_archive" "$source_url"
```

Copy the generated formula into a current `homebrew/core` contribution checkout at `Formula/m/mactions.rb`, then run the full official checks against that public archive:

```sh
HOMEBREW_NO_INSTALL_FROM_API=1 brew install --build-from-source mactions
brew test mactions
brew audit --strict --new --online mactions
brew style --formula mactions
brew lgtm --online
```

Remaining gates are public interest and repository age, a licensed stable release with its fixed source URL/checksum, supported-platform CI, and maintainer review. Homebrew normally requires an owner self-submission to have at least 225 stars, 90 forks, or 90 watchers, and a repository at least 30 days old. Explicit platform restrictions can be eligible, but do not guarantee acceptance.

Before submitting, review the current [package acceptance policy](https://docs.brew.sh/Package-Acceptance-Policy), [acceptable formula requirements](https://docs.brew.sh/Acceptable-Formulae), and [contribution workflow](https://docs.brew.sh/How-To-Open-a-Homebrew-Pull-Request). The contribution workflow requires disclosure and human review of AI-assisted work, and maintainer replies must be written by the submitter without AI assistance.
