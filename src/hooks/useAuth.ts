import { useState, useEffect, useRef } from 'react'
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
    loading: !!getStoredToken() || !!new URLSearchParams(window.location.search).get('code'),
    error: null,
  })
  const sessionRevRef = useRef(0)

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

      let cancelled = false
      const myRev = ++sessionRevRef.current
      exchangeCodeForToken(code, GITHUB_CLIENT_ID, getRedirectUri())
        .then(async (token) => {
          if (cancelled || sessionRevRef.current !== myRev) return
          try {
            const user = await getAuthenticatedUser(token)
            if (!cancelled && sessionRevRef.current === myRev) {
              storeToken(token)
              setState({ token, user, loading: false, error: null })
            }
          } catch (err: unknown) {
            if (cancelled || sessionRevRef.current !== myRev) return
            const message =
              err instanceof Error
                ? err.message
                : 'Could not reach GitHub. Check your connection and try again.'
            if (message.includes('401')) {
              clearToken()
              setState({ token: null, user: null, loading: false, error: message })
            } else {
              storeToken(token)
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
          if (cancelled || sessionRevRef.current !== myRev) return
          clearToken()
          const message = err instanceof Error ? err.message : 'Login failed. Please try again.'
          setState({ token: null, user: null, loading: false, error: message })
        })
      return () => {
        cancelled = true
      }
    }

    const stored = getStoredToken()
    if (stored) {
      let cancelled = false
      const myRev = ++sessionRevRef.current
      setState((s) => ({ ...s, loading: true }))
      getAuthenticatedUser(stored)
        .then((user) => {
          if (!cancelled && sessionRevRef.current === myRev)
            setState({ token: stored, user, loading: false, error: null })
        })
        .catch((err: unknown) => {
          if (cancelled || sessionRevRef.current !== myRev) return
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
      return () => {
        cancelled = true
      }
    }
  }, [])

  const login = async () => {
    try {
      const url = await buildAuthUrl(GITHUB_CLIENT_ID, getRedirectUri())
      window.location.href = url
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : 'Login failed. Please try again.',
      }))
    }
  }

  const logout = () => {
    ++sessionRevRef.current
    clearToken()
    setState({ token: null, user: null, loading: false, error: null })
  }

  return { ...state, login, logout }
}
