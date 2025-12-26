'use strict';

const three = require('three');
const jsxRuntime = require('react/jsx-runtime');
const React = require('react');
const useMeasure = require('react-use-measure');
const itsFine = require('its-fine');
const Reconciler = require('react-reconciler');
const constants = require('react-reconciler/constants');
const scheduler = require('scheduler');
const traditional = require('zustand/traditional');
const suspendReact = require('suspend-react');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

function _interopNamespaceCompat(e) {
  if (e && typeof e === 'object' && 'default' in e) return e;
  const n = Object.create(null);
  if (e) {
    for (const k in e) {
      n[k] = e[k];
    }
  }
  n.default = e;
  return n;
}

function _mergeNamespaces(n, m) {
  for (var i = 0; i < m.length; i++) {
    const e = m[i];
    if (typeof e !== 'string' && !Array.isArray(e)) { for (const k in e) {
      if (k !== 'default' && !(k in n)) {
        n[k] = e[k];
      }
    } }
  }
  return n;
}

const three__namespace = /*#__PURE__*/_interopNamespaceCompat(three);
const React__namespace = /*#__PURE__*/_interopNamespaceCompat(React);
const useMeasure__default = /*#__PURE__*/_interopDefaultCompat(useMeasure);
const Reconciler__default = /*#__PURE__*/_interopDefaultCompat(Reconciler);

const R3F_BUILD_LEGACY = true;
const R3F_BUILD_WEBGPU = false;
const Inspector = class Inspector2 {
  constructor() {
    throw new Error("Inspector is not available in legacy builds. Use @react-three/fiber/webgpu instead.");
  }
};
const WebGPURenderer = class WebGPURenderer2 {
  constructor() {
    throw new Error("WebGPURenderer is not available in legacy builds. Use @react-three/fiber/webgpu instead.");
  }
};

const THREE = /*#__PURE__*/_mergeNamespaces({
  __proto__: null,
  Inspector: Inspector,
  R3F_BUILD_LEGACY: R3F_BUILD_LEGACY,
  R3F_BUILD_WEBGPU: R3F_BUILD_WEBGPU,
  WebGPURenderer: WebGPURenderer
}, [three__namespace]);

var __defProp$2 = Object.defineProperty;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$2 = (obj, key, value) => __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
const act = React__namespace["act"];
const useIsomorphicLayoutEffect = /* @__PURE__ */ (() => typeof window !== "undefined" && (window.document?.createElement || window.navigator?.product === "ReactNative"))() ? React__namespace.useLayoutEffect : React__namespace.useEffect;
function useMutableCallback(fn) {
  const ref = React__namespace.useRef(fn);
  useIsomorphicLayoutEffect(() => void (ref.current = fn), [fn]);
  return ref;
}
function useBridge() {
  const fiber = itsFine.useFiber();
  const ContextBridge = itsFine.useContextBridge();
  return React__namespace.useMemo(
    () => ({ children }) => {
      const strict = !!itsFine.traverseFiber(fiber, true, (node) => node.type === React__namespace.StrictMode);
      const Root = strict ? React__namespace.StrictMode : React__namespace.Fragment;
      return /* @__PURE__ */ jsxRuntime.jsx(Root, { children: /* @__PURE__ */ jsxRuntime.jsx(ContextBridge, { children }) });
    },
    [fiber, ContextBridge]
  );
}
function Block({ set }) {
  useIsomorphicLayoutEffect(() => {
    set(new Promise(() => null));
    return () => set(false);
  }, [set]);
  return null;
}
const ErrorBoundary = /* @__PURE__ */ (() => {
  var _a;
  return _a = class extends React__namespace.Component {
    constructor() {
      super(...arguments);
      __publicField$2(this, "state", { error: false });
    }
    componentDidCatch(err) {
      this.props.set(err);
    }
    render() {
      return this.state.error ? null : this.props.children;
    }
  }, __publicField$2(_a, "getDerivedStateFromError", () => ({ error: true })), _a;
})();

const is = {
  obj: (a) => a === Object(a) && !is.arr(a) && typeof a !== "function",
  fun: (a) => typeof a === "function",
  str: (a) => typeof a === "string",
  num: (a) => typeof a === "number",
  boo: (a) => typeof a === "boolean",
  und: (a) => a === void 0,
  nul: (a) => a === null,
  arr: (a) => Array.isArray(a),
  equ(a, b, { arrays = "shallow", objects = "reference", strict = true } = {}) {
    if (typeof a !== typeof b || !!a !== !!b) return false;
    if (is.str(a) || is.num(a) || is.boo(a)) return a === b;
    const isObj = is.obj(a);
    if (isObj && objects === "reference") return a === b;
    const isArr = is.arr(a);
    if (isArr && arrays === "reference") return a === b;
    if ((isArr || isObj) && a === b) return true;
    let i;
    for (i in a) if (!(i in b)) return false;
    if (isObj && arrays === "shallow" && objects === "shallow") {
      for (i in strict ? b : a) if (!is.equ(a[i], b[i], { strict, objects: "reference" })) return false;
    } else {
      for (i in strict ? b : a) if (a[i] !== b[i]) return false;
    }
    if (is.und(i)) {
      if (isArr && a.length === 0 && b.length === 0) return true;
      if (isObj && Object.keys(a).length === 0 && Object.keys(b).length === 0) return true;
      if (a !== b) return false;
    }
    return true;
  }
};
const isOrthographicCamera = (def) => def && def.isOrthographicCamera;
const isRef = (obj) => obj !== null && typeof obj === "object" && obj.hasOwnProperty("current");
const isColorRepresentation = (value) => value != null && (typeof value === "string" || typeof value === "number" || value.isColor);
const isObject3D = (object) => object?.isObject3D;
const isTexture = (value) => !!value?.isTexture;
const isVectorLike = (object) => object !== null && typeof object === "object" && "set" in object && typeof object.set === "function";
const isCopyable = (object) => isVectorLike(object) && "copy" in object && typeof object.copy === "function";
const hasConstructor = (object) => !!object?.constructor;

function calculateDpr(dpr) {
  const target = typeof window !== "undefined" ? window.devicePixelRatio ?? 2 : 1;
  return Array.isArray(dpr) ? Math.min(Math.max(dpr[0], target), dpr[1]) : dpr;
}
function getUuidPrefix(uuid) {
  return uuid.split("-")[0];
}
function updateCamera(camera, size) {
  if (camera.manual) return;
  if (isOrthographicCamera(camera)) {
    camera.left = size.width / -2;
    camera.right = size.width / 2;
    camera.top = size.height / 2;
    camera.bottom = size.height / -2;
  } else {
    camera.aspect = size.width / size.height;
  }
  camera.updateProjectionMatrix();
}

const REACT_INTERNAL_PROPS = ["children", "key", "ref"];
function findInitialRoot(instance) {
  let root = instance.root;
  while (root.getState().previousRoot) root = root.getState().previousRoot;
  return root;
}
function getRootState(obj) {
  let state = obj.__r3f?.root.getState();
  if (!state) {
    obj.traverseAncestors((ancestor) => {
      const parentState = ancestor.__r3f?.root.getState();
      if (parentState) {
        state = parentState;
        return false;
      }
    });
  }
  return state;
}
function buildGraph(object) {
  const data = { nodes: {}, materials: {}, meshes: {} };
  if (object) {
    object.traverse((obj) => {
      if (obj.name) data.nodes[obj.name] = obj;
      if (obj.material) {
        const material = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        const nameAlreadyUsed = data.materials[material.name];
        let materialName = material.name;
        if (nameAlreadyUsed) {
          materialName = materialName + `-${getUuidPrefix(material.uuid)}`;
          material.userData.materialCacheName = materialName;
        }
        data.materials[materialName] = material;
      }
      if (obj.isMesh && !data.meshes[obj.name]) data.meshes[obj.name] = obj;
    });
  }
  return data;
}
function dispose(obj) {
  if (obj.type !== "Scene") obj.dispose?.();
  for (const p in obj) {
    const prop = obj[p];
    if (prop?.type !== "Scene") prop?.dispose?.();
  }
}
function getInstanceProps(queue) {
  const props = {};
  for (const key in queue) {
    if (!REACT_INTERNAL_PROPS.includes(key)) props[key] = queue[key];
  }
  return props;
}
function prepare(target, root, type, props) {
  const object = target;
  let instance = object?.__r3f;
  if (!instance) {
    instance = {
      root,
      type,
      parent: null,
      children: [],
      props: getInstanceProps(props),
      object,
      eventCount: 0,
      handlers: {},
      isHidden: false
    };
    if (object) object.__r3f = instance;
  }
  return instance;
}
function invalidateInstance(instance) {
  if (!instance.parent) return;
  instance.props.onUpdate?.(instance.object);
  const state = instance.root?.getState?.();
  if (state && state.internal.frames === 0) state.invalidate();
}

const RESERVED_PROPS = [
  "children",
  "key",
  "ref",
  // Instance props
  "args",
  "dispose",
  "attach",
  "object",
  "onUpdate",
  // Behavior flags
  "dispose"
];
const EVENT_REGEX = /^on(Pointer|Drag|Drop|Click|DoubleClick|ContextMenu|Wheel)/;
const INDEX_REGEX = /-\d+$/;
const MEMOIZED_PROTOTYPES = /* @__PURE__ */ new Map();
const colorMaps = ["map", "emissiveMap", "sheenColorMap", "specularColorMap", "envMap"];
function resolve(root, key) {
  if (!key.includes("-")) return { root, key, target: root[key] };
  if (key in root) return { root, key, target: root[key] };
  const originalKey = key;
  let target = root;
  const parts = key.split("-");
  for (const part of parts) {
    if (typeof target !== "object" || target === null) {
      if (target !== void 0) {
        const remaining = parts.slice(parts.indexOf(part)).join("-");
        return { root: target, key: remaining, target: void 0 };
      }
      return { root, key: originalKey, target: void 0 };
    }
    key = part;
    root = target;
    target = target[key];
  }
  return { root, key, target };
}
function attach(parent, child) {
  if (is.str(child.props.attach)) {
    if (INDEX_REGEX.test(child.props.attach)) {
      const index = child.props.attach.replace(INDEX_REGEX, "");
      const { root: root2, key: key2 } = resolve(parent.object, index);
      if (!Array.isArray(root2[key2])) root2[key2] = [];
    }
    const { root, key } = resolve(parent.object, child.props.attach);
    child.previousAttach = root[key];
    root[key] = child.object;
  } else if (is.fun(child.props.attach)) {
    child.previousAttach = child.props.attach(parent.object, child.object);
  }
}
function detach(parent, child) {
  if (is.str(child.props.attach)) {
    const { root, key } = resolve(parent.object, child.props.attach);
    const previous = child.previousAttach;
    if (previous === void 0) delete root[key];
    else root[key] = previous;
  } else {
    child.previousAttach?.(parent.object, child.object);
  }
  delete child.previousAttach;
}
function getMemoizedPrototype(root) {
  let ctor = MEMOIZED_PROTOTYPES.get(root.constructor);
  try {
    if (!ctor) {
      ctor = new root.constructor();
      MEMOIZED_PROTOTYPES.set(root.constructor, ctor);
    }
  } catch (e) {
  }
  return ctor;
}
function diffProps(instance, newProps) {
  const changedProps = {};
  for (const prop in newProps) {
    if (RESERVED_PROPS.includes(prop)) continue;
    if (is.equ(newProps[prop], instance.props[prop])) continue;
    changedProps[prop] = newProps[prop];
    for (const other in newProps) {
      if (other.startsWith(`${prop}-`)) changedProps[other] = newProps[other];
    }
  }
  for (const prop in instance.props) {
    if (RESERVED_PROPS.includes(prop) || newProps.hasOwnProperty(prop)) continue;
    const { root, key } = resolve(instance.object, prop);
    if (root.constructor && root.constructor.length === 0) {
      const ctor = getMemoizedPrototype(root);
      if (!is.und(ctor)) changedProps[key] = ctor[key];
    } else {
      changedProps[key] = 0;
    }
  }
  return changedProps;
}
function applyProps(object, props) {
  const instance = object.__r3f;
  const rootState = instance && findInitialRoot(instance).getState();
  const prevHandlers = instance?.eventCount;
  for (const prop in props) {
    let value = props[prop];
    if (RESERVED_PROPS.includes(prop)) continue;
    if (instance && EVENT_REGEX.test(prop)) {
      if (typeof value === "function") instance.handlers[prop] = value;
      else delete instance.handlers[prop];
      instance.eventCount = Object.keys(instance.handlers).length;
      continue;
    }
    if (value === void 0) continue;
    let { root, key, target } = resolve(object, prop);
    if (target === void 0 && (typeof root !== "object" || root === null)) {
      throw Error(`R3F: Cannot set "${prop}". Ensure it is an object before setting "${key}".`);
    }
    if (target instanceof three.Layers && value instanceof three.Layers) {
      target.mask = value.mask;
    } else if (target?.isColor && isColorRepresentation(value)) {
      target.set(value);
    } else if (isCopyable(target) && hasConstructor(value) && target.constructor === value.constructor) {
      target.copy(value);
    } else if (isVectorLike(target) && Array.isArray(value)) {
      if ("fromArray" in target && typeof target.fromArray === "function") target.fromArray(value);
      else target.set(...value);
    } else if (isVectorLike(target) && is.num(value)) {
      if ("setScalar" in target && typeof target.setScalar === "function") target.setScalar(value);
      else target.set(value);
    } else {
      root[key] = value;
      if (rootState && !rootState.linear && colorMaps.includes(key) && isTexture(value) && root[key]?.isTexture && // sRGB textures must be RGBA8 since r137 https://github.com/mrdoob/three.js/pull/23129
      root[key].format === three.RGBAFormat && root[key].type === three.UnsignedByteType) {
        root[key].colorSpace = rootState.textureColorSpace;
      }
    }
  }
  if (instance?.parent && rootState?.internal && instance.object?.isObject3D && prevHandlers !== instance.eventCount) {
    const object2 = instance.object;
    const index = rootState.internal.interaction.indexOf(object2);
    if (index > -1) rootState.internal.interaction.splice(index, 1);
    if (instance.eventCount && object2.raycast !== null) {
      rootState.internal.interaction.push(object2);
    }
  }
  if (instance && instance.props.attach === void 0) {
    if (instance.object.isBufferGeometry) instance.props.attach = "geometry";
    else if (instance.object.isMaterial) instance.props.attach = "material";
  }
  if (instance) invalidateInstance(instance);
  return object;
}

