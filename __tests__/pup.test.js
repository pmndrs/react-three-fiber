const { toMatchImageSnapshot } = require('jest-image-snapshot')

expect.extend({ toMatchImageSnapshot })

describe('Google', () => {
  beforeAll(async () => {
    await browser.newPage()
    // await page.setViewport({ width: 1920, height: 1080 })
    await page.goto('http://localhost:8081')
    await page.waitForSelector('canvas')
  })

  beforeEach(async () => {
    await page.waitFor(500)
  })

  it('should render a cube', async () => {
    const screenshot = await page.screenshot()

    expect(screenshot).toMatchImageSnapshot({ customDiffConfig: { threshold: 0.5 } })
  })

  it('should react to click event and move the cube forward', async () => {
    const { x, y, width, height } = await page.evaluate(() => {
      const { x, y, width, height } = document.querySelector('canvas').getBoundingClientRect()
      return { x, y, width, height }
    })
    await page.mouse.click(x + width / 2, y + height / 2)
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot({ customDiffConfig: { threshold: 0.5 } })
  })
})
