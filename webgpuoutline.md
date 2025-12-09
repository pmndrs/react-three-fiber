# R3F Web GPU Upgrade

# Overview

The primary goals are to bring r3f inline with the upstream threejs webGPUREnderer and TSL usage.

The challenges rank from trivial to critical but most of the things can be resolved easily.

At the same time we are going to solve some longer legacy issues and API changes that need to be made.

The 3 groups of issues are **Imports, Renderer, and Extras**.

## Imports

Currently all imports use the root `/three` space. But with types and modules for webGPU they actually need to come from `/three/webgpu.` What we’ve decided to do for Drei as well is follow suite and split the system into sub packages.

One issue that has lost traction upstream is the confusion around the name of the new Renderer. Instead of calling it “Renderer” they call it “WebGPURenderer” when in actuality it has multiple “backends” and can be anything. The new renderer which supports TSL can be WebGL. But people get confused on what is the WebGL renderer and what is the WebGPURender with a WebGL backend.
To avoid this confusion internally we will call the WebGLRenderer “legacy” and the new flow that supports TSL “renderer” with the one exception being the webGPU import path to match other libraries.

### Types:

~~Instead of types being in the root folder, we move them to a root folder with a declare statement (makes them available throughout repo)~~

Different import paths will have to handle extension automatically based on import paths

### Internally:

We make a “core” folder for items that can easily be switched by changing the import

We make webGPU and legacy folders for things that can only exist in those directories

docs could also support this structure and works well with JSDocs type flows (See three and drei)

### Externally:

A chhallenge is how three is handling its exports.
For core three we used to be able to do `import * as THREE from 'three';` This now includes ThreeCore as well as ThreeWebGL exports.
When we import from `three/webgpu` it exports ThreeCore and ThreeWebGPU.

This means many, many, many systems that import from root `three` will also get the WebGL related objects. This is a few mb extra in size which in size critical apps has been pointed out as an issue.

- Root: The root system will support both import paths (both are bundled) the default will be WebGPU but can be switched to legacy by using `gl` in the canvas. This will throw a depreciation warning and point people to use the `legacy` import if they want it and that in future versions the gl import wont be included at root. usage of `gl` anywhere (including the useThree hooks) will also throw.
- **Legacy:** The legacy import will work as the current one does using the webGLRenderer and the `gl` usage wont be flagged
- **WebGPU:** To match other libraries (three, drei, etc) we will also have a `/webgpu` path that does not include the core webGLRenderer. Usage of `gl` will throw errors as its expected you plan on using only webGPU and trying to access it with old code should be refactored. If you want to be lazy you can use root while it still supports it.
- **Other paths:** Native, XR, etc will pull in the same way.

## **Renderer**

The largest change is the renderer and the api to access it. Top Level await means you cant touch things until its ready. Usage in hooks etc should be ready to handle this.

The other thing is for some reason the renderer was accessed as “gl” in the existing canvas. My assumption is this is to avoid confusion for React focused devs and the react renderer. This is super confusing for three devs though and we will reorient.

The renderer will now be accessed with `renderer` like: `<Canvas renderer />` `const { renderer } = useThree()` etc.

Using `gl`will still be supported on the root import but will throw depreciation warnings.

We should be clear too when binding a backend. `<Canvas webgl />` for a backend seems clean but is less clear. We should be explicit: `<Canvas webglONLY />`

## Extras

The WebGPU system exposes many new APIS and possibilities. We should avoid too many features going into r3f core and prioritize them going into Drei and Marketplace.
That being said, supporting TSL better for React devs as well as some of the new APIs should be tried.

### Inspector

We should expose the new inspector in useThree as it needs binding to the renderer `const { inspector } = useThree()` We might make a better inspector hook, but thats a drei item.

### Uniforms

Uniforms in materials and shared uniforms is one of the most confusing parts of TSL. Two components will have the same uniforms and be trying to pass them around in all sorts of ways. By having the cache on the root internalState we can make life much easier for folks

The base concept is to simply include a collection on the state like `const { uniforms } = useThree()` however Im not sure if there will be a manager or simply expose the object. The other way is with a hook

useUniform()

`const { colorA, colorB, scale }  = useUniform(['colorA', 'colorB', {name: 'scale', type: 'int'});`
The idea being we can access and read/update unforms from anywhere. If they dont exist we create them. Im still thinking through the API, I think we could local scope them too. And maybe provide reactivity.

### Nodes

Similar to uniforms we may want to cache common/shared nodes without importing and flowing them around. Having a cache system would make this much nicer.

### Textures

current useTexture methods etc dont cache textures in an accessible way. This is more theoretical but if the earlier caches work we should consider this

### Materials

As with textures this is more loose ATM.

### Loop

the new renderer has some changes to loop. I’m not sure our current useFrame works well with it, but also useFrame could use some love.

## Breaking Changes and PR’s

With this change it will be a breaking change. Other critical breaking changes could also be included. Because of the internal structure changes it would invalidate ALL existing PR’s. We would need to audit them for inclusion prior to the internal structure changes.
