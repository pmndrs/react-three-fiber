import React from 'react'

import { Setup } from '../Setup'

import { Text } from '../../src/Text'
import { useTurntable } from '../useTurntable'

export default {
  title: 'Abstractions/Text',
  component: Text,
  decorators: [(storyFn) => <Setup cameraPosition={[0, 0, 200]}>{storyFn()}</Setup>],
}

function TextScene() {
  const ref = useTurntable()

  return (
    <Text
      ref={ref}
      color={'#EC2D2D'}
      fontSize={12}
      maxWidth={200}
      lineHeight={1}
      letterSpacing={0.02}
      textAlign={'left'}
      font="https://fonts.gstatic.com/s/raleway/v14/1Ptrg8zYS_SKggPNwK4vaqI.woff"
      anchorX="center"
      anchorY="middle">
      LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT, SED DO EIUSMOD TEMPOR INCIDIDUNT UT LABORE ET DOLORE
      MAGNA ALIQUA. UT ENIM AD MINIM VENIAM, QUIS NOSTRUD EXERCITATION ULLAMCO LABORIS NISI UT ALIQUIP EX EA COMMODO
      CONSEQUAT. DUIS AUTE IRURE DOLOR IN REPREHENDERIT IN VOLUPTATE VELIT ESSE CILLUM DOLORE EU FUGIAT NULLA PARIATUR.
      EXCEPTEUR SINT OCCAECAT CUPIDATAT NON PROIDENT, SUNT IN CULPA QUI OFFICIA DESERUNT MOLLIT ANIM ID EST LABORUM.
    </Text>
  )
}

export const TextSt = () => <TextScene />
TextSt.storyName = 'Default'
