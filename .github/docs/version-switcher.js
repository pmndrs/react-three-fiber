// Docs version switcher.
//
// pmndrs/docs has no notion of versions, so the docs workflow builds each release line as its own
// static site (stable at the root, the prerelease under a sub-path), then injects this script into
// every page of both. It renders a small version picker pinned to the corner of the page.
//
// Configuration comes from the injecting <script> tag:
//   src            -> <pages base>/version-switcher.js, so the site's base path is known
//   data-versions  -> JSON [{ label, tag, path, prerelease? }], `path` relative to the base ('' = root)
//
// The picker is appended to <body> and never inside the React tree: React 19 skips unknown
// top-level <body> nodes while hydrating, whereas a node inside a component would cause a mismatch.
;(function () {
  var script = document.currentScript
  if (!script) return

  var versions
  try {
    versions = JSON.parse(script.getAttribute('data-versions') || '[]')
  } catch (e) {
    return
  }
  if (versions.length < 2) return

  var base = new URL(script.src).pathname.replace(/\/version-switcher\.js$/, '')

  // The version whose sub-path is the longest prefix of the current URL ('' matches everything).
  function current() {
    var pathname = location.pathname
    var match = null
    versions.forEach(function (v) {
      var prefix = base + v.path
      var inside = v.path === '' || pathname === prefix || pathname.indexOf(prefix + '/') === 0
      if (inside && (!match || v.path.length > match.path.length)) match = v
    })
    return match || versions[0]
  }

  // Same page in another version, falling back to that version's home when it doesn't exist there.
  function go(target) {
    var from = current()
    var rest = location.pathname.slice((base + from.path).length) || '/'
    var home = base + target.path + '/'
    var url = base + target.path + rest + location.search + location.hash
    fetch(url, { method: 'HEAD' })
      .then(function (res) {
        location.assign(res.ok ? url : home)
      })
      .catch(function () {
        location.assign(url)
      })
  }

  function mount() {
    if (document.getElementById('docs-version-switcher')) return

    var host = document.createElement('div')
    host.id = 'docs-version-switcher'
    var root = host.attachShadow({ mode: 'open' })

    var active = current()

    var style = document.createElement('style')
    // Colours come from the site's own shadcn tokens (custom properties inherit into the shadow
    // root), so the picker follows the light/dark theme; the hex values are only fallbacks.
    style.textContent =
      ':host{position:fixed;right:16px;bottom:16px;z-index:50;font:500 13px/1 var(--font-inter,system-ui),sans-serif}' +
      'label{position:relative;display:flex;align-items:center;gap:8px;padding:0 30px 0 12px;height:32px;' +
      'border-radius:999px;border:1px solid var(--border,#d0d7de);background:var(--background,#fff);' +
      'color:var(--foreground,#1f2328);box-shadow:0 2px 8px rgb(0 0 0 / .12);cursor:pointer}' +
      'label:focus-within{outline:2px solid var(--ring,#1f6feb);outline-offset:2px}' +
      'label::after{content:"";position:absolute;right:12px;top:12px;width:6px;height:6px;' +
      'border:solid currentColor;border-width:0 1.5px 1.5px 0;transform:rotate(45deg);pointer-events:none}' +
      '.dot{width:8px;height:8px;border-radius:50%;background:var(--muted-foreground,#8c959f)}' +
      '.prerelease .dot{background:#d29922}' +
      'select{position:absolute;inset:0;opacity:0;cursor:pointer;font:inherit}' +
      '@media print{:host{display:none}}'

    var label = document.createElement('label')
    if (active.prerelease) label.className = 'prerelease'
    label.title = 'Documentation version'

    var dot = document.createElement('span')
    dot.className = 'dot'
    var text = document.createElement('span')
    text.textContent = active.label + ' · ' + active.tag

    // A native <select> laid invisibly over the pill: keyboard and screen-reader support for free.
    var select = document.createElement('select')
    select.setAttribute('aria-label', 'Documentation version')
    versions.forEach(function (v, i) {
      var option = document.createElement('option')
      option.value = String(i)
      option.textContent = v.label + ' (' + v.tag + ')'
      option.selected = v === active
      select.appendChild(option)
    })
    select.addEventListener('change', function () {
      var target = versions[Number(select.value)]
      if (target !== current()) go(target)
    })

    label.append(dot, text, select)
    root.append(style, label)
    document.body.appendChild(host)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount)
  else mount()
})()