function makeId(event) {
  return (event.eventObject || event.object).uuid + "/" + event.index + event.instanceId;
}
function releaseInternalPointerCapture(capturedMap, obj, captures, pointerId) {
  const captureData = captures.get(obj);
  if (captureData) {
    captures.delete(obj);
    if (captures.size === 0) {
      capturedMap.delete(pointerId);
      captureData.target.releasePointerCapture(pointerId);
    }
  }
}
function removeInteractivity(store, object) {
  const { internal } = store.getState();
  internal.interaction = internal.interaction.filter((o) => o !== object);
  internal.initialHits = internal.initialHits.filter((o) => o !== object);
  internal.hovered.forEach((value, key) => {
    if (value.eventObject === object || value.object === object) {
      internal.hovered.delete(key);
    }
  });
  internal.capturedMap.forEach((captures, pointerId) => {
    releaseInternalPointerCapture(internal.capturedMap, object, captures, pointerId);
  });
}
function createEvents(store) {
  function calculateDistance(event) {
    const { internal } = store.getState();
    const dx = event.offsetX - internal.initialClick[0];
    const dy = event.offsetY - internal.initialClick[1];
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  }
  function filterPointerEvents(objects) {
    return objects.filter(
      (obj) => ["Move", "Over", "Enter", "Out", "Leave"].some(
        (name) => obj.__r3f?.handlers["onPointer" + name]
      ) || ["OverEnter", "OverLeave", "Over"].some(
        (name) => obj.__r3f?.handlers["onDrag" + name]
      ) || obj.__r3f?.handlers.onDrop
    );
  }
  function intersect(event, filter) {
    const state = store.getState();
    const duplicates = /* @__PURE__ */ new Set();
    const intersections = [];
    const eventsObjects = filter ? filter(state.internal.interaction) : state.internal.interaction;
    for (let i = 0; i < eventsObjects.length; i++) {
      const state2 = getRootState(eventsObjects[i]);
      if (state2) {
        state2.raycaster.camera = void 0;
      }
    }
    if (!state.previousRoot) {
      state.events.compute?.(event, state);
    }
    function handleRaycast(obj) {
      const state2 = getRootState(obj);
      if (!state2 || !state2.events.enabled || state2.raycaster.camera === null) return [];
      if (state2.raycaster.camera === void 0) {
        state2.events.compute?.(event, state2, state2.previousRoot?.getState());
        if (state2.raycaster.camera === void 0) state2.raycaster.camera = null;
      }
      return state2.raycaster.camera ? state2.raycaster.intersectObject(obj, true) : [];
    }
    let hits = eventsObjects.flatMap(handleRaycast).sort((a, b) => {
      const aState = getRootState(a.object);
      const bState = getRootState(b.object);
      const aPriority = aState?.events?.priority ?? 1;
      const bPriority = bState?.events?.priority ?? 1;
      return bPriority - aPriority || a.distance - b.distance;
    }).filter((item) => {
      const id = makeId(item);
      if (duplicates.has(id)) return false;
      duplicates.add(id);
      return true;
    });
    if (state.events.filter) hits = state.events.filter(hits, state);
    for (const hit of hits) {
      let eventObject = hit.object;
      while (eventObject) {
        if (eventObject.__r3f?.eventCount)
          intersections.push({ ...hit, eventObject });
        eventObject = eventObject.parent;
      }
    }
    if ("pointerId" in event && state.internal.capturedMap.has(event.pointerId)) {
      for (let captureData of state.internal.capturedMap.get(event.pointerId).values()) {
        if (!duplicates.has(makeId(captureData.intersection))) intersections.push(captureData.intersection);
      }
    }
    return intersections;
  }
  function handleIntersects(intersections, event, delta, callback) {
    if (intersections.length) {
      const localState = { stopped: false };
      for (const hit of intersections) {
        const state = getRootState(hit.object);
        if (state) {
          const { raycaster, pointer, camera, internal } = state;
          const unprojectedPoint = new three.Vector3(pointer.x, pointer.y, 0).unproject(camera);
          const hasPointerCapture = (id) => internal.capturedMap.get(id)?.has(hit.eventObject) ?? false;
          const setPointerCapture = (id) => {
            const captureData = { intersection: hit, target: event.target };
            if (internal.capturedMap.has(id)) {
              internal.capturedMap.get(id).set(hit.eventObject, captureData);
            } else {
              internal.capturedMap.set(id, /* @__PURE__ */ new Map([[hit.eventObject, captureData]]));
            }
            event.target.setPointerCapture(id);
          };
          const releasePointerCapture = (id) => {
            const captures = internal.capturedMap.get(id);
            if (captures) {
              releaseInternalPointerCapture(internal.capturedMap, hit.eventObject, captures, id);
            }
          };
          let extractEventProps = {};
          for (let prop in event) {
            let property = event[prop];
            if (typeof property !== "function") extractEventProps[prop] = property;
          }
          let raycastEvent = {
            ...hit,
            ...extractEventProps,
            pointer,
            intersections,
            stopped: localState.stopped,
            delta,
            unprojectedPoint,
            ray: raycaster.ray,
            camera,
            // Hijack stopPropagation, which just sets a flag
            stopPropagation() {
              const capturesForPointer = "pointerId" in event && internal.capturedMap.get(event.pointerId);
              if (
                // ...if this pointer hasn't been captured
                !capturesForPointer || // ... or if the hit object is capturing the pointer
                capturesForPointer.has(hit.eventObject)
              ) {
                raycastEvent.stopped = localState.stopped = true;
                if (internal.hovered.size && Array.from(internal.hovered.values()).find((i) => i.eventObject === hit.eventObject)) {
                  const higher = intersections.slice(0, intersections.indexOf(hit));
                  cancelPointer([...higher, hit]);
                }
              }
            },
            // there should be a distinction between target and currentTarget
            target: { hasPointerCapture, setPointerCapture, releasePointerCapture },
            currentTarget: { hasPointerCapture, setPointerCapture, releasePointerCapture },
            nativeEvent: event
          };
          callback(raycastEvent);
          if (localState.stopped === true) break;
        }
      }
    }
    return intersections;
  }
  function cancelPointer(intersections) {
    const { internal } = store.getState();
    for (const hoveredObj of internal.hovered.values()) {
      if (!intersections.length || !intersections.find(
        (hit) => hit.object === hoveredObj.object && hit.index === hoveredObj.index && hit.instanceId === hoveredObj.instanceId
      )) {
        const eventObject = hoveredObj.eventObject;
        const instance = eventObject.__r3f;
        internal.hovered.delete(makeId(hoveredObj));
        if (instance?.eventCount) {
          const handlers = instance.handlers;
          const data = { ...hoveredObj, intersections };
          handlers.onPointerOut?.(data);
          handlers.onPointerLeave?.(data);
          handlers.onDragOverLeave?.(data);
        }
      }
    }
  }
  function pointerMissed(event, objects) {
    for (let i = 0; i < objects.length; i++) {
      const instance = objects[i].__r3f;
      instance?.handlers.onPointerMissed?.(event);
    }
  }
  function dragOverMissed(event, objects) {
    for (let i = 0; i < objects.length; i++) {
      const instance = objects[i].__r3f;
      instance?.handlers.onDragOverMissed?.(event);
    }
  }
  function dropMissed(event, objects) {
    for (let i = 0; i < objects.length; i++) {
      const instance = objects[i].__r3f;
      instance?.handlers.onDropMissed?.(event);
    }
  }
  function handlePointer(name) {
    switch (name) {
      case "onPointerLeave":
      case "onPointerCancel":
      case "onDragLeave":
        return () => cancelPointer([]);
      case "onLostPointerCapture":
        return (event) => {
          const { internal } = store.getState();
          if ("pointerId" in event && internal.capturedMap.has(event.pointerId)) {
            requestAnimationFrame(() => {
              if (internal.capturedMap.has(event.pointerId)) {
                internal.capturedMap.delete(event.pointerId);
                cancelPointer([]);
              }
            });
          }
        };
    }
    return function handleEvent(event) {
      const { onPointerMissed, onDragOverMissed, onDropMissed, internal } = store.getState();
      internal.lastEvent.current = event;
      const isPointerMove = name === "onPointerMove";
      const isDragOver = name === "onDragOver";
      const isDrop = name === "onDrop";
      const isClickEvent = name === "onClick" || name === "onContextMenu" || name === "onDoubleClick";
      const filter = isPointerMove || isDragOver || isDrop ? filterPointerEvents : void 0;
      const hits = intersect(event, filter);
      const delta = isClickEvent ? calculateDistance(event) : 0;
      if (name === "onPointerDown") {
        internal.initialClick = [event.offsetX, event.offsetY];
        internal.initialHits = hits.map((hit) => hit.eventObject);
      }
      if (isClickEvent && !hits.length) {
        if (delta <= 2) {
          pointerMissed(event, internal.interaction);
          if (onPointerMissed) onPointerMissed(event);
        }
      }
      if (isDragOver && !hits.length) {
        dragOverMissed(event, internal.interaction);
        if (onDragOverMissed) onDragOverMissed(event);
      }
      if (isDrop && !hits.length) {
        dropMissed(event, internal.interaction);
        if (onDropMissed) onDropMissed(event);
      }
      if (isPointerMove || isDragOver) cancelPointer(hits);
      function onIntersect(data) {
        const eventObject = data.eventObject;
        const instance = eventObject.__r3f;
        if (!instance?.eventCount) return;
        const handlers = instance.handlers;
        if (isPointerMove) {
          if (handlers.onPointerOver || handlers.onPointerEnter || handlers.onPointerOut || handlers.onPointerLeave) {
            const id = makeId(data);
            const hoveredItem = internal.hovered.get(id);
            if (!hoveredItem) {
              internal.hovered.set(id, data);
              handlers.onPointerOver?.(data);
              handlers.onPointerEnter?.(data);
            } else if (hoveredItem.stopped) {
              data.stopPropagation();
            }
          }
          handlers.onPointerMove?.(data);
        } else if (isDragOver) {
          const id = makeId(data);
          const hoveredItem = internal.hovered.get(id);
          if (!hoveredItem) {
            internal.hovered.set(id, data);
            handlers.onDragOverEnter?.(data);
          } else if (hoveredItem.stopped) {
            data.stopPropagation();
          }
          handlers.onDragOver?.(data);
        } else if (isDrop) {
          handlers.onDrop?.(data);
        } else {
          const handler = handlers[name];
          if (handler) {
            if (!isClickEvent || internal.initialHits.includes(eventObject)) {
              pointerMissed(
                event,
                internal.interaction.filter((object) => !internal.initialHits.includes(object))
              );
              handler(data);
            }
          } else {
            if (isClickEvent && internal.initialHits.includes(eventObject)) {
              pointerMissed(
                event,
                internal.interaction.filter((object) => !internal.initialHits.includes(object))
              );
            }
          }
        }
      }
      handleIntersects(hits, event, delta, onIntersect);
    };
  }
  return { handlePointer };
}
const DOM_EVENTS = {
  onClick: ["click", false],
  onContextMenu: ["contextmenu", false],
  onDoubleClick: ["dblclick", false],
  onDragEnter: ["dragenter", false],
  onDragLeave: ["dragleave", false],
  onDragOver: ["dragover", false],
  onDrop: ["drop", false],
  onWheel: ["wheel", true],
  onPointerDown: ["pointerdown", true],
  onPointerUp: ["pointerup", true],
  onPointerLeave: ["pointerleave", true],
  onPointerMove: ["pointermove", true],
  onPointerCancel: ["pointercancel", true],
  onLostPointerCapture: ["lostpointercapture", true]
};
function createPointerEvents(store) {
  const { handlePointer } = createEvents(store);
  return {
    priority: 1,
    enabled: true,
    compute(event, state, previous) {
      state.pointer.set(event.offsetX / state.size.width * 2 - 1, -(event.offsetY / state.size.height) * 2 + 1);
      state.raycaster.setFromCamera(state.pointer, state.camera);
    },
    connected: void 0,
    handlers: Object.keys(DOM_EVENTS).reduce(
      (acc, key) => ({ ...acc, [key]: handlePointer(key) }),
      {}
    ),
    update: () => {
      const { events, internal } = store.getState();
      if (internal.lastEvent?.current && events.handlers) events.handlers.onPointerMove(internal.lastEvent.current);
    },
    connect: (target) => {
      const { set, events } = store.getState();
      events.disconnect?.();
      set((state) => ({ events: { ...state.events, connected: target } }));
      if (events.handlers) {
        for (const name in events.handlers) {
          const event = events.handlers[name];
          const [eventName, passive] = DOM_EVENTS[name];
          target.addEventListener(eventName, event, { passive });
        }
      }
    },
    disconnect: () => {
      const { set, events } = store.getState();
      if (events.connected) {
        if (events.handlers) {
          for (const name in events.handlers) {
            const event = events.handlers[name];
            const [eventName] = DOM_EVENTS[name];
            events.connected.removeEventListener(eventName, event);
          }
        }
        set((state) => ({ events: { ...state.events, connected: void 0 } }));
      }
    }
  };
}

const shownNotices = /* @__PURE__ */ new Set();
function notifyDepreciated({ heading, body, link }) {
  if (shownNotices.has(heading)) return;
  shownNotices.add(heading);
  const caller = getCallerFrame();
  if (caller) {
    console.log();
  }
  const boxStyle = "background: #ff9800; color: #1a1a1a; padding: 8px 12px; border-radius: 4px; font-weight: 500;";
  if (caller) {
    console.log(`%c\u26A0\uFE0F ${heading}`, boxStyle);
  }
  if (body || link) {
    let message = "";
    if (body) message += body;
    if (link) message += (body ? "\n\n" : "") + `More info: ${link}`;
    console.warn(`%c${message}`, "font-weight: bold;");
  }
}
function getCallerFrame(depth = 3) {
  const stack = new Error().stack;
  if (!stack) return null;
  const lines = stack.split("\n");
  const frame = lines[depth];
  if (!frame) return null;
  let match = frame.match(/^\s*at (?:(.+?) )?\(?(.+?):(\d+):(\d+)\)?$/);
  if (!match) {
    match = frame.match(/^(?:(.+?)@)?(.+?):(\d+):(\d+)$/);
  }
  if (!match) return null;
  const [, fn, url, line] = match;
  return {
    functionName: fn ?? "<anonymous>",
    location: formatLocation(url, Number(line))
  };
}
function formatLocation(url, line) {
  const clean = url.split("?")[0];
  const file = clean.split("/").pop() ?? clean;
  return `${file}:${line}`;
}

