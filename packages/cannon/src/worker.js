import {
  World,
  NaiveBroadphase,
  SAPBroadphase,
  Body,
  Plane,
  Box,
  Vec3,
  ConvexPolyhedron,
  Cylinder,
  Heightfield,
  Particle,
  Sphere,
  Trimesh,
  PointToPointConstraint,
  ConeTwistConstraint,
  HingeConstraint,
  DistanceConstraint,
  LockConstraint,
  Constraint,
  Spring,
  Material,
  Quaternion,
  Ray,
  RaycastResult,
} from 'cannon-es'

let bodies = {}
const springs = {}
const rays = {}
const world = new World()
const config = { step: 1 / 60 }
const subscriptions = {}
const tempVector = new Vec3()

function createShape(type, args) {
  switch (type) {
    case 'Box':
      return new Box(new Vec3(...args.map((v) => v / 2))) // extents => halfExtents
    case 'ConvexPolyhedron':
      const [v, f, n] = args
      return new ConvexPolyhedron({
        vertices: v.map(([x, y, z]) => new Vec3(x, y, z)),
        normals: n ? n.map(([x, y, z]) => new Vec3(x, y, z)) : null,
        faces: f,
      })
    case 'Cylinder':
      return new Cylinder(...args) // [ radiusTop, radiusBottom, height, numSegments ] = args
    case 'Heightfield':
      return new Heightfield(...args) // [ Array data, options: {minValue, maxValue, elementSize}  ] = args
    case 'Particle':
      return new Particle() // no args
    case 'Plane':
      return new Plane() // no args, infinite x and y
    case 'Sphere':
      return new Sphere(...args) // [radius] = args
    case 'Trimesh':
      return new Trimesh(...args) // [vertices, indices] = args
  }
}

function syncBodies() {
  self.postMessage({ op: 'sync', bodies: world.bodies.map((body) => body.uuid) })
  bodies = world.bodies.reduce((acc, body) => ({ ...acc, [body.uuid]: body }), {})
}

