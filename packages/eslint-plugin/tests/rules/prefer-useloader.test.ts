import { RuleTester } from 'eslint'
import rule from '../../src/rules/prefer-useloader'

const tester = new RuleTester({
  parserOptions: { ecmaVersion: 2015 },
})

tester.run('prefer-useloader', rule, {
  valid: [
    `
    const texture = useLoader(TextureLoader, url)
    `,
    `
    const gltf = useLoader(GLTFLoader, '/model.glb')
    `,
    `
    new TextureLoader().load(url, (t) => {})
    `,
    `
    loader.load(url)
    `,
    `
    loader.loadAsync(url)
    `,
    `
    function setup() {
      new TextureLoader().load(url, (t) => {})
    }
    `,
  ],
  invalid: [
    {
      code: `
        useEffect(() => {
          new TextureLoader().load(url, (texture) => {
            setTexture(texture)
          })
        }, [])
      `,
      errors: [{ messageId: 'preferUseLoader' }],
    },
    {
      code: `
        useEffect(() => {
          new GLTFLoader().loadAsync('/model.glb').then((gltf) => {
            setModel(gltf)
          })
        }, [])
      `,
      errors: [{ messageId: 'preferUseLoader' }],
    },
    {
      code: `
        useLayoutEffect(() => {
          loader.load(url, (texture) => {
            setTexture(texture)
          })
        }, [])
      `,
      errors: [{ messageId: 'preferUseLoader' }],
    },
    {
      code: `
        useLayoutEffect(() => {
          loader.loadAsync(url).then((result) => {
            setResult(result)
          })
        }, [])
      `,
      errors: [{ messageId: 'preferUseLoader' }],
    },
    {
      code: `
        useEffect(() => {
          const loader = new TextureLoader()
          loader.load(url, (t) => setTexture(t))
          loader.loadAsync(url2).then((t) => setTexture2(t))
        }, [])
      `,
      errors: [{ messageId: 'preferUseLoader' }, { messageId: 'preferUseLoader' }],
    },
  ],
})