const context = /* @__PURE__ */ React__namespace.createContext(null);
const createStore = (invalidate, advance) => {
  const rootStore = traditional.createWithEqualityFn((set, get) => {
    const position = new three.Vector3();
    const defaultTarget = new three.Vector3();
    const tempTarget = new three.Vector3();
    function getCurrentViewport(camera = get().camera, target = defaultTarget, size = get().size) {
      const { width, height, top, left } = size;
      const aspect = width / height;
      if (target.isVector3) tempTarget.copy(target);
      else tempTarget.set(...target);
      const distance = camera.getWorldPosition(position).distanceTo(tempTarget);
      if (isOrthographicCamera(camera)) {
        return { width: width / camera.zoom, height: height / camera.zoom, top, left, factor: 1, distance, aspect };
      } else {
        const fov = camera.fov * Math.PI / 180;
        const h = 2 * Math.tan(fov / 2) * distance;
        const w = h * (width / height);
        return { width: w, height: h, top, left, factor: width / w, distance, aspect };
      }
    }
    let performanceTimeout = void 0;
    const setPerformanceCurrent = (current) => set((state2) => ({ performance: { ...state2.performance, current } }));
    const pointer = new three.Vector2();
    const rootState = {
      set,
      get,
      // Mock objects that have to be configured
      gl: null,
      renderer: null,
      camera: null,
      raycaster: null,
      events: { priority: 1, enabled: true, connected: false },
      scene: null,
      rootScene: null,
      xr: null,
      inspector: null,
      invalidate: (frames = 1, stackFrames = false) => invalidate(get(), frames, stackFrames),
      advance: (timestamp, runGlobalEffects) => advance(timestamp, runGlobalEffects, get()),
      legacy: false,
      linear: false,
      flat: false,
      textureColorSpace: "srgb",
      isLegacy: false,
      webGPUSupported: false,
      isNative: false,
      controls: null,
      pointer,
      mouse: pointer,
      frameloop: "always",
      onPointerMissed: void 0,
      onDragOverMissed: void 0,
      onDropMissed: void 0,
      performance: {
        current: 1,
        min: 0.5,
        max: 1,
        debounce: 200,
        regress: () => {
          const state2 = get();
          if (performanceTimeout) clearTimeout(performanceTimeout);
          if (state2.performance.current !== state2.performance.min) setPerformanceCurrent(state2.performance.min);
          performanceTimeout = setTimeout(
            () => setPerformanceCurrent(get().performance.max),
            state2.performance.debounce
          );
        }
      },
      size: { width: 0, height: 0, top: 0, left: 0 },
      viewport: {
        initialDpr: 0,
        dpr: 0,
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        aspect: 0,
        distance: 0,
        factor: 0,
        getCurrentViewport
      },
      setEvents: (events) => set((state2) => ({ ...state2, events: { ...state2.events, ...events } })),
      setSize: (width, height, top = 0, left = 0) => {
        const camera = get().camera;
        const size = { width, height, top, left };
        set((state2) => ({ size, viewport: { ...state2.viewport, ...getCurrentViewport(camera, defaultTarget, size) } }));
      },
      setDpr: (dpr) => set((state2) => {
        const resolved = calculateDpr(dpr);
        return { viewport: { ...state2.viewport, dpr: resolved, initialDpr: state2.viewport.initialDpr || resolved } };
      }),
      setFrameloop: (frameloop = "always") => {
        set(() => ({ frameloop }));
      },
      setError: (error) => set(() => ({ error })),
      error: null,
      //* TSL State (managed via hooks: useUniforms, useNodes, useTextures, usePostProcessing) ==============================
      uniforms: {},
      nodes: {},
      textures: /* @__PURE__ */ new Map(),
      postProcessing: null,
      passes: {},
      previousRoot: void 0,
      internal: {
        // Events
        interaction: [],
        hovered: /* @__PURE__ */ new Map(),
        subscribers: [],
        initialClick: [0, 0],
        initialHits: [],
        capturedMap: /* @__PURE__ */ new Map(),
        lastEvent: React__namespace.createRef(),
        // Updates
        active: false,
        frames: 0,
        priority: 0,
        subscribe: (ref, priority, store) => {
          const internal = get().internal;
          internal.priority = internal.priority + (priority > 0 ? 1 : 0);
          internal.subscribers.push({ ref, priority, store });
          internal.subscribers = internal.subscribers.sort((a, b) => a.priority - b.priority);
          return () => {
            const internal2 = get().internal;
            if (internal2?.subscribers) {
              internal2.priority = internal2.priority - (priority > 0 ? 1 : 0);
              internal2.subscribers = internal2.subscribers.filter((s) => s.ref !== ref);
            }
          };
        },
        // Renderer Storage (single source of truth)
        actualRenderer: null,
        // Scheduler for useFrameNext (initialized in renderer.tsx)
        scheduler: null
      }
    };
    return rootState;
  });
  const state = rootStore.getState();
  Object.defineProperty(state, "gl", {
    get() {
      const currentState = rootStore.getState();
      if (!currentState.isLegacy && currentState.internal.actualRenderer) {
        const stack = new Error().stack || "";
        const isInternalAccess = stack.includes("zustand") || stack.includes("setState") || stack.includes("Object.assign") || stack.includes("react-three-fiber/packages/fiber/src/core");
        if (!isInternalAccess) {
          const cleanedStack = stack.split("\n").slice(2).join("\n") || "Stack trace unavailable";
          notifyDepreciated({
            heading: "Accessing state.gl in WebGPU mode",
            body: "Please use state.renderer instead. state.gl is deprecated and will be removed in future versions.\n\nFor backwards compatibility, state.gl currently maps to state.renderer, but this may cause issues with libraries expecting WebGLRenderer.\n\nAccessed from:\n" + cleanedStack
          });
        }
      }
      return currentState.internal.actualRenderer;
    },
    set(value) {
      rootStore.getState().internal.actualRenderer = value;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(state, "renderer", {
    get() {
      return rootStore.getState().internal.actualRenderer;
    },
    set(value) {
      rootStore.getState().internal.actualRenderer = value;
    },
    enumerable: true,
    configurable: true
  });
  let oldScene = state.scene;
  rootStore.subscribe(() => {
    const currentState = rootStore.getState();
    const { scene, rootScene, set } = currentState;
    if (scene !== oldScene) {
      oldScene = scene;
      if (scene?.isScene && scene !== rootScene) {
        set({ rootScene: scene });
      }
    }
  });
  let oldSize = state.size;
  let oldDpr = state.viewport.dpr;
  let oldCamera = state.camera;
  rootStore.subscribe(() => {
    const { camera, size, viewport, set, internal } = rootStore.getState();
    const actualRenderer = internal.actualRenderer;
    if (size.width !== oldSize.width || size.height !== oldSize.height || viewport.dpr !== oldDpr) {
      oldSize = size;
      oldDpr = viewport.dpr;
      updateCamera(camera, size);
      if (viewport.dpr > 0) actualRenderer.setPixelRatio(viewport.dpr);
      const updateStyle = typeof HTMLCanvasElement !== "undefined" && actualRenderer.domElement instanceof HTMLCanvasElement;
      actualRenderer.setSize(size.width, size.height, updateStyle);
    }
    if (camera !== oldCamera) {
      oldCamera = camera;
      set((state2) => ({ viewport: { ...state2.viewport, ...state2.viewport.getCurrentViewport(camera) } }));
    }
  });
  rootStore.subscribe((state2) => invalidate(state2));
  return rootStore;
};

const memoizedLoaders = /* @__PURE__ */ new WeakMap();
const isConstructor$1 = (value) => typeof value === "function" && value?.prototype?.constructor === value;
function loadingFn(extensions, onProgress) {
  return function(Proto, ...input) {
    let loader = Proto;
    if (isConstructor$1(Proto)) {
      loader = memoizedLoaders.get(Proto);
      if (!loader) {
        loader = new Proto();
        memoizedLoaders.set(Proto, loader);
      }
    }
    if (extensions) extensions(loader);
    return Promise.all(
      input.map(
        (input2) => new Promise(
          (res, reject) => loader.load(
            input2,
            (data) => {
              if (isObject3D(data?.scene)) Object.assign(data, buildGraph(data.scene));
              res(data);
            },
            onProgress,
            (error) => reject(new Error(`Could not load ${input2}: ${error?.message}`))
          )
        )
      )
    );
  };
}
function useLoader(loader, input, extensions, onProgress) {
  const keys = Array.isArray(input) ? input : [input];
  const results = suspendReact.suspend(loadingFn(extensions, onProgress), [loader, ...keys], { equal: is.equ });
  return Array.isArray(input) ? results : results[0];
}
useLoader.preload = function(loader, input, extensions) {
  const keys = Array.isArray(input) ? input : [input];
  keys.forEach((key) => suspendReact.preload(loadingFn(extensions), [loader, key]));
};
useLoader.clear = function(loader, input) {
  const keys = Array.isArray(input) ? input : [input];
  keys.forEach((key) => suspendReact.clear([loader, key]));
};

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
const DEFAULT_PHASES = ["start", "input", "physics", "update", "render", "finish"];
class PhaseGraph {
  constructor() {
    /** Ordered list of phase nodes */
    __publicField$1(this, "phases", []);
    /** Quick lookup by name */
    __publicField$1(this, "phaseMap", /* @__PURE__ */ new Map());
    /** Cached ordered names (invalidated on changes) */
    __publicField$1(this, "orderedNamesCache", null);
    this.initializeDefaultPhases();
  }
  //* Initialization --------------------------------
  initializeDefaultPhases() {
    for (const name of DEFAULT_PHASES) {
      const node = { name, isAutoGenerated: false };
      this.phases.push(node);
      this.phaseMap.set(name, node);
    }
    this.invalidateCache();
  }
  //* Public API --------------------------------
  /**
   * Add a named phase to the graph
   * @param name - Phase name (must be unique)
   * @param options - Position options (before or after another phase)
   */
  addPhase(name, options = {}) {
    if (this.phaseMap.has(name)) {
      console.warn(`[useFrame] Phase "${name}" already exists`);
      return;
    }
    const { before, after } = options;
    const node = { name, isAutoGenerated: false };
    let insertIndex = this.phases.length;
    const targetIndex = this.getPhaseIndex(before ?? after);
    if (targetIndex !== -1) insertIndex = before ? targetIndex : targetIndex + 1;
    else {
      const constraintType = before ? "before" : "after";
      console.warn(`[useFrame] Phase "${before ?? after}" not found for '${constraintType}' constraint`);
    }
    this.phases.splice(insertIndex, 0, node);
    this.phaseMap.set(name, node);
    this.invalidateCache();
  }
  /**
   * Get ordered list of phase names
   */
  getOrderedPhases() {
    if (this.orderedNamesCache === null) this.orderedNamesCache = this.phases.map((p) => p.name);
    return this.orderedNamesCache;
  }
  /**
   * Check if a phase exists
   */
  hasPhase(name) {
    return this.phaseMap.has(name);
  }
  /**
   * Get the index of a phase (-1 if not found)
   */
  getPhaseIndex(name) {
    if (!name) return -1;
    return this.phases.findIndex((p) => p.name === name);
  }
  /**
   * Ensure a phase exists, creating an auto-generated one if needed.
   * Used for resolving before/after constraints.
   *
   * @param name - The phase name to ensure exists
   * @returns The phase name (may be auto-generated like 'before:render')
   */
  ensurePhase(name) {
    if (this.phaseMap.has(name)) return name;
    const node = { name, isAutoGenerated: true };
    this.phases.push(node);
    this.phaseMap.set(name, node);
    this.invalidateCache();
    return name;
  }
  /**
   * Resolve where a job with before/after constraints should go.
   * Creates auto-generated phases if needed.
   *
   * @param before - Phase(s) to run before
   * @param after - Phase(s) to run after
   * @returns The resolved phase name
   */
  resolveConstraintPhase(before, after) {
    const beforeArr = before ? Array.isArray(before) ? before : [before] : [];
    const afterArr = after ? Array.isArray(after) ? after : [after] : [];
    if (beforeArr.length > 0) {
      return this.ensureAutoPhase(beforeArr[0], "before", 0);
    }
    if (afterArr.length > 0) {
      return this.ensureAutoPhase(afterArr[0], "after", 1);
    }
    return "update";
  }
  /**
   * Ensure an auto-generated phase exists relative to a target phase.
   * Creates the phase if it doesn't exist, inserting it at the correct position.
   *
   * @param target - The target phase name to position relative to
   * @param prefix - Prefix for auto-generated phase name ('before' or 'after')
   * @param offset - Insertion offset (0 for before, 1 for after)
   * @returns The auto-generated phase name
   */
  ensureAutoPhase(target, prefix, offset) {
    const autoName = `${prefix}:${target}`;
    if (this.phaseMap.has(autoName)) return autoName;
    const node = { name: autoName, isAutoGenerated: true };
    const targetIndex = this.getPhaseIndex(target);
    if (targetIndex !== -1) this.phases.splice(targetIndex + offset, 0, node);
    else this.phases.push(node);
    this.phaseMap.set(autoName, node);
    this.invalidateCache();
    return autoName;
  }
  // Internal --------------------------------
  invalidateCache() {
    this.orderedNamesCache = null;
  }
}

function rebuildSortedJobs(jobs, phaseGraph) {
  const orderedPhases = phaseGraph.getOrderedPhases();
  const buckets = /* @__PURE__ */ new Map();
  for (const phase of orderedPhases) {
    buckets.set(phase, []);
  }
  for (const job of jobs.values()) {
    if (!job.enabled) continue;
    let bucket = buckets.get(job.phase);
    if (!bucket) {
      bucket = [];
      buckets.set(job.phase, bucket);
    }
    bucket.push(job);
  }
  const sortedBuckets = [];
  for (const phase of orderedPhases) {
    const bucket = buckets.get(phase);
    if (!bucket || bucket.length === 0) continue;
    bucket.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.index - b.index;
    });
    sortedBuckets.push(hasCrossJobConstraints(bucket) ? topologicalSort(bucket) : bucket);
  }
  for (const [phase, bucket] of buckets) {
    if (!orderedPhases.includes(phase) && bucket.length > 0) {
      bucket.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.index - b.index;
      });
      sortedBuckets.push(bucket);
    }
  }
  return sortedBuckets.flat();
}
function hasCrossJobConstraints(bucket) {
  const jobIds = new Set(bucket.map((j) => j.id));
  for (const job of bucket) {
    for (const ref of job.before) {
      if (jobIds.has(ref)) return true;
    }
    for (const ref of job.after) {
      if (jobIds.has(ref)) return true;
    }
  }
  return false;
}
function topologicalSort(jobs) {
  const n = jobs.length;
  if (n <= 1) return jobs;
  const jobMap = /* @__PURE__ */ new Map();
  const inDegree = /* @__PURE__ */ new Map();
  const adjacency = /* @__PURE__ */ new Map();
  for (const job of jobs) {
    jobMap.set(job.id, job);
    inDegree.set(job.id, 0);
    adjacency.set(job.id, []);
  }
  for (const job of jobs) {
    for (const ref of job.before) {
      if (jobMap.has(ref)) {
        adjacency.get(job.id).push(ref);
        inDegree.set(ref, inDegree.get(ref) + 1);
      }
    }
    for (const ref of job.after) {
      if (jobMap.has(ref)) {
        adjacency.get(ref).push(job.id);
        inDegree.set(job.id, inDegree.get(job.id) + 1);
      }
    }
  }
  const queue = [];
  for (const job of jobs) {
    if (inDegree.get(job.id) === 0) {
      queue.push(job);
    }
  }
  queue.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.index - b.index;
  });
  const result = [];
  while (queue.length > 0) {
    const job = queue.shift();
    result.push(job);
    const neighbors = adjacency.get(job.id) || [];
    for (const neighborId of neighbors) {
      const newDegree = inDegree.get(neighborId) - 1;
      inDegree.set(neighborId, newDegree);
      if (newDegree === 0) {
        const neighbor = jobMap.get(neighborId);
        insertSorted(queue, neighbor);
      }
    }
  }
  if (result.length !== n) {
    console.warn("[useFrame] Circular dependency detected in job constraints");
    const resultIds = new Set(result.map((j) => j.id));
    for (const job of jobs) {
      if (!resultIds.has(job.id)) result.push(job);
    }
  }
  return result;
}
function insertSorted(arr, job) {
  let i = 0;
  while (i < arr.length) {
    const cmp = arr[i];
    if (job.priority > cmp.priority || job.priority === cmp.priority && job.index < cmp.index) {
      break;
    }
    i++;
  }
  arr.splice(i, 0, job);
}

