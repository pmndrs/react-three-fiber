const { toMatchImageSnapshot } = require('jest-image-snapshot')

expect.extend({ toMatchImageSnapshot })

const width = 1920
const widthHalf = width / 2
const height = 1080
const heightHalf = height / 2
const xy = (x, y) => [widthHalf + x, heightHalf + y]

describe('point and click', () => {
  beforeAll(async () => {
    await browser.newPage()
    await page.setViewport({ width, height })
    await page.goto('http://localhost:3000/#/demo/ClickAndHover?dev=true')
    await page.waitForSelector('canvas')
    await page.waitForTimeout(500)
  })

  it('hovers and selects it', async () => {
    await page.mouse.move(...xy(0, 0))
    await page.mouse.click(...xy(0, 0))
    expect(await page.screenshot()).toMatchImageSnapshot({
      failureThreshold: 0.005,
      failureThresholdType: 'percent',
    })
  })
})

describe('point and click', () => {
  beforeAll(async () => {
    await browser.newPage()
    await page.setViewport({ width, height })
    await page.goto('http://localhost:3000/#/demo/StopPropagation?dev=true')
    await page.waitForSelector('canvas')
    await page.waitForTimeout(500)
  })

  it('shows three boxes: red, green, blue', async () => {
    await page.mouse.move(...xy(-widthHalf, 0))
    expect(await page.screenshot()).toMatchImageSnapshot({
      failureThreshold: 0.005,
      failureThresholdType: 'percent',
    })
  })
  it('hovers the red box', async () => {
    await page.mouse.move(...xy(-100, 0))
    expect(await page.screenshot()).toMatchImageSnapshot({
      failureThreshold: 0.005,
      failureThresholdType: 'percent',
    })
  })
  it('hovers the red and green box', async () => {
    await page.mouse.move(...xy(0, 0))
    expect(await page.screenshot()).toMatchImageSnapshot({
      failureThreshold: 0.005,
      failureThresholdType: 'percent',
    })
  })
  it('hovers the green box', async () => {
    await page.mouse.move(...xy(20, 0))
    expect(await page.screenshot()).toMatchImageSnapshot({
      failureThreshold: 0.005,
      failureThresholdType: 'percent',
    })
  })
  it('hovers the green and blue box', async () => {
    await page.mouse.move(...xy(75, 0))
    expect(await page.screenshot()).toMatchImageSnapshot({
      failureThreshold: 0.005,
      failureThresholdType: 'percent',
    })
  })
  it('hovers the blue box', async () => {
    await page.mouse.move(...xy(100, 0))
    expect(await page.screenshot()).toMatchImageSnapshot({
      failureThreshold: 0.005,
      failureThresholdType: 'percent',
    })
  })
  it('pointerout', async () => {
    await page.mouse.move(...xy(widthHalf, 0))
    expect(await page.screenshot()).toMatchImageSnapshot({
      failureThreshold: 0.005,
      failureThresholdType: 'percent',
    })
  })
})
