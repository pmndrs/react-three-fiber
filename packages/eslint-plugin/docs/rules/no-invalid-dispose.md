R3F disposes an object's GPU resources when it unmounts. `dispose={null}` is the only value that
opts out: `dispose={false}`, `dispose`, `dispose={true}` and other literals are ignored, and the
object is disposed as usual. That is easy to miss, since `false` reads like "don't dispose".

This rule reports literal `dispose` values other than `null` on three.js elements, and fixes
`dispose={false}` to `dispose={null}`.

#### ❌ Incorrect

```js
<mesh geometry={sharedGeometry} dispose={false} />
```

#### ✅ Correct

```js
<mesh geometry={sharedGeometry} dispose={null} />
```