function shouldRun(job, now) {
  if (!job.enabled) return false;
  if (!job.fps) return true;
  const minInterval = 1e3 / job.fps;
  const lastRun = job.lastRun ?? 0;
  const elapsed = now - lastRun;
  if (elapsed < minInterval) return false;
  if (job.drop) {
    job.lastRun = now;
  } else {
    const steps = Math.floor(elapsed / minInterval);
    job.lastRun = lastRun + steps * minInterval;
    if (job.lastRun < now - minInterval) {
      job.lastRun = now;
    }
  }
  return true;
}
function resetJobTiming(job) {
  job.lastRun = void 0;
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const hmrData = (() => {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "test") return void 0;
  if (typeof import_meta_hot !== "undefined") return import_meta_hot;
  try {
    return (0, eval)("import.meta.hot");
  } catch {
    return void 0;
  }
})();
const _Scheduler = class _Scheduler {
  //* Constructor ================================
  constructor() {
    //* Critical State ================================
    __publicField(this, "roots", /* @__PURE__ */ new Map());
    __publicField(this, "phaseGraph");
    __publicField(this, "loopState", {
      running: false,
      rafHandle: null,
      lastTime: null,
      // null = uninitialized, 0+ = valid timestamp
      frameCount: 0,
      elapsedTime: 0,
      createdAt: performance.now()
    });
    __publicField(this, "stoppedTime", 0);
    //* Private State ================================
    __publicField(this, "nextRootIndex", 0);
    __publicField(this, "globalBeforeJobs", /* @__PURE__ */ new Map());
    __publicField(this, "globalAfterJobs", /* @__PURE__ */ new Map());
    __publicField(this, "nextGlobalIndex", 0);
    __publicField(this, "idleCallbacks", /* @__PURE__ */ new Set());
    __publicField(this, "nextJobIndex", 0);
    __publicField(this, "jobStateListeners", /* @__PURE__ */ new Map());
    __publicField(this, "pendingFrames", 0);
    __publicField(this, "_frameloop", "always");
    //* Core Loop Execution Methods ================================
    /**
     * Main RAF loop callback.
     * Executes frame, handles demand mode, and schedules next frame.
     * @param {number} timestamp - RAF timestamp in milliseconds
     * @returns {void}
     * @private
     */
    __publicField(this, "loop", (timestamp) => {
      if (!this.loopState.running) return;
      this.executeFrame(timestamp);
      if (this._frameloop === "demand") {
        this.pendingFrames = Math.max(0, this.pendingFrames - 1);
        if (this.pendingFrames === 0) {
          this.notifyIdle(timestamp);
          return this.stop();
        }
      }
      this.loopState.rafHandle = requestAnimationFrame(this.loop);
    });
    this.phaseGraph = new PhaseGraph();
  }
  /**
   * Get the global scheduler instance (creates if doesn't exist).
   * Uses HMR data to preserve instance across hot reloads.
   * @returns {Scheduler} The singleton scheduler instance
   */
  static get() {
    if (!_Scheduler.instance && hmrData?.data?.scheduler) {
      _Scheduler.instance = hmrData.data.scheduler;
    }
    if (!_Scheduler.instance) {
      _Scheduler.instance = new _Scheduler();
      if (hmrData?.data) {
        hmrData.data.scheduler = _Scheduler.instance;
      }
    }
    return _Scheduler.instance;
  }
  /**
   * Reset the singleton instance. Stops the loop and clears all state.
   * Primarily used for testing to ensure clean state between tests.
   * @returns {void}
   */
  static reset() {
    if (_Scheduler.instance) {
      _Scheduler.instance.stop();
      _Scheduler.instance = null;
    }
    if (hmrData?.data) {
      hmrData.data.scheduler = null;
    }
  }
  //* Getters & Setters ================================
  get phases() {
    return this.phaseGraph.getOrderedPhases();
  }
  get frameloop() {
    return this._frameloop;
  }
  set frameloop(mode) {
    if (this._frameloop === mode) return;
    const wasAlways = this._frameloop === "always";
    this._frameloop = mode;
    if (mode === "always" && !this.loopState.running && this.roots.size > 0) this.start();
    else if (mode !== "always" && wasAlways) this.stop();
  }
  get isRunning() {
    return this.loopState.running;
  }
  //* Root Management Methods ================================
  /**
   * Register a root (Canvas) with the scheduler.
   * The first root to register starts the RAF loop (if frameloop='always').
   * @param {string} id - Unique identifier for this root
   * @param {() => RootState} getState - Function to get the root's current state
   * @returns {() => void} Unsubscribe function to remove this root
   */
  registerRoot(id, getState) {
    if (this.roots.has(id)) {
      console.warn(`[Scheduler] Root "${id}" already registered`);
      return () => this.unregisterRoot(id);
    }
    const entry = {
      id,
      getState,
      jobs: /* @__PURE__ */ new Map(),
      sortedJobs: [],
      needsRebuild: false
    };
    this.roots.set(id, entry);
    if (this.roots.size === 1 && this._frameloop === "always") {
      this.start();
    }
    return () => this.unregisterRoot(id);
  }
  /**
   * Unregister a root from the scheduler.
   * Cleans up all job state listeners for this root's jobs.
   * The last root to unregister stops the RAF loop.
   * @param {string} id - The root ID to unregister
   * @returns {void}
   */
  unregisterRoot(id) {
    const root = this.roots.get(id);
    if (!root) return;
    for (const jobId of root.jobs.keys()) {
      this.jobStateListeners.delete(jobId);
    }
    this.roots.delete(id);
    if (this.roots.size === 0) {
      this.stop();
    }
  }
  //* Phase Management Methods ================================
  /**
   * Add a named phase to the scheduler's execution order.
   * Marks all roots for rebuild to incorporate the new phase.
   * @param {string} name - The phase name (e.g., 'physics', 'postprocess')
   * @param {AddPhaseOptions} [options] - Positioning options (before/after other phases)
   * @returns {void}
   * @example
   * scheduler.addPhase('physics', { before: 'update' });
   * scheduler.addPhase('postprocess', { after: 'render' });
   */
  addPhase(name, options) {
    this.phaseGraph.addPhase(name, options);
    for (const root of this.roots.values()) {
      root.needsRebuild = true;
    }
  }
  /**
   * Check if a phase exists in the scheduler.
   * @param {string} name - The phase name to check
   * @returns {boolean} True if the phase exists
   */
  hasPhase(name) {
    return this.phaseGraph.hasPhase(name);
  }
  //* Global Job Registration Methods (Deprecated APIs) ================================
  /**
   * Register a global job that runs once per frame (not per-root).
   * Used internally by deprecated addEffect/addAfterEffect APIs.
   * @param {'before' | 'after'} phase - When to run: 'before' all roots or 'after' all roots
   * @param {string} id - Unique identifier for this global job
   * @param {(timestamp: number) => void} callback - Function called each frame with RAF timestamp
   * @returns {() => void} Unsubscribe function to remove this global job
   * @deprecated Use useFrame with phases instead
   */
  registerGlobal(phase, id, callback) {
    const job = { id, callback };
    if (phase === "before") {
      this.globalBeforeJobs.set(id, job);
    } else {
      this.globalAfterJobs.set(id, job);
    }
    return () => {
      if (phase === "before") this.globalBeforeJobs.delete(id);
      else this.globalAfterJobs.delete(id);
    };
  }
  //* Idle Callback Methods (Deprecated API) ================================
  /**
   * Register an idle callback that fires when the loop stops.
   * Used internally by deprecated addTail API.
   * @param {(timestamp: number) => void} callback - Function called when loop becomes idle
   * @returns {() => void} Unsubscribe function to remove this idle callback
   * @deprecated Use demand mode with invalidate() instead
   */
  onIdle(callback) {
    this.idleCallbacks.add(callback);
    return () => this.idleCallbacks.delete(callback);
  }
  /**
   * Notify all registered idle callbacks.
   * Called when the loop stops in demand mode.
   * @param {number} timestamp - The RAF timestamp when idle occurred
   * @returns {void}
   * @private
   */
  notifyIdle(timestamp) {
    for (const cb of this.idleCallbacks) {
      try {
        cb(timestamp);
      } catch (error) {
        console.error("[Scheduler] Error in idle callback:", error);
      }
    }
  }
  //* Job Registration & Management Methods ================================
  /**
   * Register a job (frame callback) with a specific root.
   * This is the core registration method used by useFrame internally.
   * @param {FrameNextCallback} callback - The function to call each frame
   * @param {JobOptions & { rootId?: string; system?: boolean }} [options] - Job configuration
   * @param {string} [options.rootId] - Target root ID (defaults to first registered root)
   * @param {string} [options.id] - Unique job ID (auto-generated if not provided)
   * @param {string} [options.phase] - Execution phase (defaults to 'update')
   * @param {number} [options.priority] - Priority within phase (higher = earlier, default 0)
   * @param {number} [options.fps] - FPS throttle limit
   * @param {boolean} [options.drop] - Drop frames when behind (default true)
   * @param {boolean} [options.enabled] - Whether job is active (default true)
   * @param {boolean} [options.system] - Internal flag for system jobs (not user-facing)
   * @returns {() => void} Unsubscribe function to remove this job
   */
  register(callback, options = {}) {
    const rootId = options.rootId;
    const root = rootId ? this.roots.get(rootId) : this.roots.values().next().value;
    if (!root) {
      console.warn("[Scheduler] No root registered. Is this inside a Canvas?");
      return () => {
      };
    }
    const id = options.id ?? this.generateJobId();
    let phase = options.phase ?? "update";
    if (!options.phase && (options.before || options.after)) {
      phase = this.phaseGraph.resolveConstraintPhase(options.before, options.after);
    }
    const before = this.normalizeConstraints(options.before);
    const after = this.normalizeConstraints(options.after);
    const job = {
      id,
      callback,
      phase,
      before,
      after,
      priority: options.priority ?? 0,
      index: this.nextJobIndex++,
      fps: options.fps,
      drop: options.drop ?? true,
      enabled: options.enabled ?? true,
      system: options.system ?? false
    };
    if (root.jobs.has(id)) {
      console.warn(`[useFrame] Job with id "${id}" already exists, replacing`);
    }
    root.jobs.set(id, job);
    root.needsRebuild = true;
    return () => this.unregister(id, root.id);
  }
  /**
   * Unregister a job by its ID.
   * Searches all roots if rootId is not provided.
   * @param {string} id - The job ID to unregister
   * @param {string} [rootId] - Optional root ID to search (searches all if not provided)
   * @returns {void}
   */
  unregister(id, rootId) {
    const root = rootId ? this.roots.get(rootId) : Array.from(this.roots.values()).find((r) => r.jobs.has(id));
    if (root?.jobs.delete(id)) {
      root.needsRebuild = true;
      this.jobStateListeners.delete(id);
    }
  }
  /**
   * Update a job's options dynamically.
   * Searches all roots to find the job by ID.
   * Phase/constraint changes trigger a rebuild of the sorted job list.
   * @param {string} id - The job ID to update
   * @param {Partial<JobOptions>} options - The options to update
   * @returns {void}
   */
  updateJob(id, options) {
    let job;
    let root;
    for (const r of this.roots.values()) {
      job = r.jobs.get(id);
      if (job) {
        root = r;
        break;
      }
    }
    if (!job || !root) return;
    if (options.priority !== void 0) job.priority = options.priority;
    if (options.fps !== void 0) job.fps = options.fps;
    if (options.drop !== void 0) job.drop = options.drop;
    if (options.enabled !== void 0) {
      const wasEnabled = job.enabled;
      job.enabled = options.enabled;
      if (!wasEnabled && job.enabled) resetJobTiming(job);
      if (wasEnabled !== job.enabled) root.needsRebuild = true;
    }
    if (options.phase !== void 0 || options.before !== void 0 || options.after !== void 0) {
      if (options.phase) job.phase = options.phase;
      if (options.before !== void 0) job.before = this.normalizeConstraints(options.before);
      if (options.after !== void 0) job.after = this.normalizeConstraints(options.after);
      root.needsRebuild = true;
    }
  }
  //* Job State Management Methods ================================
  /**
   * Check if a job is currently paused (disabled).
   * @param {string} id - The job ID to check
   * @returns {boolean} True if the job exists and is paused
   */
  isJobPaused(id) {
    for (const root of this.roots.values()) {
      const job = root.jobs.get(id);
      if (job) return !job.enabled;
    }
    return false;
  }
  /**
   * Subscribe to state changes for a specific job.
   * Listener is called when job is paused or resumed.
   * @param {string} id - The job ID to subscribe to
   * @param {() => void} listener - Callback invoked on state changes
   * @returns {() => void} Unsubscribe function
   */
  subscribeJobState(id, listener) {
    if (!this.jobStateListeners.has(id)) {
      this.jobStateListeners.set(id, /* @__PURE__ */ new Set());
    }
    this.jobStateListeners.get(id).add(listener);
    return () => {
      this.jobStateListeners.get(id)?.delete(listener);
      if (this.jobStateListeners.get(id)?.size === 0) {
        this.jobStateListeners.delete(id);
      }
    };
  }
  /**
   * Notify all listeners that a job's state has changed.
   * @param {string} id - The job ID that changed
   * @returns {void}
   * @private
   */
  notifyJobStateChange(id) {
    this.jobStateListeners.get(id)?.forEach((listener) => listener());
  }
  /**
   * Pause a job by ID (sets enabled=false).
   * Notifies any subscribed state listeners.
   * @param {string} id - The job ID to pause
   * @returns {void}
   */
  pauseJob(id) {
    this.updateJob(id, { enabled: false });
    this.notifyJobStateChange(id);
  }
  /**
   * Resume a paused job by ID (sets enabled=true).
   * Resets job timing to prevent frame accumulation.
   * Notifies any subscribed state listeners.
   * @param {string} id - The job ID to resume
   * @returns {void}
   */
  resumeJob(id) {
    this.updateJob(id, { enabled: true });
    this.notifyJobStateChange(id);
  }
  //* Frame Loop Control Methods ================================
  /**
   * Start the requestAnimationFrame loop.
   * Resets timing state (elapsedTime, frameCount) on start.
   * No-op if already running.
   * @returns {void}
   */
  start() {
    if (this.loopState.running) return;
    const { elapsedTime, createdAt } = this.loopState;
    let adjustedCreated = 0;
    if (this.stoppedTime > 0) {
      adjustedCreated = createdAt - (performance.now() - this.stoppedTime);
      this.stoppedTime = 0;
    }
    Object.assign(this.loopState, {
      running: true,
      elapsedTime: elapsedTime ?? 0,
      lastTime: performance.now(),
      createdAt: adjustedCreated > 0 ? adjustedCreated : performance.now(),
      frameCount: 0,
      rafHandle: requestAnimationFrame(this.loop)
    });
  }
  /**
   * Stop the requestAnimationFrame loop.
   * Cancels any pending RAF callback.
   * No-op if not running.
   * @returns {void}
   */
  stop() {
    if (!this.loopState.running) return;
    this.loopState.running = false;
    if (this.loopState.rafHandle !== null) {
      cancelAnimationFrame(this.loopState.rafHandle);
      this.loopState.rafHandle = null;
    }
    this.stoppedTime = performance.now();
  }
  /**
   * Request frames to be rendered in demand mode.
   * Accumulates pending frames (capped at 60) and starts the loop if not running.
   * No-op if frameloop is not 'demand'.
   * @param {number} [frames=1] - Number of frames to request
   * @param {boolean} [stackFrames=false] - Whether to add frames to existing pending count
   *   - `false` (default): Sets pending frames to the specified value (replaces existing count)
   *   - `true`: Adds frames to existing pending count (useful for accumulating invalidations)
   * @returns {void}
   * @example
   * // Request a single frame render
   * scheduler.invalidate();
   *
   * @example
   * // Request 5 frames (e.g., for animations)
   * scheduler.invalidate(5);
   *
   * @example
   * // Set pending frames to exactly 3 (don't stack with existing)
   * scheduler.invalidate(3, false);
   *
   * @example
   * // Add 2 more frames to existing pending count
   * scheduler.invalidate(2, true);
   */
  invalidate(frames = 1, stackFrames = false) {
    if (this._frameloop !== "demand") return;
    const baseFrames = stackFrames ? this.pendingFrames : 0;
    this.pendingFrames = Math.min(60, baseFrames + frames);
    if (!this.loopState.running && this.pendingFrames > 0) this.start();
  }
  /**
   * Reset timing state for deterministic testing.
   * Preserves jobs and roots but resets lastTime, frameCount, elapsedTime, etc.
   * @returns {void}
   */
  resetTiming() {
    this.loopState.lastTime = null;
    this.loopState.frameCount = 0;
    this.loopState.elapsedTime = 0;
    this.loopState.createdAt = performance.now();
  }
  //* Manual Stepping Methods ================================
  /**
   * Manually execute a single frame for all roots.
   * Useful for frameloop='never' mode or testing scenarios.
   * @param {number} [timestamp] - Optional timestamp (defaults to performance.now())
   * @returns {void}
   * @example
   * // Manual control mode
   * scheduler.frameloop = 'never';
   * scheduler.step(); // Execute one frame
   */
  step(timestamp) {
    const now = timestamp ?? performance.now();
    this.executeFrame(now);
  }
  /**
   * Manually execute a single job by its ID.
   * Useful for testing individual job callbacks in isolation.
   * @param {string} id - The job ID to step
   * @param {number} [timestamp] - Optional timestamp (defaults to performance.now())
   * @returns {void}
   */
  stepJob(id, timestamp) {
    let job;
    let root;
    for (const r of this.roots.values()) {
      job = r.jobs.get(id);
      if (job) {
        root = r;
        break;
      }
    }
    if (!job || !root) {
      console.warn(`[Scheduler] Job "${id}" not found`);
      return;
    }
    const now = timestamp ?? performance.now();
    const deltaMs = this.loopState.lastTime !== null ? now - this.loopState.lastTime : 0;
    const delta = deltaMs / 1e3;
    const elapsed = now - this.loopState.createdAt;
    const rootState = root.getState();
    const frameState = {
      ...rootState,
      time: now,
      delta,
      elapsed,
      frame: this.loopState.frameCount
    };
    try {
      job.callback(frameState, delta);
    } catch (error) {
      console.error(`[Scheduler] Error in job "${job.id}":`, error);
    }
  }
  /**
   * Execute a single frame across all roots.
   * Order: globalBefore → each root's jobs → globalAfter
   * @param {number} timestamp - RAF timestamp in milliseconds
   * @returns {void}
   * @private
   */
  executeFrame(timestamp) {
    const deltaMs = this.loopState.lastTime !== null ? timestamp - this.loopState.lastTime : 0;
    const delta = deltaMs / 1e3;
    this.loopState.lastTime = timestamp;
    this.loopState.frameCount++;
    this.loopState.elapsedTime += deltaMs;
    this.runGlobalJobs(this.globalBeforeJobs, timestamp);
    for (const root of this.roots.values()) {
      this.tickRoot(root, timestamp, delta);
    }
    this.runGlobalJobs(this.globalAfterJobs, timestamp);
  }
  /**
   * Run all global jobs from a job map.
   * Catches and logs errors without stopping execution.
   * @param {Map<string, GlobalJob>} jobs - The global jobs map to execute
   * @param {number} timestamp - RAF timestamp in milliseconds
   * @returns {void}
   * @private
   */
  runGlobalJobs(jobs, timestamp) {
    for (const job of jobs.values()) {
      try {
        job.callback(timestamp);
      } catch (error) {
        console.error(`[Scheduler] Error in global job "${job.id}":`, error);
      }
    }
  }
  /**
   * Execute all jobs for a single root in sorted order.
   * Rebuilds sorted job list if needed, then dispatches each job.
   * Errors are caught and propagated to the root's error boundary.
   * @param {RootEntry} root - The root entry to tick
   * @param {number} timestamp - RAF timestamp in milliseconds
   * @param {number} delta - Time since last frame in seconds
   * @returns {void}
   * @private
   */
  tickRoot(root, timestamp, delta) {
    if (root.needsRebuild) {
      root.sortedJobs = rebuildSortedJobs(root.jobs, this.phaseGraph);
      root.needsRebuild = false;
    }
    const rootState = root.getState();
    if (!rootState) return;
    const frameState = {
      ...rootState,
      time: timestamp,
      delta,
      elapsed: this.loopState.elapsedTime / 1e3,
      // Convert ms to seconds
      frame: this.loopState.frameCount
    };
    for (const job of root.sortedJobs) {
      if (!shouldRun(job, timestamp)) continue;
      try {
        job.callback(frameState, delta);
      } catch (error) {
        console.error(`[Scheduler] Error in job "${job.id}":`, error);
        rootState.setError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
  //* Debug & Inspection Methods ================================
  /**
   * Get the total number of registered jobs across all roots.
   * Includes both per-root jobs and global before/after jobs.
   * @returns {number} Total job count
   */
  getJobCount() {
    let count = 0;
    for (const root of this.roots.values()) {
      count += root.jobs.size;
    }
    return count + this.globalBeforeJobs.size + this.globalAfterJobs.size;
  }
  /**
   * Get all registered job IDs across all roots.
   * Includes both per-root jobs and global before/after jobs.
   * @returns {string[]} Array of all job IDs
   */
  getJobIds() {
    const ids = [];
    for (const root of this.roots.values()) {
      ids.push(...root.jobs.keys());
    }
    ids.push(...this.globalBeforeJobs.keys());
    ids.push(...this.globalAfterJobs.keys());
    return ids;
  }
  /**
   * Get the number of registered roots (Canvas instances).
   * @returns {number} Number of registered roots
   */
  getRootCount() {
    return this.roots.size;
  }
  /**
   * Check if any user (non-system) jobs are registered in a specific phase.
   * Used by the default render job to know if a user has taken over rendering.
   *
   * @param phase The phase to check
   * @param rootId Optional root ID to check (checks all roots if not provided)
   * @returns true if any user jobs exist in the phase
   */
  hasUserJobsInPhase(phase, rootId) {
    const rootsToCheck = rootId ? [this.roots.get(rootId)].filter(Boolean) : Array.from(this.roots.values());
    return rootsToCheck.some((root) => {
      if (!root) return false;
      for (const job of root.jobs.values()) {
        if (job.phase === phase && !job.system && job.enabled) return true;
      }
      return false;
    });
  }
  //* Utility Methods ================================
  /**
   * Generate a unique root ID for automatic root registration.
   * @returns {string} A unique root ID in the format 'root_N'
   */
  generateRootId() {
    return `root_${this.nextRootIndex++}`;
  }
  /**
   * Generate a unique job ID.
   * @returns {string} A unique job ID in the format 'job_N'
   * @private
   */
  generateJobId() {
    return `job_${this.nextJobIndex}`;
  }
  /**
   * Normalize before/after constraints to a Set.
   * Handles undefined, single string, or array inputs.
   * @param {string | string[] | undefined} value - The constraint value(s)
   * @returns {Set<string>} Normalized Set of constraint strings
   * @private
   */
  normalizeConstraints(value) {
    if (!value) return /* @__PURE__ */ new Set();
    if (Array.isArray(value)) return new Set(value);
    return /* @__PURE__ */ new Set([value]);
  }
};
//* Static State & Methods (Singlton Usage) ================================
__publicField(_Scheduler, "instance", null);
let Scheduler = _Scheduler;
const getScheduler = () => Scheduler.get();
if (hmrData) {
  hmrData.accept?.();
}

function useFrame(callback, priorityOrOptions) {
  const store = useStore();
  const getRootId = React__namespace.useCallback(() => {
    const state = store.getState();
    return state.internal.rootId;
  }, [store]);
  const optionsKey = typeof priorityOrOptions === "number" ? `p:${priorityOrOptions}` : priorityOrOptions ? JSON.stringify({
    id: priorityOrOptions.id,
    phase: priorityOrOptions.phase,
    priority: priorityOrOptions.priority,
    fps: priorityOrOptions.fps,
    drop: priorityOrOptions.drop,
    enabled: priorityOrOptions.enabled,
    before: priorityOrOptions.before,
    after: priorityOrOptions.after
  }) : "";
  const options = React__namespace.useMemo(() => {
    return typeof priorityOrOptions === "number" ? { priority: priorityOrOptions } : priorityOrOptions ?? {};
  }, [optionsKey]);
  const reactId = React__namespace.useId();
  const id = options.id ?? reactId;
  const callbackRef = useMutableCallback(callback);
  const isLegacyPriority = typeof priorityOrOptions === "number" && priorityOrOptions > 0;
  useIsomorphicLayoutEffect(() => {
    if (!callback) return;
    const scheduler = getScheduler();
    const rootId = getRootId();
    const state = store.getState();
    if (isLegacyPriority) {
      state.internal.priority++;
      let parentRoot = state.previousRoot;
      while (parentRoot) {
        const parentState = parentRoot.getState();
        if (parentState?.internal) parentState.internal.priority++;
        parentRoot = parentState?.previousRoot;
      }
      notifyDepreciated({
        heading: "useFrame with numeric priority is deprecated",
        body: 'Using useFrame(callback, number) to control render order is deprecated.\n\nFor custom rendering, use: useFrame(callback, { phase: "render" })\nFor execution order within update phase, use: useFrame(callback, { priority: number })',
        link: "https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe"
      });
    }
    const wrappedCallback = (frameState, delta) => {
      callbackRef.current?.(frameState, delta);
    };
    const unregister = scheduler.register(wrappedCallback, {
      id,
      rootId,
      ...options
    });
    return () => {
      unregister();
      if (isLegacyPriority) {
        const currentState = store.getState();
        if (currentState.internal) {
          currentState.internal.priority--;
          let parentRoot = currentState.previousRoot;
          while (parentRoot) {
            const parentState = parentRoot.getState();
            if (parentState?.internal) parentState.internal.priority--;
            parentRoot = parentState?.previousRoot;
          }
        }
      }
    };
  }, [store, id, optionsKey, isLegacyPriority]);
  const isPaused = React__namespace.useSyncExternalStore(
    // Subscribe function
    React__namespace.useCallback(
      (onStoreChange) => {
        return getScheduler().subscribeJobState(id, onStoreChange);
      },
      [id]
    ),
    // getSnapshot function
    React__namespace.useCallback(() => getScheduler().isJobPaused(id), [id]),
    // getServerSnapshot function (SSR)
    React__namespace.useCallback(() => false, [])
  );
  const controls = React__namespace.useMemo(() => {
    const scheduler = getScheduler();
    return {
      /** The job's unique ID */
      id,
      /**
       * Access to the global scheduler for frame loop control.
       * Use for controlling the entire frame loop, adding phases, etc.
       */
      scheduler,
      /**
       * Manually step this job only.
       * Bypasses FPS limiting - always runs.
       * @param timestamp Optional timestamp (defaults to performance.now())
       */
      step: (timestamp) => {
        getScheduler().stepJob(id, timestamp);
      },
      /**
       * Manually step ALL jobs in the scheduler.
       * Useful for frameloop='never' mode.
       * @param timestamp Optional timestamp (defaults to performance.now())
       */
      stepAll: (timestamp) => {
        getScheduler().step(timestamp);
      },
      /**
       * Pause this job (set enabled=false).
       * Job remains registered but won't run.
       */
      pause: () => {
        getScheduler().pauseJob(id);
      },
      /**
       * Resume this job (set enabled=true).
       */
      resume: () => {
        getScheduler().resumeJob(id);
      },
      /**
       * Reactive paused state - automatically updates when pause/resume is called.
       * No need for forceUpdate() in your components.
       */
      isPaused
    };
  }, [id, isPaused]);
  return controls;
}

const IsObject = (url) => url === Object(url) && !Array.isArray(url) && typeof url !== "function";
function getUrls(input) {
  if (typeof input === "string") return [input];
  if (Array.isArray(input)) return input;
  return Object.values(input);
}
function allUrlsCached(urls, textureCache) {
  return urls.every((url) => textureCache.has(url));
}
function buildFromCache(input, textureCache) {
  if (typeof input === "string") {
    return textureCache.get(input);
  } else if (Array.isArray(input)) {
    return input.map((url) => textureCache.get(url));
  } else {
    const result = {};
    const objInput = input;
    for (const key in objInput) {
      result[key] = textureCache.get(objInput[key]);
    }
    return result;
  }
}
function useTexture(input, optionsOrOnLoad) {
  const renderer = useThree((state) => state.internal.actualRenderer);
  const store = useStore();
  const textureCache = useThree((state) => state.textures);
  const options = typeof optionsOrOnLoad === "function" ? { onLoad: optionsOrOnLoad } : optionsOrOnLoad ?? {};
  const { onLoad, cache = false } = options;
  const urls = React.useMemo(() => getUrls(input), [input]);
  const cachedResult = React.useMemo(() => {
    if (!cache) return null;
    if (!allUrlsCached(urls, textureCache)) return null;
    return buildFromCache(input, textureCache);
  }, [cache, urls, textureCache, input]);
  const loadedTextures = useLoader(
    three.TextureLoader,
    IsObject(input) ? Object.values(input) : input
  );
  React.useLayoutEffect(() => {
    if (!cachedResult) onLoad?.(loadedTextures);
  }, [onLoad, cachedResult, loadedTextures]);
  React.useEffect(() => {
    if (cachedResult) return;
    if ("initTexture" in renderer) {
      let textureArray = [];
      if (Array.isArray(loadedTextures)) {
        textureArray = loadedTextures;
      } else if (loadedTextures instanceof three.Texture) {
        textureArray = [loadedTextures];
      } else if (IsObject(loadedTextures)) {
        textureArray = Object.values(loadedTextures);
      }
      textureArray.forEach((texture) => {
        if (texture instanceof three.Texture) {
          renderer.initTexture(texture);
        }
      });
    }
  }, [renderer, loadedTextures, cachedResult]);
  const mappedTextures = React.useMemo(() => {
    if (cachedResult) return cachedResult;
    if (IsObject(input)) {
      const keyed = {};
      const textureArray = loadedTextures;
      let i = 0;
      for (const key in input) keyed[key] = textureArray[i++];
      return keyed;
    } else {
      return loadedTextures;
    }
  }, [input, loadedTextures, cachedResult]);
  React.useEffect(() => {
    if (!cache) return;
    if (cachedResult) return;
    const set = store.setState;
    const urlTextureMap = [];
    if (typeof input === "string") {
      urlTextureMap.push([input, mappedTextures]);
    } else if (Array.isArray(input)) {
      const textureArray = mappedTextures;
      input.forEach((url, i) => urlTextureMap.push([url, textureArray[i]]));
    } else if (IsObject(input)) {
      const textureRecord = mappedTextures;
      for (const key in input) {
        const url = input[key];
        urlTextureMap.push([url, textureRecord[key]]);
      }
    }
    set((state) => {
      const newMap = new Map(state.textures);
      let changed = false;
      for (const [url, texture] of urlTextureMap) {
        if (!newMap.has(url)) {
          newMap.set(url, texture);
          changed = true;
        }
      }
      return changed ? { textures: newMap } : state;
    });
  }, [cache, input, mappedTextures, store, cachedResult]);
  return mappedTextures;
}
useTexture.preload = (url) => useLoader.preload(three.TextureLoader, url);
useTexture.clear = (input) => useLoader.clear(three.TextureLoader, input);
const Texture = ({
  children,
  input,
  onLoad,
  cache
}) => {
  const options = typeof onLoad === "function" ? { onLoad, cache } : { ...onLoad, cache };
  const ret = useTexture(input, options);
  return /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: children?.(ret) });
};

function getTextureValue(entry) {
  if (entry instanceof three.Texture) return entry;
  if (entry && typeof entry === "object" && "value" in entry && entry.value instanceof three.Texture) {
    return entry.value;
  }
  return null;
}
function useTextures() {
  const store = useStore();
  return React.useMemo(() => {
    const set = store.setState;
    const getState = store.getState;
    const add = (key, value) => {
      set((state) => {
        const newMap = new Map(state.textures);
        newMap.set(key, value);
        return { textures: newMap };
      });
    };
    const addMultiple = (items) => {
      set((state) => {
        const newMap = new Map(state.textures);
        const entries = items instanceof Map ? items.entries() : Object.entries(items);
        for (const [key, value] of entries) {
          newMap.set(key, value);
        }
        return { textures: newMap };
      });
    };
    const remove = (key) => {
      set((state) => {
        const newMap = new Map(state.textures);
        newMap.delete(key);
        return { textures: newMap };
      });
    };
    const removeMultiple = (keys) => {
      set((state) => {
        const newMap = new Map(state.textures);
        for (const key of keys) newMap.delete(key);
        return { textures: newMap };
      });
    };
    const dispose = (key) => {
      const entry = getState().textures.get(key);
      if (entry) {
        const tex = getTextureValue(entry);
        tex?.dispose();
      }
      remove(key);
    };
    const disposeMultiple = (keys) => {
      const textures = getState().textures;
      for (const key of keys) {
        const entry = textures.get(key);
        if (entry) {
          const tex = getTextureValue(entry);
          tex?.dispose();
        }
      }
      removeMultiple(keys);
    };
    const disposeAll = () => {
      const textures = getState().textures;
      for (const entry of textures.values()) {
        const tex = getTextureValue(entry);
        tex?.dispose();
      }
      set({ textures: /* @__PURE__ */ new Map() });
    };
    return {
      // Getter for the textures Map (reactive via getState)
      get textures() {
        return getState().textures;
      },
      // Read
      get: (key) => getState().textures.get(key),
      has: (key) => getState().textures.has(key),
      // Write
      add,
      addMultiple,
      // Remove (cache only)
      remove,
      removeMultiple,
      // Dispose (GPU + cache)
      dispose,
      disposeMultiple,
      disposeAll
    };
  }, [store]);
}

function useStore() {
  const store = React.useContext(context);
  if (!store) throw new Error("R3F: Hooks can only be used within the Canvas component!");
  return store;
}
function useThree(selector = (state) => state, equalityFn) {
  return useStore()(selector, equalityFn);
}
function useInstanceHandle(ref) {
  const instance = React.useRef(null);
  React.useImperativeHandle(instance, () => ref.current.__r3f, [ref]);
  return instance;
}
function useGraph(object) {
  return React.useMemo(() => buildGraph(object), [object]);
}

let effectId = 0;
function addEffect(callback) {
  notifyDepreciated({
    heading: "addEffect is deprecated",
    body: 'Use useFrame(callback, { phase: "start" }) instead.\naddEffect will be removed in a future version.',
    link: "https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe"
  });
  const id = `legacy_effect_${effectId++}`;
  return getScheduler().registerGlobal("before", id, callback);
}
function addAfterEffect(callback) {
  notifyDepreciated({
    heading: "addAfterEffect is deprecated",
    body: 'Use useFrame(callback, { phase: "finish" }) instead.\naddAfterEffect will be removed in a future version.',
    link: "https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe"
  });
  const id = `legacy_afterEffect_${effectId++}`;
  return getScheduler().registerGlobal("after", id, callback);
}
function addTail(callback) {
  notifyDepreciated({
    heading: "addTail is deprecated",
    body: "Use scheduler.onIdle(callback) instead.\naddTail will be removed in a future version.",
    link: "https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe"
  });
  return getScheduler().onIdle(callback);
}
function invalidate(state, frames = 1, stackFrames = false) {
  getScheduler().invalidate(frames, stackFrames);
}
function advance(timestamp, runGlobalEffects = true, state, frame) {
  getScheduler().step(timestamp);
}

const version = "9.4.2";
const packageData = {
	version: version};

function createReconciler(config) {
  const reconciler2 = Reconciler__default(config);
  reconciler2.injectIntoDevTools();
  return reconciler2;
}
const NoEventPriority = 0;
const catalogue = {};
const PREFIX_REGEX = /^three(?=[A-Z])/;
const toPascalCase = (type) => `${type[0].toUpperCase()}${type.slice(1)}`;
let i = 0;
const isConstructor = (object) => typeof object === "function";
function extend(objects) {
  if (isConstructor(objects)) {
    const Component = `${i++}`;
    catalogue[Component] = objects;
    return Component;
  } else {
    Object.assign(catalogue, objects);
  }
}
function validateInstance(type, props) {
  const name = toPascalCase(type);
  const target = catalogue[name];
  if (type !== "primitive" && !target)
    throw new Error(
      `R3F: ${name} is not part of the THREE namespace! Did you forget to extend? See: https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively`
    );
  if (type === "primitive" && !props.object) throw new Error(`R3F: Primitives without 'object' are invalid!`);
  if (props.args !== void 0 && !Array.isArray(props.args)) throw new Error("R3F: The args prop must be an array!");
}
function createInstance(type, props, root) {
  type = toPascalCase(type) in catalogue ? type : type.replace(PREFIX_REGEX, "");
  validateInstance(type, props);
  if (type === "primitive" && props.object?.__r3f) delete props.object.__r3f;
  return prepare(props.object, root, type, props);
}
function hideInstance(instance) {
  if (!instance.isHidden) {
    if (instance.props.attach && instance.parent?.object) {
      detach(instance.parent, instance);
    } else if (isObject3D(instance.object)) {
      instance.object.visible = false;
    }
    instance.isHidden = true;
    invalidateInstance(instance);
  }
}
function unhideInstance(instance) {
  if (instance.isHidden) {
    if (instance.props.attach && instance.parent?.object) {
      attach(instance.parent, instance);
    } else if (isObject3D(instance.object) && instance.props.visible !== false) {
      instance.object.visible = true;
    }
    instance.isHidden = false;
    invalidateInstance(instance);
  }
}
function handleContainerEffects(parent, child, beforeChild) {
  const state = child.root.getState();
  if (!parent.parent && parent.object !== state.scene) return;
  if (!child.object) {
    const target = catalogue[toPascalCase(child.type)];
    child.object = child.props.object ?? new target(...child.props.args ?? []);
    child.object.__r3f = child;
  }
  applyProps(child.object, child.props);
  if (child.props.attach) {
    attach(parent, child);
  } else if (isObject3D(child.object) && isObject3D(parent.object)) {
    const childIndex = parent.object.children.indexOf(beforeChild?.object);
    if (beforeChild && childIndex !== -1) {
      const existingIndex = parent.object.children.indexOf(child.object);
      if (existingIndex !== -1) {
        parent.object.children.splice(existingIndex, 1);
        const adjustedIndex = existingIndex < childIndex ? childIndex - 1 : childIndex;
        parent.object.children.splice(adjustedIndex, 0, child.object);
      } else {
        child.object.parent = parent.object;
        parent.object.children.splice(childIndex, 0, child.object);
        child.object.dispatchEvent({ type: "added" });
        parent.object.dispatchEvent({ type: "childadded", child: child.object });
      }
    } else {
      parent.object.add(child.object);
    }
  }
  for (const childInstance of child.children) handleContainerEffects(child, childInstance);
  invalidateInstance(child);
}
function appendChild(parent, child) {
  if (!child) return;
  if (child.parent === parent) {
    const existingIndex = parent.children.indexOf(child);
    if (existingIndex !== -1) parent.children.splice(existingIndex, 1);
  }
  child.parent = parent;
  parent.children.push(child);
  handleContainerEffects(parent, child);
}
function insertBefore(parent, child, beforeChild) {
  if (!child || !beforeChild) return;
  if (child.parent === parent) {
    const existingIndex = parent.children.indexOf(child);
    if (existingIndex !== -1) parent.children.splice(existingIndex, 1);
  }
  child.parent = parent;
  const beforeChildIndex = parent.children.indexOf(beforeChild);
  if (beforeChildIndex !== -1) parent.children.splice(beforeChildIndex, 0, child);
  else parent.children.push(child);
  handleContainerEffects(parent, child, beforeChild);
}
function disposeOnIdle(object) {
  if (typeof object.dispose === "function") {
    const handleDispose = () => {
      try {
        object.dispose();
      } catch {
      }
    };
    if (typeof IS_REACT_ACT_ENVIRONMENT !== "undefined") handleDispose();
    else scheduler.unstable_scheduleCallback(scheduler.unstable_IdlePriority, handleDispose);
  }
}
function removeChild(parent, child, dispose) {
  if (!child) return;
  child.parent = null;
  const childIndex = parent.children.indexOf(child);
  if (childIndex !== -1) parent.children.splice(childIndex, 1);
  if (child.props.attach) {
    detach(parent, child);
  } else if (isObject3D(child.object) && isObject3D(parent.object)) {
    parent.object.remove(child.object);
    removeInteractivity(findInitialRoot(child), child.object);
  }
  const shouldDispose = child.props.dispose !== null && dispose !== false;
  for (let i2 = child.children.length - 1; i2 >= 0; i2--) {
    const node = child.children[i2];
    removeChild(child, node, shouldDispose);
  }
  child.children.length = 0;
  delete child.object.__r3f;
  if (shouldDispose && child.type !== "primitive" && child.object.type !== "Scene") {
    disposeOnIdle(child.object);
  }
  if (dispose === void 0) invalidateInstance(child);
}
function setFiberRef(fiber, publicInstance) {
  for (const _fiber of [fiber, fiber.alternate]) {
    if (_fiber !== null) {
      if (typeof _fiber.ref === "function") {
        _fiber.refCleanup?.();
        const cleanup = _fiber.ref(publicInstance);
        if (typeof cleanup === "function") _fiber.refCleanup = cleanup;
      } else if (_fiber.ref) {
        _fiber.ref.current = publicInstance;
      }
    }
  }
}
const reconstructed = [];
function swapInstances() {
  for (const [instance] of reconstructed) {
    const parent = instance.parent;
    if (parent) {
      if (instance.props.attach) {
        detach(parent, instance);
      } else if (isObject3D(instance.object) && isObject3D(parent.object)) {
        parent.object.remove(instance.object);
      }
      for (const child of instance.children) {
        if (child.props.attach) {
          detach(instance, child);
        } else if (isObject3D(child.object) && isObject3D(instance.object)) {
          instance.object.remove(child.object);
        }
      }
    }
    if (instance.isHidden) unhideInstance(instance);
    if (instance.object.__r3f) delete instance.object.__r3f;
    if (instance.type !== "primitive") disposeOnIdle(instance.object);
  }
  for (const [instance, props, fiber] of reconstructed) {
    instance.props = props;
    const parent = instance.parent;
    if (parent) {
      const target = catalogue[toPascalCase(instance.type)];
      instance.object = instance.props.object ?? new target(...instance.props.args ?? []);
      instance.object.__r3f = instance;
      setFiberRef(fiber, instance.object);
      applyProps(instance.object, instance.props);
      if (instance.props.attach) {
        attach(parent, instance);
      } else if (isObject3D(instance.object) && isObject3D(parent.object)) {
        parent.object.add(instance.object);
      }
      for (const child of instance.children) {
        if (child.props.attach) {
          attach(instance, child);
        } else if (isObject3D(child.object) && isObject3D(instance.object)) {
          instance.object.add(child.object);
        }
      }
      invalidateInstance(instance);
    }
  }
  reconstructed.length = 0;
}
const handleTextInstance = () => {
};
const NO_CONTEXT = {};
let currentUpdatePriority = NoEventPriority;
const NoFlags = 0;
const Update = 4;
const reconciler = /* @__PURE__ */ createReconciler({
  isPrimaryRenderer: false,
  warnsIfNotActing: false,
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  createInstance,
  removeChild,
  appendChild,
  appendInitialChild: appendChild,
  insertBefore,
  appendChildToContainer(container, child) {
    const target = container.getState().internal.container ?? container.getState().scene;
    const instance = target.__r3f;
    if (!child || !instance) return;
    appendChild(instance, child);
  },
  removeChildFromContainer(container, child) {
    const target = container.getState().internal.container ?? container.getState().scene;
    const instance = target.__r3f;
    if (!child || !instance) return;
    removeChild(instance, child);
  },
  insertInContainerBefore(container, child, beforeChild) {
    const target = container.getState().internal.container ?? container.getState().scene;
    const instance = target.__r3f;
    if (!child || !beforeChild || !instance) return;
    insertBefore(instance, child, beforeChild);
  },
  getRootHostContext: () => NO_CONTEXT,
  getChildHostContext: () => NO_CONTEXT,
  commitUpdate(instance, type, oldProps, newProps, fiber) {
    validateInstance(type, newProps);
    let reconstruct = false;
    if (instance.type === "primitive" && oldProps.object !== newProps.object) reconstruct = true;
    else if (newProps.args?.length !== oldProps.args?.length) reconstruct = true;
    else if (newProps.args?.some((value, index) => value !== oldProps.args?.[index])) reconstruct = true;
    if (reconstruct) {
      reconstructed.push([instance, { ...newProps }, fiber]);
    } else {
      const changedProps = diffProps(instance, newProps);
      if (Object.keys(changedProps).length) {
        Object.assign(instance.props, changedProps);
        applyProps(instance.object, changedProps);
      }
    }
    const isTailSibling = fiber.sibling === null || (fiber.flags & Update) === NoFlags;
    if (isTailSibling) swapInstances();
  },
  finalizeInitialChildren: () => false,
  commitMount() {
  },
  getPublicInstance: (instance) => instance?.object,
  prepareForCommit: () => null,
  preparePortalMount: (container) => {
    const target = container.getState().internal.container ?? container.getState().scene;
    return prepare(target, container, "", {});
  },
  resetAfterCommit: () => {
  },
  shouldSetTextContent: () => false,
  clearContainer: () => false,
  hideInstance,
  unhideInstance,
  createTextInstance: handleTextInstance,
  hideTextInstance: handleTextInstance,
  unhideTextInstance: handleTextInstance,
  scheduleTimeout: typeof setTimeout === "function" ? setTimeout : void 0,
  cancelTimeout: typeof clearTimeout === "function" ? clearTimeout : void 0,
  noTimeout: -1,
  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur() {
  },
  afterActiveInstanceBlur() {
  },
  detachDeletedInstance() {
  },
  prepareScopeUpdate() {
  },
  getInstanceFromScope: () => null,
  shouldAttemptEagerTransition: () => false,
  trackSchedulerEvent: () => {
  },
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1.1,
  requestPostPaintCallback() {
  },
  maySuspendCommit: () => false,
  preloadInstance: () => true,
  // true indicates already loaded
  startSuspendingCommit() {
  },
  suspendInstance() {
  },
  waitForCommitToBeReady: () => null,
  NotPendingTransition: null,
  // The reconciler types use the internal ReactContext with all the hidden properties
  // so we have to cast from the public React.Context type
  HostTransitionContext: /* @__PURE__ */ React__namespace.createContext(
    null
  ),
  setCurrentUpdatePriority(newPriority) {
    currentUpdatePriority = newPriority;
  },
  getCurrentUpdatePriority() {
    return currentUpdatePriority;
  },
  resolveUpdatePriority() {
    if (currentUpdatePriority !== NoEventPriority) return currentUpdatePriority;
    switch (typeof window !== "undefined" && window.event?.type) {
      case "click":
      case "contextmenu":
      case "dblclick":
      case "dragenter":
      case "dragleave":
      case "drop":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
        return constants.DiscreteEventPriority;
      case "dragover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "pointerenter":
      case "pointerleave":
      case "wheel":
        return constants.ContinuousEventPriority;
      default:
        return constants.DefaultEventPriority;
    }
  },
  resetFormInstance() {
  },
  // @ts-ignore DefinitelyTyped is not up to date
  rendererPackageName: "@react-three/fiber",
  rendererVersion: packageData.version
});

const isRenderer = (def) => !!def?.render;
const _roots = /* @__PURE__ */ new Map();
const shallowLoose = { objects: "shallow", strict: false };
async function resolveRenderer(config, defaultProps, RendererClass) {
  if (typeof config === "function") return await config(defaultProps);
  if (isRenderer(config)) return config;
  return new RendererClass({ ...defaultProps, ...config });
}
function computeInitialSize(canvas, size) {
  if (!size && typeof HTMLCanvasElement !== "undefined" && canvas instanceof HTMLCanvasElement && canvas.parentElement) {
    const { width, height, top, left } = canvas.parentElement.getBoundingClientRect();
    return { width, height, top, left };
  } else if (!size && typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas) {
    return {
      width: canvas.width,
      height: canvas.height,
      top: 0,
      left: 0
    };
  }
  return { width: 0, height: 0, top: 0, left: 0, ...size };
}
function createRoot(canvas) {
  const prevRoot = _roots.get(canvas);
  const prevFiber = prevRoot?.fiber;
  const prevStore = prevRoot?.store;
  if (prevRoot) console.warn("R3F.createRoot should only be called once!");
  const logRecoverableError = typeof reportError === "function" ? (
    // In modern browsers, reportError will dispatch an error event,
    // emulating an uncaught JavaScript error.
    reportError
  ) : (
    // In older browsers and test environments, fallback to console.error.
    console.error
  );
  const store = prevStore || createStore(invalidate, advance);
  const fiber = prevFiber || reconciler.createContainer(
    store,
    // container
    constants.ConcurrentRoot,
    // tag
    null,
    // hydration callbacks
    false,
    // isStrictMode
    null,
    // concurrentUpdatesByDefaultOverride
    "",
    // identifierPrefix
    logRecoverableError,
    // onUncaughtError
    logRecoverableError,
    // onCaughtError
    logRecoverableError,
    // onRecoverableError
    null
    // transitionCallbacks
  );
  if (!prevRoot) _roots.set(canvas, { fiber, store });
  let onCreated;
  let lastCamera;
  let configured = false;
  let pending = null;
  return {
    async configure(props = {}) {
      let resolve;
      pending = new Promise((_resolve) => resolve = _resolve);
      let {
        gl: glConfig,
        renderer: rendererConfig,
        size: propsSize,
        scene: sceneOptions,
        events,
        onCreated: onCreatedCallback,
        shadows = false,
        linear = false,
        flat = false,
        textureColorSpace = three.SRGBColorSpace,
        legacy = false,
        orthographic = false,
        frameloop = "always",
        dpr = [1, 2],
        performance,
        raycaster: raycastOptions,
        camera: cameraOptions,
        onPointerMissed,
        onDragOverMissed,
        onDropMissed
      } = props;
      let state = store.getState();
      const defaultGLProps = {
        canvas,
        powerPreference: "high-performance",
        antialias: true,
        alpha: true
      };
      if (rendererConfig && !R3F_BUILD_WEBGPU) {
        throw new Error(
          "WebGPURenderer (renderer prop) is not available in this build. Use @react-three/fiber or @react-three/fiber/webgpu instead."
        );
      }
      (state.isLegacy || glConfig || !R3F_BUILD_WEBGPU);
      if (glConfig && rendererConfig) {
        throw new Error("Cannot use both gl and renderer props at the same time");
      }
      let renderer = state.internal.actualRenderer;
      if (!state.internal.actualRenderer) {
        renderer = await resolveRenderer(glConfig, defaultGLProps, three.WebGLRenderer);
        state.internal.actualRenderer = renderer;
        state.set({ isLegacy: true, gl: renderer, renderer });
      }
      let raycaster = state.raycaster;
      if (!raycaster) state.set({ raycaster: raycaster = new three.Raycaster() });
      const { params, ...options } = raycastOptions || {};
      if (!is.equ(options, raycaster, shallowLoose)) applyProps(raycaster, { ...options });
      if (!is.equ(params, raycaster.params, shallowLoose))
        applyProps(raycaster, { params: { ...raycaster.params, ...params } });
      if (!state.camera || state.camera === lastCamera && !is.equ(lastCamera, cameraOptions, shallowLoose)) {
        lastCamera = cameraOptions;
        const isCamera = cameraOptions?.isCamera;
        const camera = isCamera ? cameraOptions : orthographic ? new three.OrthographicCamera(0, 0, 0, 0, 0.1, 1e3) : new three.PerspectiveCamera(50, 0, 0.1, 1e3);
        if (!isCamera) {
          camera.position.z = 5;
          if (cameraOptions) {
            applyProps(camera, cameraOptions);
            if (!camera.manual) {
              const projectionProps = ["aspect", "left", "right", "bottom", "top"];
              if (projectionProps.some((prop) => prop in cameraOptions)) {
                camera.manual = true;
                camera.updateProjectionMatrix();
              }
            }
          }
          if (!state.camera && !cameraOptions?.rotation) camera.lookAt(0, 0, 0);
        }
        state.set({ camera });
        raycaster.camera = camera;
      }
      if (!state.scene) {
        let scene;
        if (sceneOptions?.isScene) {
          scene = sceneOptions;
          prepare(scene, store, "", {});
        } else {
          scene = new three.Scene();
          prepare(scene, store, "", {});
          if (sceneOptions) applyProps(scene, sceneOptions);
        }
        state.set((prev) => ({
          scene,
          rootScene: scene,
          internal: { ...prev.internal, container: scene }
        }));
      }
      if (events && !state.events.handlers) state.set({ events: events(store) });
      const size = computeInitialSize(canvas, propsSize);
      if (!is.equ(size, state.size, shallowLoose)) {
        state.setSize(size.width, size.height, size.top, size.left);
      }
      if (dpr && state.viewport.dpr !== calculateDpr(dpr)) state.setDpr(dpr);
      if (state.frameloop !== frameloop) state.setFrameloop(frameloop);
      if (!state.onPointerMissed) state.set({ onPointerMissed });
      if (!state.onDragOverMissed) state.set({ onDragOverMissed });
      if (!state.onDropMissed) state.set({ onDropMissed });
      if (performance && !is.equ(performance, state.performance, shallowLoose))
        state.set((state2) => ({ performance: { ...state2.performance, ...performance } }));
      if (!state.xr) {
        const handleXRFrame = (timestamp, frame) => {
          const state2 = store.getState();
          if (state2.frameloop === "never") return;
          advance(timestamp, true);
        };
        const actualRenderer = state.internal.actualRenderer;
        const handleSessionChange = () => {
          const state2 = store.getState();
          const renderer2 = state2.internal.actualRenderer;
          actualRenderer.xr.enabled = actualRenderer.xr.isPresenting;
          renderer2.xr.setAnimationLoop(renderer2.xr.isPresenting ? handleXRFrame : null);
          if (!renderer2.xr.isPresenting) invalidate();
        };
        const xr = {
          connect() {
            const { gl, renderer: renderer2, isLegacy } = store.getState();
            const actualRenderer2 = renderer2 || gl;
            actualRenderer2.xr.addEventListener("sessionstart", handleSessionChange);
            actualRenderer2.xr.addEventListener("sessionend", handleSessionChange);
          },
          disconnect() {
            const { gl, renderer: renderer2, isLegacy } = store.getState();
            const actualRenderer2 = renderer2 || gl;
            actualRenderer2.xr.removeEventListener("sessionstart", handleSessionChange);
            actualRenderer2.xr.removeEventListener("sessionend", handleSessionChange);
          }
        };
        if (typeof renderer.xr?.addEventListener === "function") xr.connect();
        state.set({ xr });
      }
      if (renderer.shadowMap) {
        const oldEnabled = renderer.shadowMap.enabled;
        const oldType = renderer.shadowMap.type;
        renderer.shadowMap.enabled = !!shadows;
        if (is.boo(shadows)) {
          renderer.shadowMap.type = three.PCFSoftShadowMap;
        } else if (is.str(shadows)) {
          const types = {
            basic: three.BasicShadowMap,
            percentage: three.PCFShadowMap,
            soft: three.PCFSoftShadowMap,
            variance: three.VSMShadowMap
          };
          renderer.shadowMap.type = types[shadows] ?? three.PCFSoftShadowMap;
        } else if (is.obj(shadows)) {
          Object.assign(renderer.shadowMap, shadows);
        }
        if (oldEnabled !== renderer.shadowMap.enabled || oldType !== renderer.shadowMap.type)
          renderer.shadowMap.needsUpdate = true;
      }
      {
        three.ColorManagement.enabled = !legacy;
        if (!configured) {
          renderer.outputColorSpace = linear ? three.LinearSRGBColorSpace : three.SRGBColorSpace;
          renderer.toneMapping = flat ? three.NoToneMapping : three.ACESFilmicToneMapping;
        }
        if (state.legacy !== legacy) state.set(() => ({ legacy }));
        if (state.linear !== linear) state.set(() => ({ linear }));
        if (state.flat !== flat) state.set(() => ({ flat }));
      }
      if (state.textureColorSpace !== textureColorSpace) state.set(() => ({ textureColorSpace }));
      if (glConfig && !is.fun(glConfig) && !isRenderer(glConfig) && !is.equ(glConfig, renderer, shallowLoose))
        applyProps(renderer, glConfig);
      if (rendererConfig && !is.fun(rendererConfig) && !isRenderer(rendererConfig) && state.renderer) {
        const currentRenderer = state.renderer;
        if (!is.equ(rendererConfig, currentRenderer, shallowLoose)) {
          applyProps(currentRenderer, rendererConfig);
        }
      }
      const scheduler = getScheduler();
      const rootId = state.internal.rootId;
      if (!rootId) {
        const newRootId = scheduler.generateRootId();
        const unregisterRoot = scheduler.registerRoot(newRootId, () => store.getState());
        const unregisterRender = scheduler.register(
          () => {
            const state2 = store.getState();
            const renderer2 = state2.internal.actualRenderer;
            const userHandlesRender = scheduler.hasUserJobsInPhase("render", newRootId);
            if (userHandlesRender || state2.internal.priority) return;
            try {
              if (state2.postProcessing?.render) state2.postProcessing.render();
              else if (renderer2?.render) renderer2.render(state2.scene, state2.camera);
            } catch (error) {
              state2.setError(error instanceof Error ? error : new Error(String(error)));
            }
          },
          {
            id: `${newRootId}_render`,
            rootId: newRootId,
            phase: "render",
            system: true
            // Internal flag: this is a system job, not user-controlled
          }
        );
        state.set((state2) => ({
          internal: {
            ...state2.internal,
            rootId: newRootId,
            unregisterRoot: () => {
              unregisterRoot();
              unregisterRender();
            },
            scheduler
          }
        }));
      }
      scheduler.frameloop = frameloop;
      onCreated = onCreatedCallback;
      configured = true;
      resolve();
      return this;
    },
    render(children) {
      if (!configured && !pending) this.configure();
      pending.then(() => {
        reconciler.updateContainer(
          /* @__PURE__ */ jsxRuntime.jsx(Provider, { store, children, onCreated, rootElement: canvas }),
          fiber,
          null,
          () => void 0
        );
      });
      return store;
    },
    unmount() {
      unmountComponentAtNode(canvas);
    }
  };
}
function Provider({
  store,
  children,
  onCreated,
  rootElement
}) {
  useIsomorphicLayoutEffect(() => {
    const state = store.getState();
    state.set((state2) => ({ internal: { ...state2.internal, active: true } }));
    if (onCreated) onCreated(state);
    if (!store.getState().events.connected) state.events.connect?.(rootElement);
  }, []);
  return /* @__PURE__ */ jsxRuntime.jsx(context.Provider, { value: store, children });
}
function unmountComponentAtNode(canvas, callback) {
  const root = _roots.get(canvas);
  const fiber = root?.fiber;
  if (fiber) {
    const state = root?.store.getState();
    if (state) state.internal.active = false;
    reconciler.updateContainer(null, fiber, null, () => {
      if (state) {
        setTimeout(() => {
          try {
            const renderer = state.internal.actualRenderer;
            const unregisterRoot = state.internal.unregisterRoot;
            if (unregisterRoot) unregisterRoot();
            state.events.disconnect?.();
            renderer?.renderLists?.dispose?.();
            renderer?.forceContextLoss?.();
            if (renderer?.xr) state.xr.disconnect();
            dispose(state.scene);
            _roots.delete(canvas);
            if (callback) callback(canvas);
          } catch (e) {
          }
        }, 500);
      }
    });
  }
}
function createPortal(children, container, state) {
  return /* @__PURE__ */ jsxRuntime.jsx(Portal, { children, container, state });
}
function Portal({ state = {}, children, container }) {
  const { events, size, injectScene = true, ...rest } = state;
  const previousRoot = useStore();
  const [raycaster] = React.useState(() => new three.Raycaster());
  const [pointer] = React.useState(() => new three.Vector2());
  const [portalScene] = React.useState(() => {
    if (container.isScene) return container;
    if (!injectScene) return container;
    const scene = new three.Scene();
    container.add(scene);
    return scene;
  });
  const inject = useMutableCallback((rootState, injectState) => {
    let viewport = void 0;
    if (injectState.camera && size) {
      const camera = injectState.camera;
      viewport = rootState.viewport.getCurrentViewport(camera, new three.Vector3(), size);
      if (camera !== rootState.camera) updateCamera(camera, size);
    }
    return {
      // The intersect consists of the previous root state
      ...rootState,
      ...injectState,
      // Portals have their own scene - always a real THREE.Scene (injected if needed)
      scene: portalScene,
      // rootScene always points to the actual THREE.Scene, even inside portals
      rootScene: rootState.rootScene,
      raycaster,
      pointer,
      mouse: pointer,
      // Their previous root is the layer before it
      previousRoot,
      // Events, size and viewport can be overridden by the inject layer
      events: { ...rootState.events, ...injectState.events, ...events },
      size: { ...rootState.size, ...size },
      viewport: { ...rootState.viewport, ...viewport },
      // Layers are allowed to override events
      setEvents: (events2) => injectState.set((state2) => ({ ...state2, events: { ...state2.events, ...events2 } })),
      // Container for child attachment - the portalScene (injected or container itself)
      internal: { ...rootState.internal, ...injectState.internal, container: portalScene }
    };
  });
  const usePortalStore = React.useMemo(() => {
    const store = traditional.createWithEqualityFn((set, get) => ({ ...rest, set, get }));
    const onMutate = (prev) => store.setState((state2) => inject.current(prev, state2));
    onMutate(previousRoot.getState());
    previousRoot.subscribe(onMutate);
    return store;
  }, [previousRoot, container]);
  return (
    // @ts-ignore, reconciler types are not maintained
    /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: reconciler.createPortal(
      /* @__PURE__ */ jsxRuntime.jsx(context.Provider, { value: usePortalStore, children }),
      usePortalStore,
      null
    ) })
  );
}
function flushSync(fn) {
  return reconciler.flushSyncFromReconciler(fn);
}

