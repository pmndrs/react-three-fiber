import rule from '../../src/rules/prefer-useloader'
import { tester } from '../tester'

tester.run('prefer-useloader', rule, {
  valid: [
    `
    function Wood() {
      const texture = useLoader(TextureLoader, '/wood.png')
    }
  `,
    // Loading in response to an event, not during render or in an effect
    `
    function Upload() {
      const onDrop = (file) => new GLTFLoader().load(URL.createObjectURL(file), setModel)
    }
  `,
    // load() on things that are not three.js loaders
    `
    function Player() {
      useEffect(() => {
        videoRef.current.load()
        document.fonts.load('1em Inter')
        manager.load(url)
      }, [src])
    }
  `,
    // A loader created outside of the hook's callback, at module level, but used elsewhere
    `
    const loader = new TextureLoader()
    export function preload() { loader.load('/wood.png') }
  `,
    // The deps array is not the hook's callback
    `
    useEffect(run, [new TextureLoader().load(url)])
  `,
  ],
  invalid: [
    {
      code: `
        function Wood() {
          useEffect(() => {
            new TextureLoader().load('/wood.png', setTexture)
          }, [])
        }
      `,
      errors: [{ messageId: 'preferUseLoader', data: { method: 'load', hook: 'useEffect' } }],
    },
    {
      code: `
        function Model() {
          React.useLayoutEffect(() => {
            const loader = new GLTFLoader()
            loader.loadAsync('/model.glb').then(setModel)
          }, [])
        }
      `,
      errors: [{ messageId: 'preferUseLoader', data: { method: 'loadAsync', hook: 'useLayoutEffect' } }],
    },
    {
      // A module-level loader, used in a memo and a state initialiser
      code: `
        const loader = new THREE.TextureLoader()
        function Wood({ url }) {
          const a = useMemo(() => loader.load(url), [url])
          const [b] = useState(() => loader.load(url))
        }
      `,
      errors: [
        { messageId: 'preferUseLoader', data: { method: 'load', hook: 'useMemo' } },
        { messageId: 'preferUseLoader', data: { method: 'load', hook: 'useState' } },
      ],
    },
    {
      // Inside a nested callback of the effect
      code: `
        function Models({ urls }) {
          useEffect(() => {
            urls.forEach((url) => new GLTFLoader().load(url, add))
          }, [urls])
        }
      `,
      errors: [{ messageId: 'preferUseLoader' }],
    },
  ],
})
