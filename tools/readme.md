# npx react-three-fiber

node helpers, see: https://twitter.com/0xca0a/status/1172183080452464640

## --jsx inputfile [outputfile]

<img src="https://i.imgur.com/U4cWrNN.gif" />

This command turns a GLTF file into a JSX component. This is still experimental and for now draco isn't supported. You could just convert it before you compress it, that would most definitively work.

```bash
npx react-three-fiber@beta --jsx scene.gltf Scene.js
```
