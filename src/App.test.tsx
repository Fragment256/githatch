import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

vi.mock('@/hooks/useAuth')
vi.mock('@/hooks/useRepo')
vi.mock('@/hooks/useTasks')
vi.mock('@/lib/config', () => ({
  GITHUB_CLIENT_ID: 'test-client-id',
  getRedirectUri: () => 'http://localhost:5173/',
}))
vi.mock('@/lib/github', () => ({
  upsertWorkflowFile: vi.fn(),
  deleteWorkflowFile: vi.fn(),
  fetchFileContent: vi.fn(),
  listRepoSecrets: vi.fn().mockResolvedValue([]),
  getRecentCommits: vi.fn().mockResolvedValue([]),
  getRecentPRs: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/components/SecretsView', () => ({
  SecretsView: ({ onDone }: { onDone: () => void }) => (
    <div>
      <span>SecretsView</span>
      <button onClick={onDone}>Done</button>
    </div>
  ),
}))

import { useAuth } from '@/hooks/useAuth'
import { useRepo } from '@/hooks/useRepo'
import { useTasks } from '@/hooks/useTasks'
import * as github from '@/lib/github'
import type { GithatchTask } from '@/lib/workflows'
const mockUseAuth = vi.mocked(useAuth)
const mockUseRepo = vi.mocked(useRepo)
const mockUseTasks = vi.mocked(useTasks)

const mockLogin = vi.fn()
const mockLogout = vi.fn()
const mockSetActiveRepo = vi.fn()
const mockLoad = vi.fn()
const mockAddTask = vi.fn()

const defaultRepoState = {
  repos: [],
  reposLoading: false,
  reposError: null,
  activeRepo: null,
  setActiveRepo: mockSetActiveRepo,
}

const ACTIVE_REPO = {
  id: 1,
  name: 'my-repo',
  full_name: 'testuser/my-repo',
  private: false,
  permissions: { push: true, pull: true, admin: false },
  default_branch: 'main',
}

const OTHER_REPO = {
  id: 2,
  name: 'other-repo',
  full_name: 'testuser/other-repo',
  private: false,
  permissions: { push: true, pull: true, admin: false },
  default_branch: 'main',
}

const defaultTasksState = {
  tasks: [],
  loading: false,
  error: null,
  load: mockLoad,
  addTask: mockAddTask,
}

const AUTHED_USER = {
  id: 1,
  login: 'testuser',
  avatar_url: 'https://github.com/avatar.png',
  name: 'Test',
}

const authWithRepo = () => {
  mockUseAuth.mockReturnValue({
    token: 'gho_test_token',
    user: AUTHED_USER,
    loading: false,
    error: null,
    login: mockLogin,
    logout: mockLogout,
  })
  mockUseRepo.mockReturnValue({ ...defaultRepoState, activeRepo: ACTIVE_REPO })
  mockUseTasks.mockReturnValue(defaultTasksState)
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

describe('App — unauthenticated', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUseAuth.mockReturnValue({
      token: null,
      user: null,
      loading: false,
      error: null,
      login: mockLogin,
      logout: mockLogout,
    })
    mockUseRepo.mockReturnValue(defaultRepoState)
    mockUseTasks.mockReturnValue(defaultTasksState)
  })

  it('shows the landing hero heading', () => {
    render(<App />, { wrapper })
    expect(screen.getByRole('heading', { name: /agent runtime/i })).toBeInTheDocument()
  })

  it('shows the login buttons', () => {
    render(<App />, { wrapper })
    expect(screen.getAllByRole('button', { name: /login with github/i }).length).toBeGreaterThan(0)
  })
})

describe('App — authenticated, no repo selected', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
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
      repos: [ACTIVE_REPO],
    })
    mockUseTasks.mockReturnValue(defaultTasksState)
  })

  it('shows the repo picker', () => {
    render(<App />, { wrapper })
    expect(screen.getByLabelText(/active repository/i)).toBeInTheDocument()
  })

  it('lists available repos in the picker', () => {
    render(<App />, { wrapper })
    fireEvent.focus(screen.getByLabelText(/active repository/i))
    expect(screen.getByRole('option', { name: 'testuser/my-repo' })).toBeInTheDocument()
  })
})

describe('App — authenticated, repo selected', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUseAuth.mockReturnValue({
      token: 'gho_test_token',
      user: { id: 1, login: 'testuser', avatar_url: 'https://github.com/avatar.png', name: 'Test' },
      loading: false,
      error: null,
      login: mockLogin,
      logout: mockLogout,
    })
    mockUseRepo.mockReturnValue({ ...defaultRepoState, activeRepo: ACTIVE_REPO })
    mockUseTasks.mockReturnValue(defaultTasksState)
    vi.mocked(github.listRepoSecrets).mockResolvedValue([])
  })

  it('shows the active repo name in the header', () => {
    render(<App />, { wrapper })
    expect(screen.getAllByText('my-repo').length).toBeGreaterThan(0)
  })

  it('shows a switch repository button', () => {
    render(<App />, { wrapper })
    expect(screen.getByRole('button', { name: /switch repo/i })).toBeInTheDocument()
  })
})

