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
        react 3
        <br />
        three
      </h1>
    </Page>
  )
}
