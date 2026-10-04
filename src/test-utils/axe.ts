import { configureAxe } from 'vitest-axe'

export const axe = configureAxe({
  // colour-contrast checks are unreliable in jsdom (no computed styles)
  rules: { 'color-contrast': { enabled: false } },
})
