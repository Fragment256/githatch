import { useState, useEffect } from 'react'
import {
  buildAuthUrl,
  exchangeCodeForToken,
  getStoredToken,
  getStoredState,
  clearPkceSession,
  storeToken,
  clearToken,
  getAuthenticatedUser,
  type GitHubUser,
} from '@/lib/auth'
import { GITHUB_CLIENT_ID, getRedirectUri } from '@/lib/config'

interface AuthState {
  token: string | null
  user: GitHubUser | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    token: getStoredToken(),
    user: null,
    loading: !!getStoredToken(),
    error: null,
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const returnedState = params.get('state')

    if (code) {
      window.history.replaceState({}, '', window.location.pathname)

      const savedState = getStoredState()
      if (!returnedState || returnedState !== savedState) {
        clearPkceSession()
        setState({
          token: null,
          user: null,
          loading: false,
          error: 'Login failed: invalid state parameter. Please try again.',
        })
        return
      }

      setState((s) => ({ ...s, loading: true, error: null }))

      exchangeCodeForToken(code, GITHUB_CLIENT_ID, getRedirectUri())
        .then(async (token) => {
          storeToken(token)
          try {
            const user = await getAuthenticatedUser(token)
            setState({ token, user, loading: false, error: null })
          } catch (err: unknown) {
            const message =
              err instanceof Error
                ? err.message
                : 'Could not reach GitHub. Check your connection and try again.'
            if (message.includes('401')) {
              clearToken()
              setState({ token: null, user: null, loading: false, error: message })
            } else {
              setState({
                token,
                user: null,
                loading: false,
                error: 'Could not reach GitHub. Check your connection and try again.',
              })
            }
          }
        })
        .catch((err: unknown) => {
          clearToken()
          const message = err instanceof Error ? err.message : 'Login failed. Please try again.'
          setState({ token: null, user: null, loading: false, error: message })
        })
      return
    }

    const stored = getStoredToken()
    if (stored) {
      setState((s) => ({ ...s, loading: true }))
      getAuthenticatedUser(stored)
        .then((user) => setState({ token: stored, user, loading: false, error: null }))
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : ''
          if (message.includes('401')) {
            clearToken()
            setState({ token: null, user: null, loading: false, error: null })
          } else {
            setState({
              token: stored,
              user: null,
              loading: false,
              error: 'Could not reach GitHub. Check your connection and try again.',
            })
          }
        })
    }
  }, [])

  const login = async () => {
    const url = await buildAuthUrl(GITHUB_CLIENT_ID, getRedirectUri())
    window.location.href = url
  }

  const logout = () => {
    clearToken()
    setState({ token: null, user: null, loading: false, error: null })
  }

  return { ...state, login, logout }
}
