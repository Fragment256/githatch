import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

vi.mock('@/hooks/useAuth')
vi.mock('@/hooks/useRepo')
vi.mock('@/lib/config', () => ({
  GITHUB_CLIENT_ID: 'test-client-id',
  getRedirectUri: () => 'http://localhost:5173/',
}))

import { useAuth } from '@/hooks/useAuth'
import { useRepo } from '@/hooks/useRepo'
const mockUseAuth = vi.mocked(useAuth)
const mockUseRepo = vi.mocked(useRepo)

const mockLogin = vi.fn()
const mockLogout = vi.fn()
const mockSetActiveRepo = vi.fn()

const defaultRepoState = {
  repos: [],
  reposLoading: false,
  reposError: null,
  activeRepo: null,
  setActiveRepo: mockSetActiveRepo,
}

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
    mockUseRepo.mockReturnValue(defaultRepoState)
  })

  it('shows the app heading', () => {
    render(<App />, { wrapper })
    expect(screen.getByRole('heading', { name: /githatch/i })).toBeInTheDocument()
  })

  it('shows the login buttons', () => {
    render(<App />, { wrapper })
    expect(screen.getAllByRole('button', { name: /login with github/i }).length).toBeGreaterThan(0)
  })
})

describe('App — authenticated, no repo selected', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      token: 'gho_test_token',
      user: { id: 1, login: 'testuser', avatar_url: 'https://github.com/avatar.png', name: 'Test' },
      loading: false,
      error: null,
      login: mockLogin,
      logout: mockLogout,
    })
    mockUseRepo.mockReturnValue({
      ...defaultRepoState,
      repos: [
        {
          id: 1,
          name: 'my-repo',
          full_name: 'testuser/my-repo',
          private: false,
          permissions: { push: true, pull: true, admin: false },
          default_branch: 'main',
        },
      ],
    })
  })

  it('shows the repo picker', () => {
    render(<App />, { wrapper })
    expect(screen.getByLabelText(/active repository/i)).toBeInTheDocument()
  })

  it('lists available repos in the picker', () => {
    render(<App />, { wrapper })
    expect(screen.getByRole('option', { name: 'testuser/my-repo' })).toBeInTheDocument()
  })
})

describe('App — authenticated, repo selected', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      token: 'gho_test_token',
      user: { id: 1, login: 'testuser', avatar_url: 'https://github.com/avatar.png', name: 'Test' },
      loading: false,
      error: null,
      login: mockLogin,
      logout: mockLogout,
    })
    mockUseRepo.mockReturnValue({
      ...defaultRepoState,
      activeRepo: {
        id: 1,
        name: 'my-repo',
        full_name: 'testuser/my-repo',
        private: false,
        permissions: { push: true, pull: true, admin: false },
        default_branch: 'main',
      },
    })
  })

  it('shows the active repo in the header', () => {
    render(<App />, { wrapper })
    expect(screen.getAllByText('testuser/my-repo').length).toBeGreaterThan(0)
  })

  it('shows a change repository button', () => {
    render(<App />, { wrapper })
    expect(screen.getByRole('button', { name: /change rep/i })).toBeInTheDocument()
  })
})

describe('App — error state', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      token: null,
      user: null,
      loading: false,
      error: 'Login failed: invalid state parameter.',
      login: mockLogin,
      logout: mockLogout,
    })
    mockUseRepo.mockReturnValue(defaultRepoState)
  })

  it('shows the error message', () => {
    render(<App />, { wrapper })
    expect(screen.getByText(/login failed/i)).toBeInTheDocument()
  })
})
