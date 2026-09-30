#!/usr/bin/env bash
#
# Builds one docs site with the @pmndrs/docs CLI -- the same invocation as
# pmndrs/docs/.github/workflows/build.yml@v4, which cannot be reused directly: it always builds the
# checked-out ref and takes its source/edit links from it, while this workflow builds two refs.
#
#   .github/docs/build.sh <docs dir> <out dir>
#
# The static export lands directly in <out dir>. Everything else (BASE_PATH, NEXT_PUBLIC_*, THEME_*,
# CONTRIBUTORS_PAT...) is read from the environment, and DOCS_VERSION picks the CLI release.

set -euo pipefail

npx -y "@pmndrs/docs@$DOCS_VERSION" build "$1" "$2" --format website
