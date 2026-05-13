const TOKEN_KEY = 'gh_token'
const PKCE_VERIFIER_KEY = 'pkce_verifier'
const PKCE_STATE_KEY = 'pkce_state'

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

function base64UrlEncode(array: Uint8Array): string {
  return btoa(Array.from(array, (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

export function getStoredState(): string | null {
  return sessionStorage.getItem(PKCE_STATE_KEY)
}

export function clearPkceSession(): void {
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(PKCE_STATE_KEY)
}

export async function buildAuthUrl(clientId: string, redirectUri: string): Promise<string> {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const state = generateState()

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
  sessionStorage.setItem(PKCE_STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo workflow',
    response_type: 'code',
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  })

  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  redirectUri: string,
): Promise<string> {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
  if (!verifier) {
    throw new Error('No PKCE code verifier found in session. Restart the login flow.')
  }

  // GitHub's token endpoint blocks browser CORS requests — route through a thin
  // CORS proxy. No client_secret is stored there; GitHub App + PKCE doesn't need one.
  const response = await fetch('https://githatch-token-proxy.lukemaxwellshouse.workers.dev/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  })

  if (!response.ok) {
    clearPkceSession()
    throw new Error('Token exchange failed. Please try logging in again.')
  }

  const data = (await response.json()) as { access_token?: string; error?: string }
  if (!data.access_token) {
    clearPkceSession()
    throw new Error('Token exchange failed. Please try logging in again.')
  }

  clearPkceSession()
  return data.access_token
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}

export interface GitHubUser {
  id: number
  login: string
  avatar_url: string
  name: string | null
}

export async function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`)
  }

  const data = (await response.json()) as Partial<GitHubUser>
  if (!data.login || !data.id) {
    throw new Error('Unexpected response from GitHub /user endpoint')
  }
  return data as GitHubUser
}
