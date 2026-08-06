import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    sessionStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    sessionStorage.clear()
    document.documentElement.classList.remove('dark')
    vi.restoreAllMocks()
  })

  it('defaults to light theme', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('restores dark theme from sessionStorage', () => {
    sessionStorage.setItem('githatch:theme', 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggles from light to dark', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggleTheme())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(sessionStorage.getItem('githatch:theme')).toBe('dark')
  })

  it('toggles from dark to light', () => {
    sessionStorage.setItem('githatch:theme', 'dark')
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggleTheme())
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(sessionStorage.getItem('githatch:theme')).toBe('light')
  })

  it('ignores invalid stored value and defaults to light', () => {
    sessionStorage.setItem('githatch:theme', 'invalid')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })

  it('handles sessionStorage unavailability gracefully', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    expect(() => act(() => result.current.toggleTheme())).not.toThrow()
  })
})
