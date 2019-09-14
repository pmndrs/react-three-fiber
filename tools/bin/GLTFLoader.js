THREE.GLTFLoader = (function() {
  function e(e) {
    ;(this.manager = void 0 !== e ? e : THREE.DefaultLoadingManager), (this.dracoLoader = null)
  }
  e.prototype = {
    constructor: e,
    crossOrigin: 'anonymous',
    load: function(e, t, r, a) {
      var n,
        s = this
      ;(n =
        void 0 !== this.resourcePath
          ? this.resourcePath
          : void 0 !== this.path
          ? this.path
          : THREE.LoaderUtils.extractUrlBase(e)),
        s.manager.itemStart(e)
      var i = function(t) {
          a ? a(t) : console.error(t), s.manager.itemError(e), s.manager.itemEnd(e)
        },
        o = new THREE.FileLoader(s.manager)
      o.setPath(this.path),
        o.setResponseType('arraybuffer'),
        o.load(
          e,
          function(r) {
            try {
              s.parse(
                r,
                n,
                function(r) {
                  t(r), s.manager.itemEnd(e)
                },
                i
              )
            } catch (e) {
              i(e)
            }
          },
          r,
          i
        )
    },
    setCrossOrigin: function(e) {
      return (this.crossOrigin = e), this
    },
    setPath: function(e) {
      return (this.path = e), this
    },
    setResourcePath: function(e) {
      return (this.resourcePath = e), this
    },
    setDRACOLoader: function(e) {
      return (this.dracoLoader = e), this
    },
    parse: function(e, u, d, h) {
      var f,
        E = {}
      if ('string' == typeof e) f = e
      else if (THREE.LoaderUtils.decodeText(new Uint8Array(e, 0, 4)) === s) {
        try {
          E[t.KHR_BINARY_GLTF] = new (function(e) {
            ;(this.name = t.KHR_BINARY_GLTF), (this.content = null), (this.body = null)
            var r = new DataView(e, 0, i)
            if (
              ((this.header = {
                magic: THREE.LoaderUtils.decodeText(new Uint8Array(e.slice(0, 4))),
                version: r.getUint32(4, !0),
                length: r.getUint32(8, !0),
              }),
              this.header.magic !== s)
            )
              throw new Error('THREE.GLTFLoader: Unsupported glTF-Binary header.')
            if (this.header.version < 2)
              throw new Error('THREE.GLTFLoader: Legacy binary file detected. Use LegacyGLTFLoader instead.')
            var a = new DataView(e, i),
              n = 0
            for (; n < a.byteLength; ) {
              var l = a.getUint32(n, !0)
              n += 4
              var c = a.getUint32(n, !0)
              if (((n += 4), c === o.JSON)) {
                var p = new Uint8Array(e, i + n, l)
                this.content = THREE.LoaderUtils.decodeText(p)
              } else if (c === o.BIN) {
                var u = i + n
                this.body = e.slice(u, u + l)
              }
              n += l
            }
            if (null === this.content) throw new Error('THREE.GLTFLoader: JSON content not found.')
          })(e)
        } catch (e) {
          return void (h && h(e))
        }
        f = E[t.KHR_BINARY_GLTF].content
      } else f = THREE.LoaderUtils.decodeText(new Uint8Array(e))
      var m = JSON.parse(f)
      if (void 0 === m.asset || m.asset.version[0] < 2)
        h &&
          h(
            new Error(
              'THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported. Use LegacyGLTFLoader instead.'
            )
          )
      else {
        if (m.extensionsUsed)
          for (var v = 0; v < m.extensionsUsed.length; ++v) {
            var T = m.extensionsUsed[v],
              g = m.extensionsRequired || []
            switch (T) {
              case t.KHR_LIGHTS_PUNCTUAL:
                E[T] = new a(m)
                break
              case t.KHR_MATERIALS_UNLIT:
                E[T] = new n(m)
                break
              case t.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS:
                E[T] = new p(m)
                break
              case t.KHR_DRACO_MESH_COMPRESSION:
                E[T] = new l(m, this.dracoLoader)
                break
              case t.MSFT_TEXTURE_DDS:
                E[t.MSFT_TEXTURE_DDS] = new r()
                break
              case t.KHR_TEXTURE_TRANSFORM:
                E[t.KHR_TEXTURE_TRANSFORM] = new c(m)
                break
              default:
                g.indexOf(T) >= 0 && console.warn('THREE.GLTFLoader: Unknown extension "' + T + '".')
            }
          }
        new F(m, E, { path: u || this.resourcePath || '', crossOrigin: this.crossOrigin, manager: this.manager }).parse(
          d,
          h
        )
      }
    },
  }
  var t = {
    KHR_BINARY_GLTF: 'KHR_binary_glTF',
    KHR_DRACO_MESH_COMPRESSION: 'KHR_draco_mesh_compression',
    KHR_LIGHTS_PUNCTUAL: 'KHR_lights_punctual',
    KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS: 'KHR_materials_pbrSpecularGlossiness',
    KHR_MATERIALS_UNLIT: 'KHR_materials_unlit',
    KHR_TEXTURE_TRANSFORM: 'KHR_texture_transform',
    MSFT_TEXTURE_DDS: 'MSFT_texture_dds',
  }
  function r() {
    if (!THREE.DDSLoader)
      throw new Error('THREE.GLTFLoader: Attempting to load .dds texture without importing THREE.DDSLoader')
    ;(this.name = t.MSFT_TEXTURE_DDS), (this.ddsLoader = new THREE.DDSLoader())
  }
  function a(e) {
    this.name = t.KHR_LIGHTS_PUNCTUAL
    var r = (e.extensions && e.extensions[t.KHR_LIGHTS_PUNCTUAL]) || {}
    this.lightDefs = r.lights || []
  }
  function n() {
    this.name = t.KHR_MATERIALS_UNLIT
  }
  ;(a.prototype.loadLight = function(e) {
    var t,
      r = this.lightDefs[e],
      a = new THREE.Color(16777215)
    void 0 !== r.color && a.fromArray(r.color)
    var n = void 0 !== r.range ? r.range : 0
    switch (r.type) {
      case 'directional':
        ;(t = new THREE.DirectionalLight(a)).target.position.set(0, 0, -1), t.add(t.target)
        break
      case 'point':
        ;(t = new THREE.PointLight(a)).distance = n
        break
      case 'spot':
        ;((t = new THREE.SpotLight(a)).distance = n),
          (r.spot = r.spot || {}),
          (r.spot.innerConeAngle = void 0 !== r.spot.innerConeAngle ? r.spot.innerConeAngle : 0),
          (r.spot.outerConeAngle = void 0 !== r.spot.outerConeAngle ? r.spot.outerConeAngle : Math.PI / 4),
          (t.angle = r.spot.outerConeAngle),
          (t.penumbra = 1 - r.spot.innerConeAngle / r.spot.outerConeAngle),
          t.target.position.set(0, 0, -1),
          t.add(t.target)
        break
      default:
        throw new Error('THREE.GLTFLoader: Unexpected light type, "' + r.type + '".')
    }
    return (
      t.position.set(0, 0, 0),
      (t.decay = 2),
      void 0 !== r.intensity && (t.intensity = r.intensity),
      (t.name = r.name || 'light_' + e),
      Promise.resolve(t)
    )
  }),
    (n.prototype.getMaterialType = function() {
      return THREE.MeshBasicMaterial
    }),
    (n.prototype.extendParams = function(e, t, r) {
      ;(e.color = new THREE.Color(1, 1, 1)), (e.opacity = 1)
      var a = t.pbrMetallicRoughness
      if (a && Array.isArray(a.baseColorFactor)) {
        var n = a.baseColorFactor
        e.color.fromArray(n), (e.opacity = n[3])
      }
      return Promise.all([])
    })
  var s = 'glTF',
    i = 12,
    o = { JSON: 1313821514, BIN: 5130562 }
  function l(e, r) {
    if (!r) throw new Error('THREE.GLTFLoader: No DRACOLoader instance provided.')
    ;(this.name = t.KHR_DRACO_MESH_COMPRESSION), (this.json = e), (this.dracoLoader = r)
  }
  function c() {
    this.name = t.KHR_TEXTURE_TRANSFORM
  }
  function p() {
    return {
      name: t.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS,
      specularGlossinessParams: [
        'color',
        'map',
        'lightMap',
        'lightMapIntensity',
        'aoMap',
        'aoMapIntensity',
        'emissive',
        'emissiveIntensity',
        'emissiveMap',
        'bumpMap',
        'bumpScale',
        'normalMap',
        'displacementMap',
        'displacementScale',
        'displacementBias',
        'specularMap',
        'specular',
        'glossinessMap',
        'glossiness',
        'alphaMap',
        'envMap',
        'envMapIntensity',
        'refractionRatio',
      ],
      getMaterialType: function() {
        return THREE.ShaderMaterial
      },
      extendParams: function(e, t, r) {
        var a = t.extensions[this.name],
          n = THREE.ShaderLib.standard,
          s = THREE.UniformsUtils.clone(n.uniforms),
          i = ['#ifdef USE_SPECULARMAP', '\tuniform sampler2D specularMap;', '#endif'].join('\n'),
          o = ['#ifdef USE_GLOSSINESSMAP', '\tuniform sampler2D glossinessMap;', '#endif'].join('\n'),
          l = [
            'vec3 specularFactor = specular;',
            '#ifdef USE_SPECULARMAP',
            '\tvec4 texelSpecular = texture2D( specularMap, vUv );',
            '\ttexelSpecular = sRGBToLinear( texelSpecular );',
            '\t// reads channel RGB, compatible with a glTF Specular-Glossiness (RGBA) texture',
            '\tspecularFactor *= texelSpecular.rgb;',
            '#endif',
          ].join('\n'),
          c = [
            'float glossinessFactor = glossiness;',
            '#ifdef USE_GLOSSINESSMAP',
            '\tvec4 texelGlossiness = texture2D( glossinessMap, vUv );',
            '\t// reads channel A, compatible with a glTF Specular-Glossiness (RGBA) texture',
            '\tglossinessFactor *= texelGlossiness.a;',
            '#endif',
          ].join('\n'),
          p = [
            'PhysicalMaterial material;',
            'material.diffuseColor = diffuseColor.rgb;',
            'material.specularRoughness = clamp( 1.0 - glossinessFactor, 0.04, 1.0 );',
            'material.specularColor = specularFactor.rgb;',
          ].join('\n'),
          u = n.fragmentShader
            .replace('uniform float roughness;', 'uniform vec3 specular;')
            .replace('uniform float metalness;', 'uniform float glossiness;')
            .replace('#include <roughnessmap_pars_fragment>', i)
            .replace('#include <metalnessmap_pars_fragment>', o)
            .replace('#include <roughnessmap_fragment>', l)
            .replace('#include <metalnessmap_fragment>', c)
            .replace('#include <lights_physical_fragment>', p)
        delete s.roughness,
          delete s.metalness,
          delete s.roughnessMap,
          delete s.metalnessMap,
          (s.specular = { value: new THREE.Color().setHex(1118481) }),
          (s.glossiness = { value: 0.5 }),
          (s.specularMap = { value: null }),
          (s.glossinessMap = { value: null }),
          (e.vertexShader = n.vertexShader),
          (e.fragmentShader = u),
          (e.uniforms = s),
          (e.defines = { STANDARD: '' }),
          (e.color = new THREE.Color(1, 1, 1)),
          (e.opacity = 1)
        if (Array.isArray(a.diffuseFactor)) {
          var d = a.diffuseFactor
          e.color.fromArray(d), (e.opacity = d[3])
        }
        return (
          (e.emissive = new THREE.Color(0, 0, 0)),
          (e.glossiness = void 0 !== a.glossinessFactor ? a.glossinessFactor : 1),
          (e.specular = new THREE.Color(1, 1, 1)),
          Array.isArray(a.specularFactor) && e.specular.fromArray(a.specularFactor),
          Promise.all([])
        )
      },
      createMaterial: function(e) {
        var t = new THREE.ShaderMaterial({
          defines: e.defines,
          vertexShader: e.vertexShader,
          fragmentShader: e.fragmentShader,
          uniforms: e.uniforms,
          fog: !0,
          lights: !0,
          opacity: e.opacity,
          transparent: e.transparent,
        })
        return (
          (t.isGLTFSpecularGlossinessMaterial = !0),
          (t.color = e.color),
          (t.map = void 0 === e.map ? null : e.map),
          (t.lightMap = null),
          (t.lightMapIntensity = 1),
          (t.aoMap = void 0 === e.aoMap ? null : e.aoMap),
          (t.aoMapIntensity = 1),
          (t.emissive = e.emissive),
          (t.emissiveIntensity = 1),
          (t.emissiveMap = void 0 === e.emissiveMap ? null : e.emissiveMap),
          (t.bumpMap = void 0 === e.bumpMap ? null : e.bumpMap),
          (t.bumpScale = 1),
          (t.normalMap = void 0 === e.normalMap ? null : e.normalMap),
          e.normalScale && (t.normalScale = e.normalScale),
          (t.displacementMap = null),
          (t.displacementScale = 1),
          (t.displacementBias = 0),
          (t.specularMap = void 0 === e.specularMap ? null : e.specularMap),
          (t.specular = e.specular),
          (t.glossinessMap = void 0 === e.glossinessMap ? null : e.glossinessMap),
          (t.glossiness = e.glossiness),
          (t.alphaMap = null),
          (t.envMap = void 0 === e.envMap ? null : e.envMap),
          (t.envMapIntensity = 1),
          (t.refractionRatio = 0.98),
          (t.extensions.derivatives = !0),
          t
        )
      },
      cloneMaterial: function(e) {
        var t = e.clone()
        t.isGLTFSpecularGlossinessMaterial = !0
        for (var r = this.specularGlossinessParams, a = 0, n = r.length; a < n; a++) {
          var s = e[r[a]]
          t[r[a]] = s && s.isColor ? s.clone() : s
        }
        return t
      },
      refreshUniforms: function(e, t, r, a, n, s) {
        if (!0 === n.isGLTFSpecularGlossinessMaterial) {
          var i,
            o = n.uniforms,
            l = n.defines
          ;(o.opacity.value = n.opacity),
            o.diffuse.value.copy(n.color),
            o.emissive.value.copy(n.emissive).multiplyScalar(n.emissiveIntensity),
            (o.map.value = n.map),
            (o.specularMap.value = n.specularMap),
            (o.alphaMap.value = n.alphaMap),
            (o.lightMap.value = n.lightMap),
            (o.lightMapIntensity.value = n.lightMapIntensity),
            (o.aoMap.value = n.aoMap),
            (o.aoMapIntensity.value = n.aoMapIntensity),
            n.map
              ? (i = n.map)
              : n.specularMap
              ? (i = n.specularMap)
              : n.displacementMap
              ? (i = n.displacementMap)
              : n.normalMap
              ? (i = n.normalMap)
              : n.bumpMap
              ? (i = n.bumpMap)
              : n.glossinessMap
              ? (i = n.glossinessMap)
              : n.alphaMap
              ? (i = n.alphaMap)
              : n.emissiveMap && (i = n.emissiveMap),
            void 0 !== i &&
              (i.isWebGLRenderTarget && (i = i.texture),
              !0 === i.matrixAutoUpdate && i.updateMatrix(),
              o.uvTransform.value.copy(i.matrix)),
            n.envMap &&
              ((o.envMap.value = n.envMap),
              (o.envMapIntensity.value = n.envMapIntensity),
              (o.flipEnvMap.value = n.envMap.isCubeTexture ? -1 : 1),
              (o.reflectivity.value = n.reflectivity),
              (o.refractionRatio.value = n.refractionRatio),
              (o.maxMipLevel.value = e.properties.get(n.envMap).__maxMipLevel)),
            o.specular.value.copy(n.specular),
            (o.glossiness.value = n.glossiness),
            (o.glossinessMap.value = n.glossinessMap),
            (o.emissiveMap.value = n.emissiveMap),
            (o.bumpMap.value = n.bumpMap),
            (o.normalMap.value = n.normalMap),
            (o.displacementMap.value = n.displacementMap),
            (o.displacementScale.value = n.displacementScale),
            (o.displacementBias.value = n.displacementBias),
            null !== o.glossinessMap.value &&
              void 0 === l.USE_GLOSSINESSMAP &&
              ((l.USE_GLOSSINESSMAP = ''), (l.USE_ROUGHNESSMAP = '')),
            null === o.glossinessMap.value &&
              void 0 !== l.USE_GLOSSINESSMAP &&
              (delete l.USE_GLOSSINESSMAP, delete l.USE_ROUGHNESSMAP)
        }
      },
    }
  }
  function u(e, t, r, a) {
    THREE.Interpolant.call(this, e, t, r, a)
  }
  ;(l.prototype.decodePrimitive = function(e, t) {
    var r = this.json,
      a = this.dracoLoader,
      n = e.extensions[this.name].bufferView,
      s = e.extensions[this.name].attributes,
      i = {},
      o = {},
      l = {}
    for (var c in s) {
      var p = S[c] || c.toLowerCase()
      i[p] = s[c]
    }
    for (c in e.attributes) {
      p = S[c] || c.toLowerCase()
      if (void 0 !== s[c]) {
        var u = r.accessors[e.attributes[c]],
          d = R[u.componentType]
        ;(l[p] = d), (o[p] = !0 === u.normalized)
      }
    }
    return t.getDependency('bufferView', n).then(function(e) {
      return new Promise(function(t) {
        a.decodeDracoFile(
          e,
          function(e) {
            for (var r in e.attributes) {
              var a = e.attributes[r],
                n = o[r]
              void 0 !== n && (a.normalized = n)
            }
            t(e)
          },
          i,
          l
        )
      })
    })
  }),
    (c.prototype.extendTexture = function(e, t) {
      return (
        (e = e.clone()),
        void 0 !== t.offset && e.offset.fromArray(t.offset),
        void 0 !== t.rotation && (e.rotation = t.rotation),
        void 0 !== t.scale && e.repeat.fromArray(t.scale),
        void 0 !== t.texCoord &&
          console.warn('THREE.GLTFLoader: Custom UV sets in "' + this.name + '" extension not yet supported.'),
        (e.needsUpdate = !0),
        e
      )
    }),
    (u.prototype = Object.create(THREE.Interpolant.prototype)),
    (u.prototype.constructor = u),
    (u.prototype.copySampleValue_ = function(e) {
      for (var t = this.resultBuffer, r = this.sampleValues, a = this.valueSize, n = e * a * 3 + a, s = 0; s !== a; s++)
        t[s] = r[n + s]
      return t
    }),
    (u.prototype.beforeStart_ = u.prototype.copySampleValue_),
    (u.prototype.afterEnd_ = u.prototype.copySampleValue_),
    (u.prototype.interpolate_ = function(e, t, r, a) {
      for (
        var n = this.resultBuffer,
          s = this.sampleValues,
          i = this.valueSize,
          o = 2 * i,
          l = 3 * i,
          c = a - t,
          p = (r - t) / c,
          u = p * p,
          d = u * p,
          h = e * l,
          f = h - l,
          E = -2 * d + 3 * u,
          m = d - u,
          v = 1 - E,
          T = m - u + p,
          g = 0;
        g !== i;
        g++
      ) {
        var R = s[f + g + i],
          M = s[f + g + o] * c,
          S = s[h + g + i],
          y = s[h + g] * c
        n[g] = v * R + T * M + E * S + m * y
      }
      return n
    })
  var d,
    h = 0,
    f = 1,
    E = 2,
    m = 3,
    v = 4,
    T = 5,
    g = 6,
    R =
      (Number,
      THREE.Matrix3,
      THREE.Matrix4,
      THREE.Vector2,
      THREE.Vector3,
      THREE.Vector4,
      THREE.Texture,
      {
        5120: Int8Array,
        5121: Uint8Array,
        5122: Int16Array,
        5123: Uint16Array,
        5125: Uint32Array,
        5126: Float32Array,
      }),
    M =
      (THREE.NearestFilter,
      THREE.LinearFilter,
      THREE.NearestMipMapNearestFilter,
      THREE.LinearMipMapNearestFilter,
      THREE.NearestMipMapLinearFilter,
      THREE.LinearMipMapLinearFilter,
      THREE.ClampToEdgeWrapping,
      THREE.MirroredRepeatWrapping,
      THREE.RepeatWrapping,
      THREE.BackSide,
      THREE.FrontSide,
      THREE.NeverDepth,
      THREE.LessDepth,
      THREE.EqualDepth,
      THREE.LessEqualDepth,
      THREE.GreaterEqualDepth,
      THREE.NotEqualDepth,
      THREE.GreaterEqualDepth,
      THREE.AlwaysDepth,
      THREE.AddEquation,
      THREE.SubtractEquation,
      THREE.ReverseSubtractEquation,
      THREE.ZeroFactor,
      THREE.OneFactor,
      THREE.SrcColorFactor,
      THREE.OneMinusSrcColorFactor,
      THREE.SrcAlphaFactor,
      THREE.OneMinusSrcAlphaFactor,
      THREE.DstAlphaFactor,
      THREE.OneMinusDstAlphaFactor,
      THREE.DstColorFactor,
      THREE.OneMinusDstColorFactor,
      THREE.SrcAlphaSaturateFactor,
      { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }),
    S = {
      POSITION: 'position',
      NORMAL: 'normal',
      TANGENT: 'tangent',
      TEXCOORD_0: 'uv',
      TEXCOORD_1: 'uv2',
      COLOR_0: 'color',
      WEIGHTS_0: 'skinWeight',
      JOINTS_0: 'skinIndex',
    },
    y = { scale: 'scale', translation: 'position', rotation: 'quaternion', weights: 'morphTargetInfluences' },
    H = { CUBICSPLINE: void 0, LINEAR: THREE.InterpolateLinear, STEP: THREE.InterpolateDiscrete },
    L = 'OPAQUE',
    A = 'MASK',
    _ = 'BLEND'
  THREE.RGBAFormat, THREE.RGBFormat
  function w(e, t, r) {
    for (var a in r.extensions)
      void 0 === e[a] &&
        ((t.userData.gltfExtensions = t.userData.gltfExtensions || {}),
        (t.userData.gltfExtensions[a] = r.extensions[a]))
  }
  function b(e, t) {
    void 0 !== t.extras &&
      ('object' == typeof t.extras
        ? Object.assign(e.userData, t.extras)
        : console.warn('THREE.GLTFLoader: Ignoring primitive type .extras, ' + t.extras))
  }
  function x(e, t) {
    if ((e.updateMorphTargets(), void 0 !== t.weights))
      for (var r = 0, a = t.weights.length; r < a; r++) e.morphTargetInfluences[r] = t.weights[r]
    if (t.extras && Array.isArray(t.extras.targetNames)) {
      var n = t.extras.targetNames
      if (e.morphTargetInfluences.length === n.length) {
        e.morphTargetDictionary = {}
        for (r = 0, a = n.length; r < a; r++) e.morphTargetDictionary[n[r]] = r
      } else console.warn('THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.')
    }
  }
  function I(e) {
    for (var t = '', r = Object.keys(e).sort(), a = 0, n = r.length; a < n; a++) t += r[a] + ':' + e[r[a]] + ';'
    return t
  }
  function P(e) {
    if (e.isInterleavedBufferAttribute) {
      for (var t = e.count, r = e.itemSize, a = e.array.slice(0, t * r), n = 0, s = 0; n < t; ++n)
        (a[s++] = e.getX(n)),
          r >= 2 && (a[s++] = e.getY(n)),
          r >= 3 && (a[s++] = e.getZ(n)),
          r >= 4 && (a[s++] = e.getW(n))
      return new THREE.BufferAttribute(a, r, e.normalized)
    }
    return e.clone()
  }
  function F(e, t, r) {
    ;(this.json = e || {}),
      (this.extensions = t || {}),
      (this.options = r || {}),
      (this.cache = new (function() {
        var e = {}
        return {
          get: function(t) {
            return e[t]
          },
          add: function(t, r) {
            e[t] = r
          },
          remove: function(t) {
            delete e[t]
          },
          removeAll: function() {
            e = {}
          },
        }
      })()),
      (this.primitiveCache = {}),
      (this.textureLoader = new THREE.TextureLoader(this.options.manager)),
      this.textureLoader.setCrossOrigin(this.options.crossOrigin),
      (this.fileLoader = new THREE.FileLoader(this.options.manager)),
      this.fileLoader.setResponseType('arraybuffer')
  }
  function C(e, t, r) {
    var a = t.attributes,
      n = []
    function s(t, a) {
      return r.getDependency('accessor', t).then(function(t) {
        e.addAttribute(a, t)
      })
    }
    for (var i in a) {
      var o = S[i] || i.toLowerCase()
      o in e.attributes || n.push(s(a[i], o))
    }
    if (void 0 !== t.indices && !e.index) {
      var l = r.getDependency('accessor', t.indices).then(function(t) {
        e.setIndex(t)
      })
      n.push(l)
    }
    return (
      b(e, t),
      Promise.all(n).then(function() {
        return void 0 !== t.targets
          ? (function(e, t, r) {
              for (
                var a = !1, n = !1, s = 0, i = t.length;
                s < i && (void 0 !== (c = t[s]).POSITION && (a = !0), void 0 !== c.NORMAL && (n = !0), !a || !n);
                s++
              );
              if (!a && !n) return Promise.resolve(e)
              var o = [],
                l = []
              for (s = 0, i = t.length; s < i; s++) {
                var c = t[s]
                if (a) {
                  var p = void 0 !== c.POSITION ? r.getDependency('accessor', c.POSITION) : e.attributes.position
                  o.push(p)
                }
                n &&
                  ((p = void 0 !== c.NORMAL ? r.getDependency('accessor', c.NORMAL) : e.attributes.normal), l.push(p))
              }
              return Promise.all([Promise.all(o), Promise.all(l)]).then(function(r) {
                for (var s = r[0], i = r[1], o = 0, l = s.length; o < l; o++)
                  e.attributes.position !== s[o] && (s[o] = P(s[o]))
                for (o = 0, l = i.length; o < l; o++) e.attributes.normal !== i[o] && (i[o] = P(i[o]))
                for (o = 0, l = t.length; o < l; o++) {
                  var c = t[o],
                    p = 'morphTarget' + o
                  if (a && void 0 !== c.POSITION) {
                    var u = s[o]
                    u.name = p
                    for (var d = e.attributes.position, h = 0, f = u.count; h < f; h++)
                      u.setXYZ(h, u.getX(h) + d.getX(h), u.getY(h) + d.getY(h), u.getZ(h) + d.getZ(h))
                  }
                  if (n && void 0 !== c.NORMAL) {
                    var E = i[o]
                    E.name = p
                    var m = e.attributes.normal
                    for (h = 0, f = E.count; h < f; h++)
                      E.setXYZ(h, E.getX(h) + m.getX(h), E.getY(h) + m.getY(h), E.getZ(h) + m.getZ(h))
                  }
                }
                return a && (e.morphAttributes.position = s), n && (e.morphAttributes.normal = i), e
              })
            })(e, t.targets, r)
          : e
      })
    )
  }
  return (
    (F.prototype.parse = function(e, t) {
      var r = this,
        a = this.json,
        n = this.extensions
      this.cache.removeAll(),
        this.markDefs(),
        Promise.all([this.getDependencies('scene'), this.getDependencies('animation'), this.getDependencies('camera')])
          .then(function(t) {
            var s = {
              scene: t[0][a.scene || 0],
              scenes: t[0],
              animations: t[1],
              cameras: t[2],
              asset: a.asset,
              parser: r,
              userData: {},
            }
            w(n, s, a), e(s)
          })
          .catch(t)
    }),
    (F.prototype.markDefs = function() {
      for (
        var e = this.json.nodes || [],
          t = this.json.skins || [],
          r = this.json.meshes || [],
          a = {},
          n = {},
          s = 0,
          i = t.length;
        s < i;
        s++
      )
        for (var o = t[s].joints, l = 0, c = o.length; l < c; l++) e[o[l]].isBone = !0
      for (var p = 0, u = e.length; p < u; p++) {
        var d = e[p]
        void 0 !== d.mesh &&
          (void 0 === a[d.mesh] && (a[d.mesh] = n[d.mesh] = 0),
          a[d.mesh]++,
          void 0 !== d.skin && (r[d.mesh].isSkinnedMesh = !0))
      }
      ;(this.json.meshReferences = a), (this.json.meshUses = n)
    }),
    (F.prototype.getDependency = function(e, r) {
      var a = e + ':' + r,
        n = this.cache.get(a)
      if (!n) {
        switch (e) {
          case 'scene':
            n = this.loadScene(r)
            break
          case 'node':
            n = this.loadNode(r)
            break
          case 'mesh':
            n = this.loadMesh(r)
            break
          case 'accessor':
            n = this.loadAccessor(r)
            break
          case 'bufferView':
            n = this.loadBufferView(r)
            break
          case 'buffer':
            n = this.loadBuffer(r)
            break
          case 'material':
            n = this.loadMaterial(r)
            break
          case 'skin':
            n = this.loadSkin(r)
            break
          case 'animation':
            n = this.loadAnimation(r)
            break
          case 'camera':
            n = this.loadCamera(r)
            break
          case 'light':
            n = this.extensions[t.KHR_LIGHTS_PUNCTUAL].loadLight(r)
            break
          default:
            throw new Error('Unknown type: ' + e)
        }
        this.cache.add(a, n)
      }
      return n
    }),
    (F.prototype.getDependencies = function(e) {
      var t = this.cache.get(e)
      if (!t) {
        var r = this,
          a = this.json[e + ('mesh' === e ? 'es' : 's')] || []
        ;(t = Promise.all(
          a.map(function(t, a) {
            return r.getDependency(e, a)
          })
        )),
          this.cache.add(e, t)
      }
      return t
    }),
    (F.prototype.loadBuffer = function(e) {
      var r = this.json.buffers[e],
        a = this.fileLoader
      if (r.type && 'arraybuffer' !== r.type)
        throw new Error('THREE.GLTFLoader: ' + r.type + ' buffer type is not supported.')
      if (void 0 === r.uri && 0 === e) return Promise.resolve(this.extensions[t.KHR_BINARY_GLTF].body)
      var n = this.options
      return new Promise(function(e, t) {
        var s, i
        a.load(
          ((s = r.uri),
          (i = n.path),
          'string' != typeof s || '' === s
            ? ''
            : /^(https?:)?\/\//i.test(s)
            ? s
            : /^data:.*,.*$/i.test(s)
            ? s
            : /^blob:.*$/i.test(s)
            ? s
            : i + s),
          e,
          void 0,
          function() {
            t(new Error('THREE.GLTFLoader: Failed to load buffer "' + r.uri + '".'))
          }
        )
      })
    }),
    (F.prototype.loadBufferView = function(e) {
      var t = this.json.bufferViews[e]
      return this.getDependency('buffer', t.buffer).then(function(e) {
        var r = t.byteLength || 0,
          a = t.byteOffset || 0
        return e.slice(a, a + r)
      })
    }),
    (F.prototype.loadAccessor = function(e) {
      var t = this,
        r = this.json,
        a = this.json.accessors[e]
      if (void 0 === a.bufferView && void 0 === a.sparse) return Promise.resolve(null)
      var n = []
      return (
        void 0 !== a.bufferView ? n.push(this.getDependency('bufferView', a.bufferView)) : n.push(null),
        void 0 !== a.sparse &&
          (n.push(this.getDependency('bufferView', a.sparse.indices.bufferView)),
          n.push(this.getDependency('bufferView', a.sparse.values.bufferView))),
        Promise.all(n).then(function(e) {
          var n,
            s,
            i = e[0],
            o = M[a.type],
            l = R[a.componentType],
            c = l.BYTES_PER_ELEMENT,
            p = c * o,
            u = a.byteOffset || 0,
            d = void 0 !== a.bufferView ? r.bufferViews[a.bufferView].byteStride : void 0,
            h = !0 === a.normalized
          if (d && d !== p) {
            var f = 'InterleavedBuffer:' + a.bufferView + ':' + a.componentType,
              E = t.cache.get(f)
            E || ((n = new l(i)), (E = new THREE.InterleavedBuffer(n, d / c)), t.cache.add(f, E)),
              (s = new THREE.InterleavedBufferAttribute(E, o, u / c, h))
          } else (n = null === i ? new l(a.count * o) : new l(i, u, a.count * o)), (s = new THREE.BufferAttribute(n, o, h))
          if (void 0 !== a.sparse) {
            var m = M.SCALAR,
              v = R[a.sparse.indices.componentType],
              T = a.sparse.indices.byteOffset || 0,
              g = a.sparse.values.byteOffset || 0,
              S = new v(e[1], T, a.sparse.count * m),
              y = new l(e[2], g, a.sparse.count * o)
            null !== i && s.setArray(s.array.slice())
            for (var H = 0, L = S.length; H < L; H++) {
              var A = S[H]
              if (
                (s.setX(A, y[H * o]),
                o >= 2 && s.setY(A, y[H * o + 1]),
                o >= 3 && s.setZ(A, y[H * o + 2]),
                o >= 4 && s.setW(A, y[H * o + 3]),
                o >= 5)
              )
                throw new Error('THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.')
            }
          }
          return s
        })
      )
    }),
    (F.prototype.assignFinalMaterial = function(e) {
      var r = e.geometry,
        a = e.material,
        n = this.extensions,
        s = void 0 !== r.attributes.tangent,
        i = void 0 !== r.attributes.color,
        o = void 0 === r.attributes.normal,
        l = !0 === e.isSkinnedMesh,
        c = Object.keys(r.morphAttributes).length > 0,
        p = c && void 0 !== r.morphAttributes.normal
      if (e.isPoints) {
        var u = 'PointsMaterial:' + a.uuid,
          d = this.cache.get(u)
        d ||
          ((d = new THREE.PointsMaterial()),
          THREE.Material.prototype.copy.call(d, a),
          d.color.copy(a.color),
          (d.map = a.map),
          (d.lights = !1),
          this.cache.add(u, d)),
          (a = d)
      } else if (e.isLine) {
        u = 'LineBasicMaterial:' + a.uuid
        var h = this.cache.get(u)
        h ||
          ((h = new THREE.LineBasicMaterial()),
          THREE.Material.prototype.copy.call(h, a),
          h.color.copy(a.color),
          (h.lights = !1),
          this.cache.add(u, h)),
          (a = h)
      }
      if (s || i || o || l || c) {
        u = 'ClonedMaterial:' + a.uuid + ':'
        a.isGLTFSpecularGlossinessMaterial && (u += 'specular-glossiness:'),
          l && (u += 'skinning:'),
          s && (u += 'vertex-tangents:'),
          i && (u += 'vertex-colors:'),
          o && (u += 'flat-shading:'),
          c && (u += 'morph-targets:'),
          p && (u += 'morph-normals:')
        var f = this.cache.get(u)
        f ||
          ((f = a.isGLTFSpecularGlossinessMaterial
            ? n[t.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS].cloneMaterial(a)
            : a.clone()),
          l && (f.skinning = !0),
          s && (f.vertexTangents = !0),
          i && (f.vertexColors = THREE.VertexColors),
          o && (f.flatShading = !0),
          c && (f.morphTargets = !0),
          p && (f.morphNormals = !0),
          this.cache.add(u, f)),
          (a = f)
      }
      a.aoMap &&
        void 0 === r.attributes.uv2 &&
        void 0 !== r.attributes.uv &&
        (console.log('THREE.GLTFLoader: Duplicating UVs to support aoMap.'),
        r.addAttribute('uv2', new THREE.BufferAttribute(r.attributes.uv.array, 2))),
        a.isGLTFSpecularGlossinessMaterial &&
          (e.onBeforeRender = n[t.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS].refreshUniforms),
        (e.material = a)
    }),
    (F.prototype.loadMaterial = function(e) {
      var r,
        a = this.json,
        n = this.extensions,
        s = a.materials[e],
        i = {},
        o = s.extensions || {},
        l = []
      if (o[t.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS]) {
        var c = n[t.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS]
        ;(r = c.getMaterialType()), l.push(c.extendParams(i, s, this))
      } else if (o[t.KHR_MATERIALS_UNLIT]) {
        var p = n[t.KHR_MATERIALS_UNLIT]
        ;(r = p.getMaterialType()), l.push(p.extendParams(i, s, this))
      } else {
        r = THREE.MeshStandardMaterial
        var u = s.pbrMetallicRoughness || {}
        if (((i.color = new THREE.Color(1, 1, 1)), (i.opacity = 1), Array.isArray(u.baseColorFactor))) {
          var d = u.baseColorFactor
          i.color.fromArray(d), (i.opacity = d[3])
        }
        ;(i.metalness = void 0 !== u.metallicFactor ? u.metallicFactor : 1),
          (i.roughness = void 0 !== u.roughnessFactor ? u.roughnessFactor : 1)
      }
      !0 === s.doubleSided && (i.side = THREE.DoubleSide)
      var h = s.alphaMode || L
      return (
        h === _
          ? (i.transparent = !0)
          : ((i.transparent = !1), h === A && (i.alphaTest = void 0 !== s.alphaCutoff ? s.alphaCutoff : 0.5)),
        void 0 !== s.normalTexture &&
          r !== THREE.MeshBasicMaterial &&
          ((i.normalScale = new THREE.Vector2(1, 1)),
          void 0 !== s.normalTexture.scale && i.normalScale.set(s.normalTexture.scale, s.normalTexture.scale)),
        void 0 !== s.occlusionTexture &&
          r !== THREE.MeshBasicMaterial &&
          void 0 !== s.occlusionTexture.strength &&
          (i.aoMapIntensity = s.occlusionTexture.strength),
        void 0 !== s.emissiveFactor &&
          r !== THREE.MeshBasicMaterial &&
          (i.emissive = new THREE.Color().fromArray(s.emissiveFactor)),
        Promise.all(l).then(function() {
          var e
          return (
            (e = r === THREE.ShaderMaterial ? n[t.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS].createMaterial(i) : new r(i)),
            void 0 !== s.name && (e.name = s.name),
            e.map && (e.map.encoding = THREE.sRGBEncoding),
            e.emissiveMap && (e.emissiveMap.encoding = THREE.sRGBEncoding),
            e.specularMap && (e.specularMap.encoding = THREE.sRGBEncoding),
            b(e, s),
            s.extensions && w(n, e, s),
            e
          )
        })
      )
    }),
    (F.prototype.loadGeometries = function(e) {
      var r = this,
        a = this.extensions,
        n = this.primitiveCache
      function s(e) {
        return a[t.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(e, r).then(function(t) {
          return C(t, e, r)
        })
      }
      for (var i, o, l = [], c = 0, p = e.length; c < p; c++) {
        var u,
          d = e[c],
          h =
            (void 0,
            (o = (i = d).extensions && i.extensions[t.KHR_DRACO_MESH_COMPRESSION])
              ? 'draco:' + o.bufferView + ':' + o.indices + ':' + I(o.attributes)
              : i.indices + ':' + I(i.attributes) + ':' + i.mode),
          f = n[h]
        if (f) l.push(f.promise)
        else
          (u = d.extensions && d.extensions[t.KHR_DRACO_MESH_COMPRESSION] ? s(d) : C(new THREE.BufferGeometry(), d, r)),
            (n[h] = { primitive: d, promise: u }),
            l.push(u)
      }
      return Promise.all(l)
    }),
    (F.prototype.loadMesh = function(e) {
      for (
        var t = this, r = this.json, a = (this.extensions, r.meshes[e]), n = a.primitives, s = [], i = 0, o = n.length;
        i < o;
        i++
      ) {
        var l =
          void 0 === n[i].material
            ? (d =
                d ||
                new THREE.MeshStandardMaterial({
                  color: 16777215,
                  emissive: 0,
                  metalness: 1,
                  roughness: 1,
                  transparent: !1,
                  depthTest: !0,
                  side: THREE.FrontSide,
                }))
            : this.getDependency('material', n[i].material)
        s.push(l)
      }
      return Promise.all(s).then(function(r) {
        return t.loadGeometries(n).then(function(s) {
          for (var i = [], o = 0, l = s.length; o < l; o++) {
            var c,
              p = s[o],
              u = n[o],
              d = r[o]
            if (u.mode === v || u.mode === T || u.mode === g || void 0 === u.mode)
              !0 === (c = !0 === a.isSkinnedMesh ? new THREE.SkinnedMesh(p, d) : new THREE.Mesh(p, d)).isSkinnedMesh &&
                c.normalizeSkinWeights(),
                u.mode === T
                  ? (c.drawMode = THREE.TriangleStripDrawMode)
                  : u.mode === g && (c.drawMode = THREE.TriangleFanDrawMode)
            else if (u.mode === f) c = new THREE.LineSegments(p, d)
            else if (u.mode === m) c = new THREE.Line(p, d)
            else if (u.mode === E) c = new THREE.LineLoop(p, d)
            else {
              if (u.mode !== h) throw new Error('THREE.GLTFLoader: Primitive mode unsupported: ' + u.mode)
              c = new THREE.Points(p, d)
            }
            Object.keys(c.geometry.morphAttributes).length > 0 && x(c, a),
              (c.name = a.name || 'mesh_' + e),
              s.length > 1 && (c.name += '_' + o),
              b(c, a),
              t.assignFinalMaterial(c),
              i.push(c)
          }
          if (1 === i.length) return i[0]
          var R = new THREE.Group()
          for (o = 0, l = i.length; o < l; o++) R.add(i[o])
          return R
        })
      })
    }),
    (F.prototype.loadCamera = function(e) {
      var t,
        r = this.json.cameras[e],
        a = r[r.type]
      if (a)
        return (
          'perspective' === r.type
            ? (t = new THREE.PerspectiveCamera(
                THREE.Math.radToDeg(a.yfov),
                a.aspectRatio || 1,
                a.znear || 1,
                a.zfar || 2e6
              ))
            : 'orthographic' === r.type &&
              (t = new THREE.OrthographicCamera(a.xmag / -2, a.xmag / 2, a.ymag / 2, a.ymag / -2, a.znear, a.zfar)),
          void 0 !== r.name && (t.name = r.name),
          b(t, r),
          Promise.resolve(t)
        )
      console.warn('THREE.GLTFLoader: Missing camera parameters.')
    }),
    (F.prototype.loadSkin = function(e) {
      var t = this.json.skins[e],
        r = { joints: t.joints }
      return void 0 === t.inverseBindMatrices
        ? Promise.resolve(r)
        : this.getDependency('accessor', t.inverseBindMatrices).then(function(e) {
            return (r.inverseBindMatrices = e), r
          })
    }),
    (F.prototype.loadAnimation = function(e) {
      for (
        var t = this.json.animations[e], r = [], a = [], n = [], s = [], i = [], o = 0, l = t.channels.length;
        o < l;
        o++
      ) {
        var c = t.channels[o],
          p = t.samplers[c.sampler],
          d = c.target,
          h = void 0 !== d.node ? d.node : d.id,
          f = void 0 !== t.parameters ? t.parameters[p.input] : p.input,
          E = void 0 !== t.parameters ? t.parameters[p.output] : p.output
        r.push(this.getDependency('node', h)),
          a.push(this.getDependency('accessor', f)),
          n.push(this.getDependency('accessor', E)),
          s.push(p),
          i.push(d)
      }
      return Promise.all([Promise.all(r), Promise.all(a), Promise.all(n), Promise.all(s), Promise.all(i)]).then(
        function(r) {
          for (var a = r[0], n = r[1], s = r[2], i = r[3], o = r[4], l = [], c = 0, p = a.length; c < p; c++) {
            var d = a[c],
              h = n[c],
              f = s[c],
              E = i[c],
              m = o[c]
            if (void 0 !== d) {
              var v
              switch ((d.updateMatrix(), (d.matrixAutoUpdate = !0), y[m.path])) {
                case y.weights:
                  v = THREE.NumberKeyframeTrack
                  break
                case y.rotation:
                  v = THREE.QuaternionKeyframeTrack
                  break
                case y.position:
                case y.scale:
                default:
                  v = THREE.VectorKeyframeTrack
              }
              var T = d.name ? d.name : d.uuid,
                g = void 0 !== E.interpolation ? H[E.interpolation] : THREE.InterpolateLinear,
                R = []
              y[m.path] === y.weights
                ? d.traverse(function(e) {
                    !0 === e.isMesh && e.morphTargetInfluences && R.push(e.name ? e.name : e.uuid)
                  })
                : R.push(T)
              for (var M = 0, S = R.length; M < S; M++) {
                var L = new v(R[M] + '.' + y[m.path], h.array, f.array, g)
                'CUBICSPLINE' === E.interpolation &&
                  ((L.createInterpolant = function(e) {
                    return new u(this.times, this.values, this.getValueSize() / 3, e)
                  }),
                  (L.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline = !0)),
                  l.push(L)
              }
            }
          }
          var A = void 0 !== t.name ? t.name : 'animation_' + e
          return new THREE.AnimationClip(A, void 0, l)
        }
      )
    }),
    (F.prototype.loadNode = function(e) {
      var r = this.json,
        a = this.extensions,
        n = this,
        s = r.meshReferences,
        i = r.meshUses,
        o = r.nodes[e]
      return (!0 === o.isBone
        ? Promise.resolve(new THREE.Bone())
        : void 0 !== o.mesh
        ? n.getDependency('mesh', o.mesh).then(function(e) {
            var t
            if (s[o.mesh] > 1) {
              var r = i[o.mesh]++
              ;((t = e.clone()).name += '_instance_' + r), (t.onBeforeRender = e.onBeforeRender)
              for (var a = 0, n = t.children.length; a < n; a++)
                (t.children[a].name += '_instance_' + r), (t.children[a].onBeforeRender = e.children[a].onBeforeRender)
            } else t = e
            return (
              void 0 !== o.weights &&
                t.traverse(function(e) {
                  if (e.isMesh)
                    for (var t = 0, r = o.weights.length; t < r; t++) e.morphTargetInfluences[t] = o.weights[t]
                }),
              t
            )
          })
        : void 0 !== o.camera
        ? n.getDependency('camera', o.camera)
        : o.extensions && o.extensions[t.KHR_LIGHTS_PUNCTUAL] && void 0 !== o.extensions[t.KHR_LIGHTS_PUNCTUAL].light
        ? n.getDependency('light', o.extensions[t.KHR_LIGHTS_PUNCTUAL].light)
        : Promise.resolve(new THREE.Object3D())
      ).then(function(e) {
        if (
          (void 0 !== o.name && ((e.userData.name = o.name), (e.name = THREE.PropertyBinding.sanitizeNodeName(o.name))),
          b(e, o),
          o.extensions && w(a, e, o),
          void 0 !== o.matrix)
        ) {
          var t = new THREE.Matrix4()
          t.fromArray(o.matrix), e.applyMatrix(t)
        } else void 0 !== o.translation && e.position.fromArray(o.translation), void 0 !== o.rotation && e.quaternion.fromArray(o.rotation), void 0 !== o.scale && e.scale.fromArray(o.scale)
        return e
      })
    }),
    (F.prototype.loadScene = (function() {
      function e(t, r, a, n) {
        var s = a.nodes[t]
        return n
          .getDependency('node', t)
          .then(function(e) {
            return void 0 === s.skin
              ? e
              : n
                  .getDependency('skin', s.skin)
                  .then(function(e) {
                    for (var r = [], a = 0, s = (t = e).joints.length; a < s; a++)
                      r.push(n.getDependency('node', t.joints[a]))
                    return Promise.all(r)
                  })
                  .then(function(r) {
                    for (var a = !0 === e.isGroup ? e.children : [e], n = 0, s = a.length; n < s; n++) {
                      for (var i = a[n], o = [], l = [], c = 0, p = r.length; c < p; c++) {
                        var u = r[c]
                        if (u) {
                          o.push(u)
                          var d = new THREE.Matrix4()
                          void 0 !== t.inverseBindMatrices && d.fromArray(t.inverseBindMatrices.array, 16 * c),
                            l.push(d)
                        } else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.', t.joints[c])
                      }
                      i.bind(new THREE.Skeleton(o, l), i.matrixWorld)
                    }
                    return e
                  })
            var t
          })
          .then(function(t) {
            r.add(t)
            var i = []
            if (s.children)
              for (var o = s.children, l = 0, c = o.length; l < c; l++) {
                var p = o[l]
                i.push(e(p, t, a, n))
              }
            return Promise.all(i)
          })
      }
      return function(t) {
        var r = this.json,
          a = this.extensions,
          n = this.json.scenes[t],
          s = new THREE.Scene()
        void 0 !== n.name && (s.name = n.name), b(s, n), n.extensions && w(a, s, n)
        for (var i = n.nodes || [], o = [], l = 0, c = i.length; l < c; l++) o.push(e(i[l], s, r, this))
        return Promise.all(o).then(function() {
          return s
        })
      }
    })()),
    e
  )
})()
