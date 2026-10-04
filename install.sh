#!/bin/sh
# Install a verified manager bundle for the current macOS account.
set -eu
umask 077

fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }
usage() {
  printf '%s\n' 'Usage: sh install.sh [--no-open] [--no-start] [--version X.Y.Z] [--archive FILE.tar.gz]'
}

version=''
archive=''
no_open=false
no_start=false
while [ "$#" -gt 0 ]; do
  case "$1" in
    --no-open) no_open=true; shift ;;
    --no-start) no_start=true; no_open=true; shift ;;
    --version|--archive)
      option=$1
      [ "$#" -ge 2 ] || fail "$option requires a value"
      case "$option" in
        --version) version=$2 ;;
        --archive) archive=$2 ;;
      esac
      shift 2
      ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; fail "Unknown option: $1" ;;
  esac
done

valid_version() { printf '%s\n' "$1" | /usr/bin/awk '/^[0-9]+\.[0-9]+\.[0-9]+$/ { found=1 } END { exit !found }'; }
[ -z "$version" ] || valid_version "$version" || fail 'Use a stable version such as 0.2.0'
[ "$(/usr/bin/uname -s)" = Darwin ] || fail 'mactions requires macOS'
[ "$(/usr/bin/uname -m)" = arm64 ] || [ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null || true)" = 1 ] || fail 'This release requires an Apple Silicon Mac'
macos_major=$(/usr/bin/sw_vers -productVersion | /usr/bin/cut -d . -f 1)
[ "$macos_major" -ge 12 ] || fail 'mactions requires macOS 12 or later'
[ "$(/usr/bin/id -u)" -ne 0 ] || fail 'Run this installer as your macOS account, without sudo'
[ -n "${HOME:-}" ] && [ -d "$HOME" ] || fail 'HOME must be an existing account directory'

