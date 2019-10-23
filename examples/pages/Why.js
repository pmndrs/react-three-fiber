import React from 'react'
import styled from 'styled-components'
import { Page as PageImpl } from '../styles'

const Page = styled(PageImpl)`
  background: #171720;
`

export default function Why() {
  return (
    <Page>
      <h1>
        react
        <br />
        three
        <br />
        fiber
        <br />
        three
      </h1>
    </Page>
  )
}