self.onmessage = (e) => {
  const { op, uuid, type, positions, quaternions, props } = e.data

  switch (op) {
    case 'init': {
      const {
        gravity,
        tolerance,
        step,
        iterations,
        allowSleep,
        broadphase,
        axisIndex,
        defaultContactMaterial,
      } = props
      const broadphases = { NaiveBroadphase, SAPBroadphase }
      world.allowSleep = allowSleep
      world.gravity.set(gravity[0], gravity[1], gravity[2])
      world.solver.tolerance = tolerance
      world.solver.iterations = iterations
      world.broadphase = new (broadphases[broadphase + 'Broadphase'] || NaiveBroadphase)(world)
      world.broadphase.axisIndex = axisIndex ?? 0
      Object.assign(world.defaultContactMaterial, defaultContactMaterial)
      config.step = step
      break
    }
    case 'step': {
      world.step(config.step)
      const numberOfBodies = world.bodies.length
      for (let i = 0; i < numberOfBodies; i++) {
        let b = world.bodies[i],
          p = b.position,
          q = b.quaternion
        positions[3 * i + 0] = p.x
        positions[3 * i + 1] = p.y
        positions[3 * i + 2] = p.z
        quaternions[4 * i + 0] = q.x
        quaternions[4 * i + 1] = q.y
        quaternions[4 * i + 2] = q.z
        quaternions[4 * i + 3] = q.w
      }
      const observations = []
      for (const id of Object.keys(subscriptions)) {
        const [uuid, type] = subscriptions[id]
        let value = bodies[uuid][type]
        if (value instanceof Vec3) value = value.toArray()
        else if (value instanceof Quaternion) {
          value.toEuler(tempVector)
          value = tempVector.toArray()
        }
        observations.push([id, value])
      }
      self.postMessage(
        {
          op: 'frame',
          positions,
          quaternions,
          observations,
          active: world.hasActiveBodies,
        },
        [positions.buffer, quaternions.buffer]
      )
      break
    }
    case 'addBodies': {
      for (let i = 0; i < uuid.length; i++) {
        const {
          args = [],
          position = [0, 0, 0],
          rotation = [0, 0, 0],
          scale = [1, 1, 1],
          velocity = [0, 0, 0],
          angularVelocity = [0, 0, 0],
          linearFactor = [1, 1, 1],
          angularFactor = [1, 1, 1],
          type: bodyType,
          mass,
          material,
          shapes,
          onCollide,
          ...extra
        } = props[i]

        const body = new Body({
          ...extra,
          mass: bodyType === 'Static' ? 0 : mass,
          type: bodyType ? Body[bodyType.toUpperCase()] : undefined,
          material: material ? new Material(material) : undefined,
        })
        body.uuid = uuid[i]

        if (type === 'Compound') {
          shapes.forEach(({ type, args, position, rotation, material, ...extra }) => {
            const shapeBody = body.addShape(
              createShape(type, args),
              position ? new Vec3(...position) : undefined,
              rotation ? new Quaternion().setFromEuler(...rotation) : undefined
            )
            if (material) shapeBody.material = new Material(material)
            Object.assign(shapeBody, extra)
          })
        } else {
          body.addShape(createShape(type, args))
        }

        body.position.set(position[0], position[1], position[2])
        body.quaternion.setFromEuler(rotation[0], rotation[1], rotation[2])
        body.velocity.set(velocity[0], velocity[1], velocity[2])
        body.angularVelocity.set(angularVelocity[0], angularVelocity[1], angularVelocity[2])
        body.linearFactor.set(linearFactor[0], linearFactor[1], linearFactor[2])
        body.angularFactor.set(angularFactor[0], angularFactor[1], angularFactor[2])
        world.addBody(body)

        if (onCollide)
          body.addEventListener('collide', ({ type, body, target, contact }) => {
            const { ni, ri, rj } = contact
            self.postMessage({
              op: 'event',
              type,
              body: body.uuid,
              target: target.uuid,
              contact: {
                ni: ni.toArray(),
                ri: ri.toArray(),
                rj: rj.toArray(),
                impactVelocity: contact.getImpactVelocityAlongNormal(),
              },
              collisionFilters: {
                bodyFilterGroup: body.collisionFilterGroup,
                bodyFilterMask: body.collisionFilterMask,
                targetFilterGroup: target.collisionFilterGroup,
                targetFilterMask: target.collisionFilterMask,
              },
            })
          })
      }
      syncBodies()
      break
    }
    case 'removeBodies': {
      for (let i = 0; i < uuid.length; i++) world.removeBody(bodies[uuid[i]])
      syncBodies()
      break
    }
    case 'subscribe': {
      const { id, type } = props
      subscriptions[id] = [uuid, type]
      break
    }
    case 'unsubscribe': {
      delete subscriptions[props]
      break
    }
    case 'setPosition':
      bodies[uuid].position.set(props[0], props[1], props[2])
      break
    case 'setQuaternion':
      bodies[uuid].quaternion.setFromEuler(props[0], props[1], props[2])
      break
    case 'setVelocity':
      bodies[uuid].velocity.set(props[0], props[1], props[2])
      break
    case 'setAngularVelocity':
      bodies[uuid].angularVelocity.set(props[0], props[1], props[2])
      break
    case 'setLinearFactor':
      bodies[uuid].linearFactor.set(props[0], props[1], props[2])
      break
    case 'setAngularFactor':
      bodies[uuid].angularFactor.set(props[0], props[1], props[2])
      break
    case 'setMass':
      bodies[uuid].mass = props
      break
    case 'setLinearDamping':
      bodies[uuid].linearDamping = props
      break
    case 'setAngularDamping':
      bodies[uuid].angularDamping = props
      break
    case 'setAllowSleep':
      bodies[uuid].allowSleep = props
      break
    case 'setSleepSpeedLimit':
      bodies[uuid].sleepSpeedLimit = props
      break
    case 'setSleepTimeLimit':
      bodies[uuid].sleepTimeLimit = props
      break
    case 'setCollisionFilterGroup':
      bodies[uuid].collisionFilterGroup = props
      break
    case 'setCollisionFilterMask':
      bodies[uuid].collisionFilterMask = props
      break
    case 'setCollisionFilterMask':
      bodies[uuid].collisionFilterMask = props
      break
    case 'setFixedRotation':
      bodies[uuid].fixedRotation = props
      break
    case 'applyForce':
      bodies[uuid].applyForce(new Vec3(...props[0]), new Vec3(...props[1]))
      break
    case 'applyImpulse':
      bodies[uuid].applyImpulse(new Vec3(...props[0]), new Vec3(...props[1]))
      break
    case 'applyLocalForce':
      bodies[uuid].applyLocalForce(new Vec3(...props[0]), new Vec3(...props[1]))
      break
    case 'applyLocalImpulse':
      bodies[uuid].applyLocalImpulse(new Vec3(...props[0]), new Vec3(...props[1]))
      break
    case 'addConstraint': {
      const [bodyA, bodyB, optns] = props
      let { pivotA, pivotB, axisA, axisB, ...options } = optns

      // is there a better way to enforce defaults?
      pivotA = Array.isArray(pivotA) ? new Vec3(...pivotA) : undefined
      pivotB = Array.isArray(pivotB) ? new Vec3(...pivotB) : undefined
      axisA = Array.isArray(axisA) ? new Vec3(...axisA) : undefined
      axisB = Array.isArray(axisB) ? new Vec3(...axisB) : undefined

      let constraint

      switch (type) {
        case 'PointToPoint':
          constraint = new PointToPointConstraint(
            bodies[bodyA],
            pivotA,
            bodies[bodyB],
            pivotB,
            optns.maxForce
          )
          break
        case 'ConeTwist':
          constraint = new ConeTwistConstraint(bodies[bodyA], bodies[bodyB], {
            pivotA,
            pivotB,
            axisA,
            axisB,
            ...options,
          })
          break
        case 'Hinge':
          constraint = new HingeConstraint(bodies[bodyA], bodies[bodyB], {
            pivotA,
            pivotB,
            axisA,
            axisB,
            ...options,
          })
          break
        case 'Distance':
          constraint = new DistanceConstraint(bodies[bodyA], bodies[bodyB], optns.distance, optns.maxForce)
          break
        case 'Lock':
          constraint = new LockConstraint(bodies[bodyA], bodies[bodyB], optns)
          break
        default:
          constraint = new Constraint(bodies[bodyA], bodies[bodyB], optns)
          break
      }
      constraint.uuid = uuid
      world.addConstraint(constraint)
      break
    }
    case 'removeConstraint':
      world.removeConstraint(uuid)
      break

    case 'enableConstraint':
      world.constraints.filter(({ uuid: thisId }) => thisId === uuid).map((c) => c.enable())
      break

    case 'disableConstraint':
      world.constraints.filter(({ uuid: thisId }) => thisId === uuid).map((c) => c.disable())
      break

    case 'addSpring': {
      const [bodyA, bodyB, optns] = props
      let { worldAnchorA, worldAnchorB, localAnchorA, localAnchorB, restLength, stiffness, damping } = optns

      worldAnchorA = Array.isArray(worldAnchorA) ? new Vec3(...worldAnchorA) : undefined
      worldAnchorB = Array.isArray(worldAnchorB) ? new Vec3(...worldAnchorB) : undefined
      localAnchorA = Array.isArray(localAnchorA) ? new Vec3(...localAnchorA) : undefined
      localAnchorB = Array.isArray(localAnchorB) ? new Vec3(...localAnchorB) : undefined

      let spring = new Spring(bodies[bodyA], bodies[bodyB], {
        worldAnchorA,
        worldAnchorB,
        localAnchorA,
        localAnchorB,
        restLength,
        stiffness,
        damping,
      })

      spring.uuid = uuid

      let postStepSpring = (e) => spring.applyForce()

      springs[uuid] = postStepSpring

      // Compute the force after each step
      world.addEventListener('postStep', springs[uuid])
      break
    }
    case 'removeSpring': {
      world.removeEventListener('postStep', springs[uuid])
      break
    }
    case 'addRay': {
      const { from, to, ...options } = props
      const ray = new Ray(from ? new Vec3(...from) : undefined, to ? new Vec3(...to) : undefined)
      options.mode = Ray[options.mode.toUpperCase()]
      options.result = new RaycastResult()
      rays[uuid] = () => {
        ray.intersectWorld(world, options)
        const {
          body,
          shape,
          rayFromWorld,
          rayToWorld,
          hitNormalWorld,
          hitPointWorld,
          ...rest
        } = options.result
        self.postMessage({
          op: 'event',
          type: 'rayhit',
          ray: {
            from,
            to,
            direction: ray.direction.toArray(),
            collisionFilterGroup: ray.collisionFilterGroup,
            collisionFilterMask: ray.collisionFilterMask,
            uuid,
          },
          body: body ? body.uuid : null,
          shape: shape ? { ...shape, body: body.uuid } : null,
          rayFromWorld: rayFromWorld.toArray(),
          rayToWorld: rayToWorld.toArray(),
          hitNormalWorld: hitNormalWorld.toArray(),
          hitPointWorld: hitPointWorld.toArray(),
          ...rest,
        })
      }
      world.addEventListener('preStep', rays[uuid])
      break
    }
    case 'removeRay': {
      world.removeEventListener('preStep', rays[uuid])
      delete rays[uuid]
      break
    }
  }
}
