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
import { upsertWorkflowFile, fetchFileContent } from '@/lib/github'
import { slugify, taskConfigFromYaml, type TaskConfig } from '@/lib/yamlGenerator'
import type { GithatchTask } from '@/lib/workflows'

type View = 'tasks' | 'tools' | 'token-setup' | 'new-task' | 'edit-task'

export default function App() {
  const { user, loading, error, login, logout, token } = useAuth()
  const { repos, reposLoading, reposError, activeRepo, setActiveRepo } = useRepo(token)
  const [view, setView] = useState<View>('tasks')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<GithatchTask | null>(null)
  const [editingConfig, setEditingConfig] = useState<TaskConfig | null>(null)

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

  async function handleEditTask(task: GithatchTask) {
    if (!token) return
    try {
      const yaml = await fetchFileContent({ token, owner, repo, path: task.path })
      const config = taskConfigFromYaml(task.displayName, task.schedule || undefined, yaml)
      setEditingTask(task)
      setEditingConfig(config)
      setSaveError(null)
      setView('edit-task')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to load task')
    }
  }

  async function handleEditFormSubmit(yaml: string) {
    if (!token || !activeRepo || !editingTask) return
    setSaving(true)
    setSaveError(null)
    try {
      await upsertWorkflowFile({ token, owner, repo, slug: editingTask.slug, yaml })
      setEditingTask(null)
      setEditingConfig(null)
      setView('tasks')
      loadTasks()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save workflow')
    } finally {
      setSaving(false)
    }
  }

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
      <header className="border-t-[8px] border-b-[4px] border-black bg-white px-6 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('tasks')}
              className="font-display text-xl font-black tracking-tighter"
            >
              Githatch
            </button>
            {activeRepo && (
              <span className="border border-black bg-white px-2 py-1 font-mono text-xs tracking-widest text-black uppercase">
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

      <main className="flex flex-1 flex-col items-center justify-center bg-white p-6">
        {error && (
          <div className="mb-4 border-2 border-black bg-white px-4 py-3 text-sm text-black">
            {error}
          </div>
        )}

        {!GITHUB_CLIENT_ID && (
          <div className="border-2 border-black bg-white px-4 py-3 text-sm text-black">
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
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-1 border-2 border-black bg-white p-0.5">
                  <button
                    onClick={() => setView('tasks')}
                    className={`px-3 py-1 font-mono text-xs tracking-widest uppercase transition-colors duration-100 ${
                      view === 'tasks' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
                    }`}
                  >
                    Tasks
                  </button>
                  <button
                    onClick={() => setView('tools')}
                    className={`px-3 py-1 font-mono text-xs tracking-widest uppercase transition-colors duration-100 ${
                      view === 'tools' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
                    }`}
                  >
                    Tools
                  </button>
                </div>
                {view === 'tasks' && (
                  <button
                    onClick={() => setView('new-task')}
                    className="border-2 border-black bg-black px-3 py-1.5 font-mono text-xs tracking-widest text-white uppercase transition-colors duration-100 hover:bg-white hover:text-black"
                  >
                    + New task
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setView('token-setup')}
                  className="font-mono text-xs tracking-widest text-gray-400 uppercase hover:text-black"
                >
                  Claude token
                </button>
                <button
                  onClick={() => setActiveRepo(null)}
                  className="font-mono text-xs tracking-widest text-gray-400 uppercase hover:text-black"
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
                onEdit={handleEditTask}
              />
            )}

            {view === 'tools' && token && <ToolsPanel token={token} owner={owner} repo={repo} />}
          </div>
        )}

        {user && activeRepo && token && view === 'token-setup' && (
          <div className="w-full max-w-lg">
            <button
              onClick={() => setView('tasks')}
              className="mb-4 font-mono text-xs tracking-widest text-gray-500 uppercase hover:text-black"
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
              className="mb-4 font-mono text-xs tracking-widest text-gray-500 uppercase hover:text-black"
            >
              ← Back
            </button>
            {saveError && (
              <div className="mb-4 border-2 border-black bg-white px-4 py-3 text-sm text-black">
                {saveError}
              </div>
            )}
            <TaskForm onSubmit={handleTaskFormSubmit} loading={saving} />
          </div>
        )}

        {user && activeRepo && view === 'edit-task' && editingConfig && (
          <div className="w-full max-w-lg">
            <button
              onClick={() => {
                setView('tasks')
                setEditingTask(null)
                setEditingConfig(null)
              }}
              className="mb-4 font-mono text-xs tracking-widest text-gray-500 uppercase hover:text-black"
            >
              ← Back
            </button>
            {saveError && (
              <div className="mb-4 border-2 border-black bg-white px-4 py-3 text-sm text-black">
                {saveError}
              </div>
            )}
            <TaskForm
              onSubmit={handleEditFormSubmit}
              loading={saving}
              initialConfig={editingConfig}
            />
          </div>
        )}
      </main>
    </div>
  )
}
