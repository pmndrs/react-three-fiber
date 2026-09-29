import { RuleTester } from 'eslint'
import rule from '../../src/rules/prefer-useloader'

const tester = new RuleTester({
  parserOptions: { ecmaVersion: 2015 },
})

tester.run('prefer-useloader', rule, {
  valid: [
    `
    const texture = useLoader(TextureLoader, '/texture.png')
  `,
    `
    const gltf = useLoader(GLTFLoader, '/model.glb')
  `,
    `
    useFrame(() => {
      ref.current.rotation.y += 0.01
    })
  `,
    `
    const loader = new TextureLoader()
    loader.load('/texture.png')
  `,
  ],
  invalid: [
    {
      code: `
        useEffect(() => {
          new TextureLoader().load('/texture.png', (texture) => {
            setTexture(texture)
          })
        }, [])
      `,
      errors: [{ messageId: 'preferUseLoader' }],
    },
    {
      code: `
        useEffect(() => {
          const loader = new GLTFLoader()
          loader.load('/model.glb', (gltf) => {
            setModel(gltf)
          })
        }, [])
      `,
      errors: [{ messageId: 'preferUseLoader' }],
    },
    {
      code: `
        useEffect(() => {
          loader.loadAsync('/model.glb').then((gltf) => {
            setModel(gltf)
          })
        }, [])
      `,
      errors: [{ messageId: 'preferUseLoader' }],
    },
  ],
})