describe('App — error state', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUseAuth.mockReturnValue({
      token: null,
      user: null,
      loading: false,
      error: 'Login failed: invalid state parameter.',
      login: mockLogin,
      logout: mockLogout,
    })
    mockUseRepo.mockReturnValue(defaultRepoState)
    mockUseTasks.mockReturnValue(defaultTasksState)
  })

  it('shows the error message', () => {
    render(<App />, { wrapper })
    expect(screen.getByText(/login failed/i)).toBeInTheDocument()
  })
})

describe('App — view navigation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    authWithRepo()
    vi.mocked(github.listRepoSecrets).mockResolvedValue([])
  })

  it('shows tasks view by default', () => {
    render(<App />, { wrapper })
    const tasksTab = screen.getByRole('button', { name: /^tasks$/i })
    expect(tasksTab.className).toContain('bg-black')
  })

  it('navigates to About page', () => {
    render(<App />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /about/i }))
    expect(screen.getByRole('heading', { name: /why/i })).toBeInTheDocument()
  })

  it('navigates to new-task view when + New task toolbar button is clicked', () => {
    render(<App />, { wrapper })
    const newTaskBtns = screen.getAllByRole('button', { name: /\+ new task/i })
    fireEvent.click(newTaskBtns[0])
    expect(screen.getByText(/start from template/i)).toBeInTheDocument()
  })

  it('navigates back from new-task to tasks with back button', () => {
    render(<App />, { wrapper })
    fireEvent.click(screen.getAllByRole('button', { name: /\+ new task/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /← back/i }))
    expect(screen.getAllByRole('button', { name: /\+ new task/i }).length).toBeGreaterThan(0)
  })

  it('navigates to token-setup (secrets) view', async () => {
    render(<App />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /secrets/i }))
    await waitFor(() => expect(screen.getByText('SecretsView')).toBeInTheDocument())
  })

  it('returns from secrets view to tasks when SecretsView calls onDone', async () => {
    render(<App />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /secrets/i }))
    await waitFor(() => screen.getByText('SecretsView'))
    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(screen.getAllByRole('button', { name: /\+ new task/i }).length).toBeGreaterThan(0)
  })

  it('shows tools tab when Tools is clicked', () => {
    render(<App />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /^tools$/i }))
    const toolsTab = screen.getByRole('button', { name: /^tools$/i })
    expect(toolsTab.className).toContain('bg-black')
  })

  it('shows activity tab when Activity is clicked', () => {
    render(<App />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /^activity$/i }))
    const activityTab = screen.getByRole('button', { name: /^activity$/i })
    expect(activityTab.className).toContain('bg-black')
  })

  it('toggles theme when Dark/Light button is clicked', () => {
    render(<App />, { wrapper })
    const themeBtn = screen.getByRole('button', { name: /switch to dark mode/i })
    fireEvent.click(themeBtn)
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()
  })

  it('calls logout and clears repo on logout', () => {
    const logout = vi.fn()
    mockUseAuth.mockReturnValue({
      token: 'gho_test_token',
      user: AUTHED_USER,
      loading: false,
      error: null,
      login: mockLogin,
      logout,
    })
    render(<App />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /logout/i }))
    expect(logout).toHaveBeenCalledOnce()
    expect(mockSetActiveRepo).toHaveBeenCalledWith(null)
  })

  it('resets navigation to task list when the user logs out from the new-task form', () => {
    authWithRepo()
    render(<App />, { wrapper })
    fireEvent.click(screen.getAllByRole('button', { name: /\+ new task/i })[0])
    expect(screen.getByText(/start from template/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /logout/i }))
    expect(screen.queryByText(/start from template/i)).not.toBeInTheDocument()
  })

  it('ignores a stale secret-status response that resolves after the repo changes', async () => {
    let resolveStale: (names: string[]) => void = () => {}
    const stale = new Promise<string[]>((resolve) => {
      resolveStale = resolve
    })
    vi.mocked(github.listRepoSecrets).mockReturnValueOnce(stale)
    vi.mocked(github.listRepoSecrets).mockResolvedValueOnce(['CLAUDE_CODE_OAUTH_TOKEN'])

    mockUseRepo.mockReturnValue({ ...defaultRepoState, activeRepo: ACTIVE_REPO })
    const { rerender } = render(<App />, { wrapper })

    mockUseRepo.mockReturnValue({ ...defaultRepoState, activeRepo: OTHER_REPO })
    rerender(<App />)

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /set up token/i })).not.toBeInTheDocument(),
    )

    await act(async () => {
      resolveStale([])
    })

    expect(screen.queryByRole('button', { name: /set up token/i })).not.toBeInTheDocument()
  })
})

