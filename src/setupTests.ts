import { expect } from 'vitest'
import '@testing-library/jest-dom'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'

// vitest-axe's type augmentation targets the old `Vi.Assertion` global namespace,
// which current Vitest no longer reads — augment the `vitest` module's Assertion
// directly. Runtime registration also needs expect.extend(); the package's
// extend-expect entry never calls it.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
  interface Assertion<T> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

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
