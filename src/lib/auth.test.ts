import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
  exchangeCodeForToken,
  getStoredToken,
  getStoredState,
  clearPkceSession,
  storeToken,
  clearToken,
  getAuthenticatedUser,
} from './auth'

describe('PKCE helpers', () => {
  it('generates a code verifier of correct length', () => {
    const verifier = generateCodeVerifier()
    // RFC 7636: 43–128 chars, base64url alphabet only
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/)
  })

  it('generates a deterministic challenge from a known verifier', async () => {
    // SHA-256("abc") base64url-encoded without padding
    const challenge = await generateCodeChallenge('abc')
    expect(challenge).toBe('ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0')
  })

  it('generates distinct verifiers on each call', () => {
    const a = generateCodeVerifier()
    const b = generateCodeVerifier()
    expect(a).not.toBe(b)
  })
})

describe('buildAuthUrl', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('returns a URL with required OAuth params', async () => {
    const url = await buildAuthUrl('test-client-id', 'http://localhost:5173/callback')
    const parsed = new URL(url)
    expect(parsed.hostname).toBe('github.com')
    expect(parsed.searchParams.get('client_id')).toBe('test-client-id')
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:5173/callback')
    expect(parsed.searchParams.get('scope')).toContain('repo')
    expect(parsed.searchParams.get('scope')).toContain('workflow')
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    expect(parsed.searchParams.get('code_challenge')).toBeTruthy()
    expect(parsed.searchParams.get('state')).toBeTruthy()
  })

  it('stores code verifier and state in sessionStorage', async () => {
    await buildAuthUrl('test-client-id', 'http://localhost:5173/callback')
    expect(sessionStorage.getItem('pkce_verifier')).toBeTruthy()
    expect(sessionStorage.getItem('pkce_state')).toBeTruthy()
  })

  it('state matches what is returned from getStoredState', async () => {
    const url = await buildAuthUrl('test-client-id', 'http://localhost:5173/callback')
    const state = new URL(url).searchParams.get('state')
    expect(state).toBe(getStoredState())
  })
})

describe('clearPkceSession', () => {
  it('removes verifier and state from sessionStorage', async () => {
    await buildAuthUrl('test-client-id', 'http://localhost:5173/callback')
    clearPkceSession()
    expect(sessionStorage.getItem('pkce_verifier')).toBeNull()
    expect(sessionStorage.getItem('pkce_state')).toBeNull()
  })
})

describe('token storage', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('stores and retrieves a token', () => {
    storeToken('gho_test_token')
    expect(getStoredToken()).toBe('gho_test_token')
  })

  it('returns null when no token stored', () => {
    expect(getStoredToken()).toBeNull()
  })

  it('clears the token', () => {
    storeToken('gho_test_token')
    clearToken()
    expect(getStoredToken()).toBeNull()
  })
})

describe('exchangeCodeForToken', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('throws when no code verifier in sessionStorage', async () => {
    await expect(
      exchangeCodeForToken('auth-code', 'test-client-id', 'http://localhost:5173/callback'),
    ).rejects.toThrow(/verifier/)
  })

  it('calls the token proxy endpoint and returns the token', async () => {
    sessionStorage.setItem('pkce_verifier', 'test-verifier')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'gho_abc123' }),
      }),
    )
    const token = await exchangeCodeForToken(
      'auth-code',
      'test-client-id',
      'http://localhost:5173/callback',
    )
    expect(token).toBe('gho_abc123')
  })

  it('clears pkce session keys on success', async () => {
    sessionStorage.setItem('pkce_verifier', 'test-verifier')
    sessionStorage.setItem('pkce_state', 'test-state')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'gho_abc123' }),
      }),
    )
    await exchangeCodeForToken('auth-code', 'test-client-id', 'http://localhost:5173/callback')
    expect(sessionStorage.getItem('pkce_verifier')).toBeNull()
    expect(sessionStorage.getItem('pkce_state')).toBeNull()
  })

  it('throws and clears pkce session on HTTP error', async () => {
    sessionStorage.setItem('pkce_verifier', 'test-verifier')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'bad_verification_code' }),
      }),
    )
    await expect(
      exchangeCodeForToken('bad-code', 'test-client-id', 'http://localhost:5173/callback'),
    ).rejects.toThrow()
    expect(sessionStorage.getItem('pkce_verifier')).toBeNull()
  })
})

describe('getAuthenticatedUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches /user from GitHub API with the token', async () => {
    const mockUser = {
      login: 'testuser',
      avatar_url: 'https://avatars.githubusercontent.com/u/1',
      id: 1,
      name: 'Test',
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUser),
      }),
    )
    const user = await getAuthenticatedUser('gho_test')
    expect(user.login).toBe('testuser')
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls
    expect(calls[0][0]).toBe('https://api.github.com/user')
    expect((calls[0][1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer gho_test',
    })
  })

  it('throws on malformed response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    )
    await expect(getAuthenticatedUser('gho_test')).rejects.toThrow()
  })
})
