import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

vi.mock('@/hooks/useAuth')
vi.mock('@/lib/config', () => ({
  GITHUB_CLIENT_ID: 'test-client-id',
  getRedirectUri: () => 'http://localhost:5173/',
}))

import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

const mockLogin = vi.fn()
const mockLogout = vi.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

describe('App — unauthenticated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      token: null,
      user: null,
      loading: false,
      error: null,
      login: mockLogin,
      logout: mockLogout,
    })
  })

  it('shows the app heading', () => {
    render(<App />, { wrapper })
    expect(screen.getByRole('heading', { name: /githatch/i })).toBeInTheDocument()
  })

  it('shows the login button', () => {
    render(<App />, { wrapper })
    expect(screen.getAllByRole('button', { name: /login with github/i }).length).toBeGreaterThan(0)
  })
})

describe('App — authenticated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      token: 'gho_test_token',
      user: {
        id: 1,
        login: 'testuser',
        avatar_url: 'https://github.com/avatar.png',
        name: 'Test User',
      },
      loading: false,
      error: null,
      login: mockLogin,
      logout: mockLogout,
    })
  })

  it('shows the user handle', () => {
    render(<App />, { wrapper })
    expect(screen.getAllByText('testuser').length).toBeGreaterThan(0)
  })

  it('shows a logout button', () => {
    render(<App />, { wrapper })
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })
})

describe('App — error state', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      token: null,
      user: null,
      loading: false,
      error: 'Login failed: bad_verification_code',
      login: mockLogin,
      logout: mockLogout,
    })
  })

  it('shows the error message', () => {
    render(<App />, { wrapper })
    expect(screen.getByText(/login failed/i)).toBeInTheDocument()
  })
})
