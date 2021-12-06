import 'regenerator-runtime/runtime'

import { pointerEventPolyfill } from './pointerEventPolyfill'

// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true

pointerEventPolyfill()
