import '@testing-library/jest-dom'
import { configureAxe } from 'vitest-axe'
import 'vitest-axe/extend-expect'

configureAxe({
  rules: [
    // colour-contrast checks are unreliable in jsdom (no computed styles)
    { id: 'color-contrast', enabled: false },
  ],
})

// jsdom doesn't implement HTMLDialogElement methods
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
}