function CanvasImpl({
  ref,
  children,
  fallback,
  resize,
  style,
  gl,
  renderer,
  events = createPointerEvents,
  eventSource,
  eventPrefix,
  shadows,
  linear,
  flat,
  legacy,
  orthographic,
  frameloop,
  dpr,
  performance,
  raycaster,
  camera,
  scene,
  onPointerMissed,
  onDragOverMissed,
  onDropMissed,
  onCreated,
  ...props
}) {
  React__namespace.useMemo(() => extend(THREE), []);
  const Bridge = useBridge();
  const [containerRef, containerRect] = useMeasure__default({ scroll: true, debounce: { scroll: 50, resize: 0 }, ...resize });
  const canvasRef = React__namespace.useRef(null);
  const divRef = React__namespace.useRef(null);
  React__namespace.useImperativeHandle(ref, () => canvasRef.current);
  const handlePointerMissed = useMutableCallback(onPointerMissed);
  const handleDragOverMissed = useMutableCallback(onDragOverMissed);
  const handleDropMissed = useMutableCallback(onDropMissed);
  const [block, setBlock] = React__namespace.useState(false);
  const [error, setError] = React__namespace.useState(false);
  if (block) throw block;
  if (error) throw error;
  const root = React__namespace.useRef(null);
  const effectActiveRef = React__namespace.useRef(true);
  const unsubscribeErrorRef = React__namespace.useRef(null);
  useIsomorphicLayoutEffect(() => {
    effectActiveRef.current = true;
    const canvas = canvasRef.current;
    if (containerRect.width > 0 && containerRect.height > 0 && canvas) {
      if (!root.current) root.current = createRoot(canvas);
      async function run() {
        if (!effectActiveRef.current || !root.current) return;
        await root.current.configure({
          gl,
          renderer,
          scene,
          events,
          shadows,
          linear,
          flat,
          legacy,
          orthographic,
          frameloop,
          dpr,
          performance,
          raycaster,
          camera,
          size: containerRect,
          // Pass mutable reference to onPointerMissed so it's free to update
          onPointerMissed: (...args) => handlePointerMissed.current?.(...args),
          onDragOverMissed: (...args) => handleDragOverMissed.current?.(...args),
          onDropMissed: (...args) => handleDropMissed.current?.(...args),
          onCreated: (state) => {
            state.events.connect?.(
              eventSource ? isRef(eventSource) ? eventSource.current : eventSource : divRef.current
            );
            if (eventPrefix) {
              state.setEvents({
                compute: (event, state2) => {
                  const x = event[eventPrefix + "X"];
                  const y = event[eventPrefix + "Y"];
                  state2.pointer.set(x / state2.size.width * 2 - 1, -(y / state2.size.height) * 2 + 1);
                  state2.raycaster.setFromCamera(state2.pointer, state2.camera);
                }
              });
            }
            onCreated?.(state);
          }
        });
        if (!effectActiveRef.current || !root.current) return;
        const store = root.current.render(
          /* @__PURE__ */ jsxRuntime.jsx(Bridge, { children: /* @__PURE__ */ jsxRuntime.jsx(ErrorBoundary, { set: setError, children: /* @__PURE__ */ jsxRuntime.jsx(React__namespace.Suspense, { fallback: /* @__PURE__ */ jsxRuntime.jsx(Block, { set: setBlock }), children: children ?? null }) }) })
        );
        if (unsubscribeErrorRef.current) unsubscribeErrorRef.current();
        unsubscribeErrorRef.current = store.subscribe((state) => {
          if (state.error && effectActiveRef.current) {
            setError(state.error);
          }
        });
      }
      run();
    }
    return () => {
      effectActiveRef.current = false;
      if (unsubscribeErrorRef.current) {
        unsubscribeErrorRef.current();
        unsubscribeErrorRef.current = null;
      }
    };
  });
  React__namespace.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      return () => {
        unmountComponentAtNode(canvas);
        root.current = null;
      };
    }
  }, []);
  const pointerEvents = eventSource ? "none" : "auto";
  return /* @__PURE__ */ jsxRuntime.jsx(
    "div",
    {
      ref: divRef,
      style: {
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents,
        ...style
      },
      ...props,
      children: /* @__PURE__ */ jsxRuntime.jsx("div", { ref: containerRef, className: "r3f-canvas-container", style: { width: "100%", height: "100%" }, children: /* @__PURE__ */ jsxRuntime.jsx("canvas", { ref: canvasRef, className: "r3f-canvas", style: { display: "block" }, children: fallback }) })
    }
  );
}
function Canvas(props) {
  return /* @__PURE__ */ jsxRuntime.jsx(itsFine.FiberProvider, { children: /* @__PURE__ */ jsxRuntime.jsx(CanvasImpl, { ...props }) });
}

