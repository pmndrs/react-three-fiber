# React Three Test Instance API

## Table of Contents

- [`ReactThreeTestInstance`](#instance)
  - Properties
    - [`instance`](#instance-prop-instance)
    - [`type`](#instance-prop-type)
    - [`props`](#instance-prop-props)
    - [`parent`](#instance-prop-parent)
    - [`children`](#instance-prop-children)
    - [`allChildren`](#instance-prop-allChildren)
  - Methods
    - [`find`](#instance-meth-find)
    - [`findAll`](#instance-meth-findall)
    - [`findByType`](#instance-meth-findbytype)
    - [`findAllByType`](#instance-meth-findallbytype)
    - [`findByProps`](#instance-meth-findbyprops)
    - [`findAllByProps`](#instance-meth-findallbyprops)

---

## `ReactThreeTestInstance` ⚛️

This is an internal class that wraps the elements returned from [`ReactThreeTestRenderer.create`](/packages/test-renderer/markdown/rttr.md#create). It has several properties & methods to enhance the testing experience. Similar to the core API, it closely mirrors the API of [`react-test-renderer`](https://reactjs.org/docs/test-renderer.html).

### `instance` <a id="instance-prop-instance"></a>

```ts
testInstance.instance
```

Returns the instance object of the specific testInstance. This will be the `THREE` initialized class.

### `type` <a id="instance-prop-type"></a>

```ts
testInstance.type
```

Returns the `THREE` type of the test instance, e.g `Scene` or `Mesh`.

### `props` <a id="instance-prop-props"></a>

```ts
testInstance.props
```

Returns an object of the props that are currently being passed to the element. This will include hidden ones such as `attach="geometry"` which are automatically applied in the reconciler.

### `parent` <a id="instance-prop-parent"></a>

```ts
testInstance.parent
```

Returns the parent testInstance of this testInstance. If no parent is available, it will return `null`.

### `children` <a id="instance-prop-children"></a>

```ts
testInstance.children
```

Returns the children test instances of this test instance according to the property `children`, this will not include Geometries, Materials etc.

### `allChildren` <a id="instance-prop-allChildren"></a>

```ts
testInstance.allChildren
```

Returns all the children testInstances of this test instance, this will be as thorough as [`testRenderer.toTree()`](/packages/test-renderer/markdown/rttr.md#create-totree) capturing all react components in the tree.

### `find()` <a id="instance-meth-find"></a>

```ts
testInstance.find(test)
```

Find a single test instance for which `test(testInstance)` returns `true`. If `test(testInstance)` does not return `true` for exactly one test instance it will throw an error.

### `findAll()` <a id="instance-meth-findall"></a>

```ts
testInstance.findAll(test)
```

Finds all test instances for which `test(testInstance)` returns `true`. If no test instances are found, it will return an empty array.

### `findByType()` <a id="instance-meth-findbytype"></a>

```ts
testInstance.findByType(type)
```

Find a single test instance with the provided type. If there is not exactly one test instance with the provided type it will throw an error.

### `findAllByType()` <a id="instance-meth-findallbytype"></a>

```ts
testInstance.findAllByType(type)
```

Finds all test instances with the provided type. If no test instances are found, it will return an empty array.

### `findByProps()` <a id="instance-meth-findbyprops"></a>

```ts
testInstance.findByProps(props)

// Also accepts RegExp matchers
testInstance.findByProps({ [prop]: /^match/i })
```

Find a single test instance with the provided props. If there is not exactly one test instance with the provided props it will throw an error.

### `findAllByProps()` <a id="instance-meth-findallbyprops"></a>

```ts
testInstance.findAllByProps(props)

// Also accepts RegExp matchers
testInstance.findAllByProps({ [prop]: /^matches/i })
```

Finds all test instances with the provided props. If no test instances are found, it will return an empty array.
