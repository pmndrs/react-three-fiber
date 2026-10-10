<!-- Thanks for the PR! Keep what helps a reviewer, delete what doesn't apply. -->

## What

<!-- What changes, and why. Link the issue: "Fixes #123". -->

## How

<!-- The approach, and anything a reviewer should look at closely. Skip for small changes. -->

## Testing

<!-- How you verified it: tests added, an example run, a sandbox or screenshot for visual changes. -->

## Checklist

- [ ] Targets the right branch: `master` for v9, `v10` for v10
- [ ] Tests cover the change, or the PR says why they can't
- [ ] `test`, `typecheck` and `eslint` pass locally
- [ ] Docs updated if public API or behaviour changed
- [ ] Release notes: a changeset on `master` (`yarn changeset:add`), an entry in `CHANGELOG-ALPHA.md` on `v10`
