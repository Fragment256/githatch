import { expect } from 'vitest'
import '@testing-library/jest-dom'
import * as axeMatchers from 'vitest-axe/matchers'
import 'vitest-axe/extend-expect'

// vitest-axe's extend-expect entry only augments TypeScript types; it never calls
// expect.extend() at runtime, so toHaveNoViolations() needs registering explicitly.
expect.extend(axeMatchers)

// jsdom doesn't implement HTMLDialogElement methods
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
}
