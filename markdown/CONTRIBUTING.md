# Publishing

We use [`changesets`](https://github.com/atlassian/changesets) to publish our package now.

## Simple release

You want to release some new features that haven't been released yet:

```shell
yarn changeset:add
```

Follow the prompt to flag which packages need to update although with `pmndrs` we keep all our packages at the same version.

Then you'll run:

```shell
yarn vers
```

This will update all the packages correctly according to what version you just set with the `add` script & possibly update the deps within those packages.

Finally:

```shell
yarn release
```

This will build the packages, publish them & push the tags to github to signify a new release. Please then update the `releases` on github & the changelog on `react-spring.io`

## Prerelease

Everything above applies but you must first run:

```shell
yarn changeset pre enter beta | alpha | next
```

If you find you're stuck in a prerelease and trying to do a Simple Release, try running:

```shell
yarn changeset pre exit
```
