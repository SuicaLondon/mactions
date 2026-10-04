# mactions Homebrew tap

This directory is the template for the separate `SuicaLondon/homebrew-tap` repository. The tap has not been published by adding these files to the mactions repository.

## Install and start

After the tap is published, install the prebuilt Apple Silicon release:

```sh
brew install SuicaLondon/tap/mactions
brew services start mactions
mactions open
```

Run these commands as the current account. `brew services start` starts the manager and registers it to start at login. Installation alone does not start a background service. Existing enabled runners retain their own login services, and stopped runners remain stopped.

mactions requires Apple Silicon and macOS 12 or newer. Homebrew officially supports macOS 15 or newer; use the mactions installer script on macOS 12–14. See the [Homebrew installation requirements](https://docs.brew.sh/Installation#macos-requirements).

## Update and remove

Use `mactions update` or the dashboard's update button. Both delegate Homebrew installations to `brew upgrade mactions` and restart an already running manager. You can also use:

```sh
brew update
brew upgrade mactions
brew services restart mactions
```

The manager restart preserves runners and data. To remove only the manager:

```sh
brew services stop mactions
brew uninstall mactions
```

Runner installations, services, and data remain in `~/.mactions`. Remove individual runners through mactions before uninstalling if needed.

## Prepare the tap

Generate the formula after the release archive has been signed, notarized, and rebuilt with its final bytes:

```sh
node --experimental-strip-types scripts/homebrew.ts dist/mactions-VERSION-macos-arm64.tar.gz
```

The generator validates `manifest.json`, requires the manager and bundled GitHub CLI, computes the archive's SHA-256, and writes `dist/homebrew/Formula/mactions.rb`. It accepts an optional output filename as the second argument. Without arguments it uses the package path from `scripts/shared/paths.ts`.

Copy that `Formula` directory, this README, and `.github/workflows/update.yml` into the separate tap repository. The formula retains the complete release bundle under Homebrew's `libexec` directory and exposes a command wrapper so that the bundled GitHub CLI remains discoverable. The service sets the account's home directory and Homebrew command path explicitly. Homebrew creates the configured log directories before starting the service; its logs are `~/.mactions/manager-logs/stdout.log` and `stderr.log`.

Validate the published tap on a supported Apple Silicon Mac with `brew install SuicaLondon/tap/mactions`, `brew test mactions`, and `brew services start mactions`. Test upgrades and a logout/login cycle before calling the tap ready for users.

## Refresh the formula

The main release workflow publishes a `mactions.rb` asset generated from the final archive. Manually run the tap's **Update mactions formula** workflow after a stable release. It downloads that asset from the latest stable mactions release and commits it using the tap repository's own `GITHUB_TOKEN`. No token with cross-repository write access is needed. The template has no schedule and publishes no mactions release.
