interface DeprecationNotice {
  heading: string
  body?: string
  link?: string
}

// Track which deprecation notices have already been shown in this session
const shownNotices = new Set<string>()

/**
 * Logs a formatted deprecation warning to the console with colored styling.
 * Each unique notice (by heading) is only shown once per session.
 *
 * @param notice - Object containing the deprecation notice details
 * @param notice.heading - Required heading/title for the deprecation warning
 * @param notice.body - Optional body text providing additional details
 * @param notice.link - Optional URL link to documentation or migration guide
 */
export function notifyDepreciated({ heading, body, link }: DeprecationNotice): void {
  // Suppress deprecation warnings in test environment unless explicitly enabled
  if (
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) &&
    process.env.R3F_SHOW_DEPRECATION_WARNINGS !== 'true'
  ) {
    return
  }

  // Skip if we've already shown this notice in this session
  if (shownNotices.has(heading)) return
  shownNotices.add(heading)

  const caller = getCallerFrame()

  if (caller) {
    console.log()
  }

  // Styled heading with orange box
  const boxStyle = 'background: #ff9800; color: #1a1a1a; padding: 8px 12px; border-radius: 4px; font-weight: 500;'
  if (caller) {
    // First line: orange box heading only
    console.log(`%c⚠️ ${heading}`, boxStyle)
    // Second line: function name and (location) in muted gray, no background
    // todo: good idea, but internal locations may not be as useful
    // console.log(`%c${caller.functionName} %c(${caller.location})`, 'color:#888;', 'color:#aaa;')
  }
  // I think this can never be reached so is being flagged in coverage
  // else {
  //   // Fallback: heading only
  //   console.log(`%c⚠️ ${heading}`, boxStyle)
  // }

  // Plain warn for body details (uses browser's default warn styling)
  if (body || link) {
    let message = ''
    if (body) message += body
    if (link) message += (body ? '\n\n' : '') + `More info: ${link}`
    console.warn(`%c${message}`, 'font-weight: bold;')
  }
}

type CallerFrame = {
  functionName: string
  location: string
}

function getCallerFrame(depth = 3): CallerFrame | null {
  const stack = new Error().stack
  if (!stack) return null

  const lines = stack.split('\n')
  const frame = lines[depth]
  if (!frame) return null

  // Chrome / Chromium
  let match = frame.match(/^\s*at (?:(.+?) )?\(?(.+?):(\d+):(\d+)\)?$/)

  // Firefox / Safari
  // istanbul ignore next - Jest/Node.js stack traces follow Chrome format, this path only executes in Firefox/Safari browsers
  if (!match) {
    match = frame.match(/^(?:(.+?)@)?(.+?):(\d+):(\d+)$/)
  }

  if (!match) return null

  const [, fn, url, line] = match

  return {
    functionName: fn ?? '<anonymous>',
    location: formatLocation(url, Number(line)),
  }
}

function formatLocation(url: string, line: number): string {
  const clean = url.split('?')[0]
  const file = clean.split('/').pop() ?? clean
  return `${file}:${line}`
}
