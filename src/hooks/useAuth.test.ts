import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuth } from './useAuth'

vi.mock('@/lib/config', () => ({
  GITHUB_CLIENT_ID: 'test-client-id',
  getRedirectUri: () => 'http://localhost:5173/',
}))

vi.mock('@/lib/auth', () => ({
  buildAuthUrl: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  getStoredToken: vi.fn(),
  getStoredState: vi.fn(),
  clearPkceSession: vi.fn(),
  storeToken: vi.fn(),
  clearToken: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))

import * as authLib from '@/lib/auth'

const mockBuildAuthUrl = vi.mocked(authLib.buildAuthUrl)
const mockExchangeCodeForToken = vi.mocked(authLib.exchangeCodeForToken)
const mockGetStoredToken = vi.mocked(authLib.getStoredToken)
const mockGetStoredState = vi.mocked(authLib.getStoredState)
const mockClearPkceSession = vi.mocked(authLib.clearPkceSession)
const mockStoreToken = vi.mocked(authLib.storeToken)
const mockClearToken = vi.mocked(authLib.clearToken)
const mockGetAuthenticatedUser = vi.mocked(authLib.getAuthenticatedUser)

const MOCK_USER = {
  login: 'testuser',
  avatar_url: 'https://github.com/avatar.png',
  id: 1,
  name: 'Test User',
}

function setSearch(params: Record<string, string>) {
  const search = new URLSearchParams(params).toString()
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, search: search ? `?${search}` : '', pathname: '/' },
  })
}

describe('useAuth — no stored token, no code in URL', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setSearch({})
    mockGetStoredToken.mockReturnValue(null)
  })

  afterEach(() => {
    setSearch({})
  })

  it('returns null token and user with loading false', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.token).toBeNull()
    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('exposes login and logout functions', () => {
    const { result } = renderHook(() => useAuth())
    expect(typeof result.current.login).toBe('function')
    expect(typeof result.current.logout).toBe('function')
  })
})

describe('useAuth — stored token present', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setSearch({})
    mockGetStoredToken.mockReturnValue('gho_stored')
  })

  it('fetches user on mount and returns token + user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(MOCK_USER)
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.token).toBe('gho_stored')
    expect(result.current.user?.login).toBe('testuser')
  })

  it('clears token when getAuthenticatedUser rejects', async () => {
    mockGetAuthenticatedUser.mockRejectedValue(new Error('Unauthorized'))
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.token).toBeNull()
    expect(mockClearToken).toHaveBeenCalledOnce()
  })
})

describe('useAuth — OAuth callback (code in URL)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockGetStoredToken.mockReturnValue(null)
    mockGetStoredState.mockReturnValue('test-state')
    window.history.replaceState = vi.fn()
  })

  afterEach(() => {
    setSearch({})
  })

  it('exchanges code for token and fetches user when state matches', async () => {
    setSearch({ code: 'auth-code', state: 'test-state' })
    mockExchangeCodeForToken.mockResolvedValue('gho_new_token')
    mockGetAuthenticatedUser.mockResolvedValue(MOCK_USER)

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockExchangeCodeForToken).toHaveBeenCalledWith(
      'auth-code',
      'test-client-id',
      'http://localhost:5173/',
    )
    expect(mockStoreToken).toHaveBeenCalledWith('gho_new_token')
    expect(result.current.token).toBe('gho_new_token')
    expect(result.current.user?.login).toBe('testuser')
  })

  it('clears session and sets error when state does not match', async () => {
    setSearch({ code: 'auth-code', state: 'wrong-state' })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(mockClearPkceSession).toHaveBeenCalledOnce()
    expect(result.current.token).toBeNull()
    expect(result.current.error).toMatch(/invalid state/i)
  })

  it('sets error when state param is missing', async () => {
    setSearch({ code: 'auth-code' })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error).toMatch(/invalid state/i)
  })

  it('sets error when token exchange rejects', async () => {
    setSearch({ code: 'bad-code', state: 'test-state' })
    mockExchangeCodeForToken.mockRejectedValue(new Error('Exchange failed'))
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Exchange failed')
    expect(result.current.token).toBeNull()
  })

  it('clears the URL code param on callback', async () => {
    setSearch({ code: 'auth-code', state: 'test-state' })
    mockExchangeCodeForToken.mockResolvedValue('gho_new_token')
    mockGetAuthenticatedUser.mockResolvedValue(MOCK_USER)
    renderHook(() => useAuth())
    await waitFor(() => expect(window.history.replaceState).toHaveBeenCalled())
  })
})

describe('useAuth — login / logout', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setSearch({})
    mockGetStoredToken.mockReturnValue(null)
  })

  it('login calls buildAuthUrl and redirects', async () => {
    mockBuildAuthUrl.mockResolvedValue('https://github.com/login/oauth/authorize?...')
    const originalLocation = window.location
    const assignMock = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    })

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login()
    })

    expect(mockBuildAuthUrl).toHaveBeenCalledWith('test-client-id', 'http://localhost:5173/')
    void assignMock
  })

  it('logout clears token and resets state', () => {
    const { result } = renderHook(() => useAuth())
    act(() => {
      result.current.logout()
    })
    expect(mockClearToken).toHaveBeenCalledOnce()
    expect(result.current.token).toBeNull()
    expect(result.current.user).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