base=$HOME/.local/share/mactions
binary_link=$HOME/.local/bin/mactions
existing=false
json_value() { /usr/bin/plutil -extract "$2" raw -o - "$1"; }
if [ -e "$base" ] || [ -L "$base" ]; then
  [ -d "$base" ] && [ ! -L "$base" ] || fail 'The installation path is not an owned directory'
  [ "$(/usr/bin/stat -f %u "$base")" = "$(/usr/bin/id -u)" ] || fail 'The installation belongs to another account'
  [ -f "$base/install.json" ] && [ ! -L "$base/install.json" ] || fail 'Refusing to overwrite an unrelated installation directory'
  [ "$(json_value "$base/install.json" schema)" = 1 ] && [ "$(json_value "$base/install.json" source)" = script ] || fail 'The installation marker is invalid'
  [ -L "$base/current" ] && [ -x "$base/current/mactions" ] || fail 'The managed installation has no current executable'
  current_target=$(/usr/bin/readlink "$base/current")
  case "$current_target" in
    releases/*) current_version=${current_target#releases/}; valid_version "$current_version" || fail 'Invalid current release link' ;;
    *) fail 'The current release link points outside this installation' ;;
  esac
  [ ! -L "$base/releases" ] && [ ! -L "$base/releases/$current_version" ] || fail 'The managed release directory is a symbolic link'
  existing=true
fi
for homebrew_prefix in /opt/homebrew /usr/local; do
  [ ! -e "$homebrew_prefix/opt/mactions" ] || fail 'mactions is installed with Homebrew; use brew upgrade mactions'
done
if [ -e "$binary_link" ] || [ -L "$binary_link" ]; then
  [ -L "$binary_link" ] && [ "$(/usr/bin/readlink "$binary_link")" = "$base/current/mactions" ] || fail 'Refusing to overwrite an unrelated ~/.local/bin/mactions'
fi
found_binary=$(command -v mactions 2>/dev/null || true)
if [ -n "$found_binary" ]; then
  case "$found_binary" in
    "$binary_link"|"$base/current/mactions") ;;
    *) fail "Another mactions installation is on PATH: $found_binary" ;;
  esac
fi

temporary=$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/mactions-install.XXXXXX")
staged=''
cleanup() {
  /bin/rm -rf "$temporary"
  if [ -n "$staged" ]; then /bin/rm -rf "$staged"; fi
}
trap cleanup EXIT HUP INT TERM

download() {
  /usr/bin/curl --fail --location --proto '=https' --proto-redir '=https' --connect-timeout 10 --max-time 180 --silent --show-error "$1" -o "$2"
}
if [ "$existing" = true ] && [ -z "$archive" ] && [ -z "$version" ]; then
  "$base/current/mactions" update
else
  if [ -z "$archive" ]; then
    if [ -z "$version" ]; then
      download 'https://api.github.com/repos/SuicaLondon/mactions/releases/latest' "$temporary/release.json"
      tag=$(json_value "$temporary/release.json" tag_name)
      version=${tag#v}
      valid_version "$version" || fail 'GitHub did not return a stable release version'
    fi
    filename=mactions-$version-macos-arm64.tar.gz
    archive=$temporary/$filename
    release_url=https://github.com/SuicaLondon/mactions/releases/download/v$version
    download "$release_url/$filename" "$archive"
    download "$release_url/$filename.sha256" "$archive.sha256"
  fi
  [ -f "$archive" ] && [ -f "$archive.sha256" ] || fail 'The archive and its adjacent .sha256 file are required'
  expected=$(/usr/bin/awk -v name="$(/usr/bin/basename "$archive")" 'NR==1 && NF==2 && $2==name && length($1)==64 && $1 !~ /[^0-9a-fA-F]/ { print tolower($1) }' "$archive.sha256")
  actual=$(/usr/bin/shasum -a 256 "$archive" | /usr/bin/awk '{print $1}')
  [ -n "$expected" ] && [ "$expected" = "$actual" ] || fail 'Archive SHA-256 checksum mismatch; installation was not changed'
  /usr/bin/tar -tf "$archive" > "$temporary/entries"
  first=$(/usr/bin/sed -n '1p' "$temporary/entries")
  bundle=${first%%/*}
  case "$bundle" in
    mactions-*-macos-arm64) archive_version=${bundle#mactions-}; archive_version=${archive_version%-macos-arm64} ;;
    *) fail 'The archive has an unexpected bundle directory' ;;
  esac
  valid_version "$archive_version" || fail 'The archive version is invalid'
  [ -z "$version" ] || [ "$version" = "$archive_version" ] || fail 'The requested version does not match the archive'
  version=$archive_version
  while IFS= read -r entry; do
    case "$entry" in
      *[!a-zA-Z0-9._/-]*|/*|*/../*|*/..|*/./*|*/.) fail "Unsafe archive path: $entry" ;;
    esac
    case "$entry" in
      "$bundle"|"$bundle/"|"$bundle/"*) ;;
      *) fail "Archive path is outside the bundle: $entry" ;;
    esac
  done < "$temporary/entries"
  /usr/bin/tar -tvf "$archive" > "$temporary/types"
  /usr/bin/awk '(substr($0,1,1)!="-" && substr($0,1,1)!="d") || index($0," link to ") || index($0," -> ") { bad=1 } END { exit bad }' "$temporary/types" || fail 'Archive links and special files are not allowed'
  /usr/bin/tar -xzf "$archive" -C "$temporary"
  extracted=$temporary/$bundle
  [ -x "$extracted/mactions" ] && [ -x "$extracted/libexec/gh" ] && [ -f "$extracted/manifest.json" ] || fail 'The bundle lacks mactions, bundled gh, or manifest.json'
  [ "$(json_value "$extracted/manifest.json" version)" = "$version" ] && [ "$(json_value "$extracted/manifest.json" arch)" = arm64 ] && [ "$(json_value "$extracted/manifest.json" min_macos)" = 12 ] || fail 'The compatibility manifest does not match this release'
  reported=$("$extracted/mactions" --version) || fail 'The manager executable could not run on this Mac; installation was not changed'
  [ "$reported" = "mactions $version" ] || fail 'The manager executable version does not match the manifest; installation was not changed'
  "$extracted/libexec/gh" --version >/dev/null || fail 'The bundled GitHub CLI could not run on this Mac; installation was not changed'
  if [ "$existing" = true ]; then
    [ "$current_version" = "$version" ] || fail 'A managed installation already exists. Run mactions update to change its version'
  else
    /bin/mkdir -p "$HOME/.local/share"
    staged=$(/usr/bin/mktemp -d "$HOME/.local/share/.mactions-install.XXXXXX")
    /bin/mkdir "$staged/releases"
    /bin/cp -R "$extracted" "$staged/releases/$version"
    printf '%s\n' '{"schema":1,"source":"script"}' > "$staged/install.json"
    /bin/ln -s "releases/$version" "$staged/current"
    /bin/mv "$staged" "$base"
    staged=''
  fi
fi

/bin/mkdir -p "$HOME/.local/bin"
if [ ! -L "$binary_link" ]; then /bin/ln -s "$base/current/mactions" "$binary_link"; fi
case "${SHELL:-/bin/zsh}" in
  */bash|bash) profile=$HOME/.bash_profile ;;
  *) profile=$HOME/.zshrc ;;
esac
start_marker='# >>> mactions PATH >>>'
end_marker='# <<< mactions PATH <<<'
if [ -f "$profile" ] && /usr/bin/grep -Fqx "$start_marker" "$profile"; then
  /usr/bin/grep -Fqx "$end_marker" "$profile" || fail 'The existing mactions PATH block is incomplete'
else
  printf '\n%s\n%s\n%s\n' "$start_marker" 'export PATH="$HOME/.local/bin:$PATH"' "$end_marker" >> "$profile"
fi

"$base/current/mactions" service install
if [ "$no_start" = false ]; then "$base/current/mactions" service start; fi
if [ "$no_open" = false ]; then
  if /bin/launchctl print "gui/$(/usr/bin/id -u)" >/dev/null 2>&1; then
    "$base/current/mactions" open
  else
    printf '%s\n' 'The dashboard will start at the next macOS login. Run mactions open after logging in.'
  fi
fi
printf '%s\n' 'mactions is installed. Open a new terminal to use the mactions command.'
