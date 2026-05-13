import { useState, useEffect } from 'react'
import { GITHUB_CLIENT_ID } from '@/lib/config'
import { useAuth } from '@/hooks/useAuth'
import { useRepo } from '@/hooks/useRepo'
import { useTasks } from '@/hooks/useTasks'
import { LoginButton } from '@/components/LoginButton'
import { UserMenu } from '@/components/UserMenu'
import { RepoPicker } from '@/components/RepoPicker'
import { TaskForm } from '@/components/TaskForm'
import { TaskList } from '@/components/TaskList'
import { ToolsPanel } from '@/components/ToolsPanel'
import { TokenSetup } from '@/components/TokenSetup'
import { upsertWorkflowFile } from '@/lib/github'
import { slugify, type TaskConfig } from '@/lib/yamlGenerator'

type View = 'tasks' | 'tools' | 'token-setup' | 'new-task'

export default function App() {
  const { user, loading, error, login, logout, token } = useAuth()
  const { repos, reposLoading, reposError, activeRepo, setActiveRepo } = useRepo(token)
  const [view, setView] = useState<View>('tasks')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [owner, repo] = activeRepo ? activeRepo.full_name.split('/') : ['', '']
  const defaultBranch = activeRepo?.default_branch ?? 'main'
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    load: loadTasks,
    addTask,
  } = useTasks(token, owner, repo)

  useEffect(() => {
    if (activeRepo && token) {
      loadTasks()
    }
  }, [activeRepo, token, loadTasks])

  async function handleTaskFormSubmit(yaml: string, _slug: string, config: TaskConfig) {
    if (!token || !activeRepo) return
    setSaving(true)
    setSaveError(null)
    const slug = slugify(config.name)
    try {
      await upsertWorkflowFile({ token, owner, repo, slug, yaml })
      addTask({
        slug,
        displayName: config.name,
        schedule: config.schedule ?? '',
        workflowId: undefined,
        path: `.github/workflows/githatch-${slug}.yml`,
      })
      setView('tasks')
      loadTasks()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save workflow')
    } finally {
      setSaving(false)
    }
  }

  const isMainView = view === 'tasks' || view === 'tools'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('tasks')}
              className="text-lg font-semibold tracking-tight"
            >
              Githatch
            </button>
            {activeRepo && (
              <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                {activeRepo.full_name}
              </span>
            )}
          </div>
          {user ? (
            <UserMenu user={user} onLogout={logout} />
          ) : (
            <LoginButton onLogin={login} loading={loading} />
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center bg-gray-50 p-6">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!GITHUB_CLIENT_ID && (
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>VITE_GITHUB_CLIENT_ID</strong> is not configured. Set it as a repository
            variable and redeploy.
          </div>
        )}

        {!user && !loading && GITHUB_CLIENT_ID && (
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Githatch</h1>
            <p className="mt-2 text-gray-500">
              Schedule recurring agentic GitHub Actions — without writing YAML.
            </p>
            <div className="mt-6">
              <LoginButton onLogin={login} loading={loading} />
            </div>
          </div>
        )}

        {user && !activeRepo && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-600">Choose a repository to manage tasks on:</p>
            <RepoPicker
              repos={repos}
              activeRepo={activeRepo}
              loading={reposLoading}
              error={reposError}
              onSelect={setActiveRepo}
            />
          </div>
        )}

        {user && activeRepo && isMainView && (
          <div className="flex w-full max-w-2xl flex-col gap-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
                <button
                  onClick={() => setView('tasks')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    view === 'tasks' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Tasks
                </button>
                <button
                  onClick={() => setView('tools')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    view === 'tools' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Tools
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setView('token-setup')}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Claude token
                </button>
                {view === 'tasks' && (
                  <button
                    onClick={() => setView('new-task')}
                    className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
                  >
                    + New task
                  </button>
                )}
                <button
                  onClick={() => setActiveRepo(null)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Change repo
                </button>
              </div>
            </div>

            {view === 'tasks' && (
              <TaskList
                tasks={tasks}
                token={token!}
                owner={owner}
                repo={repo}
                defaultBranch={defaultBranch}
                loading={tasksLoading}
                error={tasksError}
                onRefresh={loadTasks}
              />
            )}

            {view === 'tools' && token && <ToolsPanel token={token} owner={owner} repo={repo} />}
          </div>
        )}

        {user && activeRepo && token && view === 'token-setup' && (
          <div className="w-full max-w-lg">
            <button
              onClick={() => setView('tasks')}
              className="mb-4 text-xs text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <TokenSetup
              token={token}
              owner={activeRepo.full_name.split('/')[0]}
              repo={activeRepo.full_name.split('/')[1]}
              onDone={() => setView('tasks')}
            />
          </div>
        )}

        {user && activeRepo && view === 'new-task' && (
          <div className="w-full max-w-lg">
            <button
              onClick={() => setView('tasks')}
              className="mb-4 text-xs text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            {saveError && (
              <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            )}
            <TaskForm onSubmit={handleTaskFormSubmit} loading={saving} />
          </div>
        )}
      </main>
    </div>
  )
}