extend(THREE);

exports.Block = Block;
exports.Canvas = Canvas;
exports.ErrorBoundary = ErrorBoundary;
exports.IsObject = IsObject;
exports.R3F_BUILD_LEGACY = R3F_BUILD_LEGACY;
exports.R3F_BUILD_WEBGPU = R3F_BUILD_WEBGPU;
exports.REACT_INTERNAL_PROPS = REACT_INTERNAL_PROPS;
exports.RESERVED_PROPS = RESERVED_PROPS;
exports.Scheduler = Scheduler;
exports.Texture = Texture;
exports._roots = _roots;
exports.act = act;
exports.addAfterEffect = addAfterEffect;
exports.addEffect = addEffect;
exports.addTail = addTail;
exports.advance = advance;
exports.applyProps = applyProps;
exports.attach = attach;
exports.buildGraph = buildGraph;
exports.calculateDpr = calculateDpr;
exports.context = context;
exports.createEvents = createEvents;
exports.createPointerEvents = createPointerEvents;
exports.createPortal = createPortal;
exports.createRoot = createRoot;
exports.createStore = createStore;
exports.detach = detach;
exports.diffProps = diffProps;
exports.dispose = dispose;
exports.events = createPointerEvents;
exports.extend = extend;
exports.findInitialRoot = findInitialRoot;
exports.flushSync = flushSync;
exports.getInstanceProps = getInstanceProps;
exports.getRootState = getRootState;
exports.getScheduler = getScheduler;
exports.getUuidPrefix = getUuidPrefix;
exports.hasConstructor = hasConstructor;
exports.invalidate = invalidate;
exports.invalidateInstance = invalidateInstance;
exports.is = is;
exports.isColorRepresentation = isColorRepresentation;
exports.isCopyable = isCopyable;
exports.isObject3D = isObject3D;
exports.isOrthographicCamera = isOrthographicCamera;
exports.isRef = isRef;
exports.isRenderer = isRenderer;
exports.isTexture = isTexture;
exports.isVectorLike = isVectorLike;
exports.prepare = prepare;
exports.reconciler = reconciler;
exports.removeInteractivity = removeInteractivity;
exports.resolve = resolve;
exports.unmountComponentAtNode = unmountComponentAtNode;
exports.updateCamera = updateCamera;
exports.useBridge = useBridge;
exports.useFrame = useFrame;
exports.useGraph = useGraph;
exports.useInstanceHandle = useInstanceHandle;
exports.useIsomorphicLayoutEffect = useIsomorphicLayoutEffect;
exports.useLoader = useLoader;
exports.useMutableCallback = useMutableCallback;
exports.useStore = useStore;
exports.useTexture = useTexture;
exports.useTextures = useTextures;
exports.useThree = useThree;
