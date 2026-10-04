# Third-party notices

Dependency license collections are generated into ignored `dist/licenses/` during packaging and copied into the release bundle. They are not tracked in the source repository.

mactions embeds its web assets and links Rust dependencies listed in `Cargo.lock`. Their license texts are included in `DEPENDENCY-LICENSES.txt` in release bundles.

The frontend is built with React, TanStack Query, Tailwind CSS, and Vite. Versions are locked in `web/package-lock.json`; license texts for shipped frontend dependencies and the asset build tools are included in `FRONTEND-LICENSES.txt`. Node.js and frontend development tools are not shipped as production services.

The bundled GitHub CLI is distributed under the MIT license. Its official distribution's license and notices are included as `GitHub-CLI-LICENSE`. Source: https://github.com/cli/cli

Source-built Homebrew installations use the separate `gh` formula instead of bundling GitHub CLI. They install the mactions MIT license and generated Rust/frontend dependency notices under Homebrew's shared data directory; `gh` retains its own license files.

GitHub Actions runner packages are downloaded from the official `actions/runner` releases and verified against the release asset's SHA-256 digest. Each runner installation retains the upstream package's license and third-party notices. Source: https://github.com/actions/runner

mactions is an independent project and is not an official GitHub product.
