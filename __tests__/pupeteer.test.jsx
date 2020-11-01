const { toMatchImageSnapshot } = require('jest-image-snapshot')

expect.extend({ toMatchImageSnapshot })

describe('pointer propagation', () => {
  beforeAll(async () => {
    await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    await page.goto('http://localhost:3000/#/demo/ClickAndHover')
    await page.waitForSelector('canvas')
    await page.waitForTimeout(500)
  })

  it('should render a cube', async () => {
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot()
  })

  it('hovers and selects it', async () => {
    const { width, height } = await page.evaluate(() =>
      document.querySelector('canvas').getBoundingClientRect().toJSON()
    )
    await page.mouse.move(width / 2, height / 2)
    await page.mouse.click(width / 2, height / 2)
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot()
  })
})
