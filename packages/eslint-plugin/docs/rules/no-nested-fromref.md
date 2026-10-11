`fromRef(ref)` defers a prop until a sibling's ref is set. R3F resolves it only when it is the
**whole value of a prop** on a three.js element. Inside an array or an object it is never resolved,
and the object receives the marker itself.

When the prop needs the referenced object wrapped, pass a transform: it runs once the ref is set,
and its result is assigned.

#### ❌ Incorrect

```js
<meshPhongNodeMaterial lightsNode={lights([fromRef(lightRef)])} />
```

```js
<orbitControls args={[fromRef(cameraRef)]} />
```

#### ✅ Correct

```js
<spotLight target={fromRef(targetRef)} />
```

```js
<meshPhongNodeMaterial lightsNode={fromRef(lightRef, (light) => lights([light]))} />
```
