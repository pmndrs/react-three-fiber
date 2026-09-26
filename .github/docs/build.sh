#!/usr/bin/env bash
#
# Builds one docs site with the pmndrs/docs image -- the same invocation as
# pmndrs/docs/.github/workflows/build.yml@v3, which cannot be reused directly: it always builds the
# checked-out ref and takes its source/edit links from it, while this workflow builds two refs.
#
#   .github/docs/build.sh <docs dir>
#
# Output lands in <docs dir>/out$BASE_PATH. Everything else is passed through from the environment.

set -euo pipefail

DOCS_DIR="$1"

docker run --rm --init \
  -v "$PWD/$DOCS_DIR":/app/docs \
  -e MDX=docs \
  -e DIST_DIR="docs/out$BASE_PATH" \
  -e OUTPUT=export \
  -e NEXT_PUBLIC_LIBNAME \
  -e NEXT_PUBLIC_LIBNAME_SHORT \
  -e NEXT_PUBLIC_LIBNAME_DOTSUFFIX_LABEL \
  -e NEXT_PUBLIC_LIBNAME_DOTSUFFIX_HREF \
  -e BASE_PATH \
  -e HOME_REDIRECT \
  -e MDX_BASEURL \
  -e SOURCECODE_BASEURL \
  -e EDIT_BASEURL \
  -e NEXT_PUBLIC_URL \
  -e ICON \
  -e LOGO \
  -e GITHUB \
  -e DISCORD \
  -e THEME_PRIMARY \
  -e THEME_SCHEME \
  -e THEME_CONTRAST \
  -e THEME_NOTE \
  -e THEME_TIP \
  -e THEME_IMPORTANT \
  -e THEME_WARNING \
  -e THEME_CAUTION \
  -e CONTRIBUTORS_PAT \
  "ghcr.io/pmndrs/docs:$DOCS_IMAGE_TAG" pnpm run build
