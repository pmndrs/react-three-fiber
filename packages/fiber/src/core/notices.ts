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

  // Mark this notice as shown
  shownNotices.add(heading)
  const styles = {
    header: 'background: #ff6b35; color: #fff; font-weight: bold; padding: 8px 12px; border-radius: 4px 4px 0 0;',
    body: 'background: #fff3cd; color: #856404; padding: 8px 12px;',
    link: 'background: #e7f3ff; color: #0066cc; padding: 8px 12px; border-radius: 0 0 4px 4px; text-decoration: underline;',
    separator: 'background: transparent; color: transparent; padding: 2px;',
  }

  // Build the console message
  const parts: string[] = []
  const styleParts: string[] = []

  // Header section
  parts.push(`%c⚠️ ${heading}`)
  styleParts.push(styles.header)

  // Body section (if provided)
  if (body) {
    parts.push(`%c\n${body}`)
    styleParts.push(styles.body)
  }

  // Link section (if provided)
  if (link) {
    parts.push(`%c\n📖 More info: ${link}`)
    styleParts.push(styles.link)
  }

  // Log with all styles applied
  console.warn(parts.join(''), ...styleParts)

  // Also log a clean version for better readability in some console environments
  console.groupCollapsed(`⚠️ Deprecation: ${heading}`)
  if (body) console.log(body)
  if (link) console.log(`📖 More info: %c${link}`, 'color: #0066cc; text-decoration: underline;')
  console.groupEnd()
}