describe('App — task form submission', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    authWithRepo()
    vi.mocked(github.listRepoSecrets).mockResolvedValue([])
    vi.mocked(github.upsertWorkflowFile).mockResolvedValue(undefined)
  })

  it('shows new-task form with TemplatePicker', () => {
    render(<App />, { wrapper })
    fireEvent.click(screen.getAllByRole('button', { name: /\+ new task/i })[0])
    expect(screen.getByText(/start from template/i)).toBeInTheDocument()
  })

  it('shows edit-task view when handleEditTask is called', async () => {
    const task: GithatchTask = {
      slug: 'daily-digest',
      displayName: 'Daily Digest',
      schedule: '0 9 * * *',
      workflowId: 1,
      path: '.github/workflows/githatch-daily-digest.yml',
      enabled: true,
      outputDestination: { type: 'new_issue' },
      prompt: 'Summarize.',
    }
    mockUseTasks.mockReturnValue({ ...defaultTasksState, tasks: [task] })
    vi.mocked(github.fetchFileContent).mockResolvedValue(
      'name: Daily Digest\non:\n  schedule:\n    - cron: "0 9 * * *"\n  workflow_dispatch:\njobs:\n  run:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: anthropics/claude-code-action@v1\n        with:\n          prompt: |\n            Summarize.\n',
    )
    render(<App />, { wrapper })
    const editBtn = await screen.findByRole('button', { name: /edit/i })
    fireEvent.click(editBtn)
    await waitFor(() => expect(screen.getByRole('button', { name: /← back/i })).toBeInTheDocument())
  })

  it('shows an error in the tasks view when loading a task to edit fails', async () => {
    const task: GithatchTask = {
      slug: 'daily-digest',
      displayName: 'Daily Digest',
      schedule: '0 9 * * *',
      workflowId: 1,
      path: '.github/workflows/githatch-daily-digest.yml',
      enabled: true,
      outputDestination: { type: 'new_issue' },
      prompt: 'Summarize.',
    }
    mockUseTasks.mockReturnValue({ ...defaultTasksState, tasks: [task] })
    vi.mocked(github.fetchFileContent).mockRejectedValue(new Error('404 Not Found'))
    render(<App />, { wrapper })
    const editBtn = await screen.findByRole('button', { name: /edit/i })
    fireEvent.click(editBtn)
    expect(await screen.findByText('404 Not Found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('shows an error in the tasks view when loading a task to duplicate fails', async () => {
    const task: GithatchTask = {
      slug: 'daily-digest',
      displayName: 'Daily Digest',
      schedule: '0 9 * * *',
      workflowId: 1,
      path: '.github/workflows/githatch-daily-digest.yml',
      enabled: true,
      outputDestination: { type: 'new_issue' },
      prompt: 'Summarize.',
    }
    mockUseTasks.mockReturnValue({ ...defaultTasksState, tasks: [task] })
    vi.mocked(github.fetchFileContent).mockRejectedValue(new Error('Network error'))
    render(<App />, { wrapper })
    const duplicateBtn = await screen.findByRole('button', { name: /duplicate/i })
    fireEvent.click(duplicateBtn)
    expect(await screen.findByText('Network error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument()
  })

  it('discards a stale handleEditTask response that resolves after a second edit click', async () => {
    const taskA: GithatchTask = {
      slug: 'task-a',
      displayName: 'Task A',
      schedule: '0 9 * * *',
      workflowId: 1,
      path: '.github/workflows/githatch-task-a.yml',
      enabled: true,
      outputDestination: { type: 'new_issue' },
      prompt: 'Do A.',
    }
    const taskB: GithatchTask = {
      slug: 'task-b',
      displayName: 'Task B',
      schedule: '0 10 * * *',
      workflowId: 2,
      path: '.github/workflows/githatch-task-b.yml',
      enabled: true,
      outputDestination: { type: 'new_issue' },
      prompt: 'Do B.',
    }
    mockUseTasks.mockReturnValue({ ...defaultTasksState, tasks: [taskA, taskB] })

    let resolveStale: (yaml: string) => void = () => {}
    const staleYaml =
      'name: Task A\non:\n  schedule:\n    - cron: "0 9 * * *"\n  workflow_dispatch:\njobs:\n  run:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: anthropics/claude-code-action@v1\n        with:\n          prompt: |\n            Do A.\n'
    const freshYaml =
      'name: Task B\non:\n  schedule:\n    - cron: "0 10 * * *"\n  workflow_dispatch:\njobs:\n  run:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: anthropics/claude-code-action@v1\n        with:\n          prompt: |\n            Do B.\n'
    vi.mocked(github.fetchFileContent)
      .mockReturnValueOnce(
        new Promise<string>((resolve) => {
          resolveStale = resolve
        }),
      )
      .mockResolvedValueOnce(freshYaml)

    render(<App />, { wrapper })

    const editBtns = await screen.findAllByRole('button', { name: /edit/i })
    fireEvent.click(editBtns[0]) // click Edit on Task A — slow fetch
    fireEvent.click(editBtns[1]) // click Edit on Task B — fast fetch

    // Task B's fetch resolves immediately; editor opens for Task B
    await waitFor(() => expect(screen.getByRole('button', { name: /← back/i })).toBeInTheDocument())

    // Now resolve the stale Task A fetch — should be discarded
    await act(async () => {
      resolveStale(staleYaml)
    })

    // Editor is still showing (Task B's view) — not replaced by Task A
    expect(screen.getByRole('button', { name: /← back/i })).toBeInTheDocument()
  })

  it('clears saveError immediately when navigating to new-task view', async () => {
    const task: GithatchTask = {
      slug: 'daily-digest',
      displayName: 'Daily Digest',
      schedule: '0 9 * * *',
      workflowId: 1,
      path: '.github/workflows/githatch-daily-digest.yml',
      enabled: true,
      outputDestination: { type: 'new_issue' },
      prompt: 'Summarize.',
    }
    mockUseTasks.mockReturnValue({ ...defaultTasksState, tasks: [task] })
    vi.mocked(github.fetchFileContent).mockRejectedValue(new Error('Load failed'))

    render(<App />, { wrapper })
    // Trigger a load error (shows saveError in tasks view)
    const duplicateBtn = await screen.findByRole('button', { name: /duplicate/i })
    fireEvent.click(duplicateBtn)
    expect(await screen.findByText('Load failed')).toBeInTheDocument()

    // Navigate to new-task — saveError should be cleared immediately, not carried into new-task form
    fireEvent.click(screen.getAllByRole('button', { name: /\+ new task/i })[0])
    expect(screen.queryByText('Load failed')).not.toBeInTheDocument()
  })

  it('clears saveError when navigating Back from new-task view', async () => {
    const task: GithatchTask = {
      slug: 'daily-digest',
      displayName: 'Daily Digest',
      schedule: '0 9 * * *',
      workflowId: 1,
      path: '.github/workflows/githatch-daily-digest.yml',
      enabled: true,
      outputDestination: { type: 'new_issue' },
      prompt: 'Summarize.',
    }
    mockUseTasks.mockReturnValue({ ...defaultTasksState, tasks: [task] })
    vi.mocked(github.fetchFileContent).mockRejectedValue(new Error('Load failed'))

    render(<App />, { wrapper })
    // Trigger a load error (shows saveError in tasks view)
    const duplicateBtn = await screen.findByRole('button', { name: /duplicate/i })
    fireEvent.click(duplicateBtn)
    expect(await screen.findByText('Load failed')).toBeInTheDocument()

    // Navigate to new-task and back
    fireEvent.click(screen.getAllByRole('button', { name: /\+ new task/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /← back/i }))

    // saveError should be gone
    expect(screen.queryByText('Load failed')).not.toBeInTheDocument()
  })

  it('clears saveError when Switch repo is clicked', async () => {
    const task: GithatchTask = {
      slug: 'daily-digest',
      displayName: 'Daily Digest',
      schedule: '0 9 * * *',
      workflowId: 1,
      path: '.github/workflows/githatch-daily-digest.yml',
      enabled: true,
      outputDestination: { type: 'new_issue' },
      prompt: 'Summarize.',
    }
    mockUseTasks.mockReturnValue({ ...defaultTasksState, tasks: [task] })
    vi.mocked(github.fetchFileContent).mockRejectedValue(new Error('Load failed'))

    render(<App />, { wrapper })
    // Trigger a duplicate error so saveError is set
    const duplicateBtn = await screen.findByRole('button', { name: /duplicate/i })
    fireEvent.click(duplicateBtn)
    expect(await screen.findByText('Load failed')).toBeInTheDocument()

    // Click Switch repo — should clear saveError
    fireEvent.click(screen.getByRole('button', { name: /switch repo/i }))

    await waitFor(() => {
      expect(screen.queryByText('Load failed')).not.toBeInTheDocument()
    })
  })
})
