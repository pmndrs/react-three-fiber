This projects relies an on an alias pointing into `../dist/index`, the parent project has to be built previously.

```bash
cd ..
yarn
yarn build
cd examples
yarn
```

from then on:

```bash
yarn start
```