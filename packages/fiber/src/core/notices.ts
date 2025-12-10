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
  // Skip if we've already shown this notice in this session
  if (shownNotices.has(heading)) return
  shownNotices.add(heading)

  // Unified styling for the entire notice block
  const boxStyle = 'background: #ff9800; color: #1a1a1a; padding: 8px 12px; border-radius: 4px; font-weight: 500;'
  const linkStyle = 'color: #0044aa; text-decoration: underline;'

  // Build the message content
  let message = `⚠️ ${heading}`
  if (body) message += `\n\n${body}`
  if (link) message += `\n\nMore info: ${link}`

  console.warn(`%c${message}`, boxStyle)
}
