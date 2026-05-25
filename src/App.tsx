import { useState, useEffect, lazy, Suspense } from 'react'
import { GITHUB_CLIENT_ID } from '@/lib/config'
import { useAuth } from '@/hooks/useAuth'
import { useRepo } from '@/hooks/useRepo'
import { useTasks } from '@/hooks/useTasks'
import { LoginButton } from '@/components/LoginButton'
import { UserMenu } from '@/components/UserMenu'
import { Landing } from '@/components/Landing'
import { AboutPage } from '@/components/AboutPage'
import { RepoPicker } from '@/components/RepoPicker'
import { TaskForm } from '@/components/TaskForm'
import { TaskList } from '@/components/TaskList'
import { AgentConfig } from '@/components/AgentConfig'
import { ToolsPanel } from '@/components/ToolsPanel'
import { ActivityPanel } from '@/components/ActivityPanel'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const SecretsView = lazy(() =>
  import('@/components/SecretsView').then((m) => ({ default: m.SecretsView })),
)
import { upsertWorkflowFile, fetchFileContent, listRepoSecrets } from '@/lib/github'
import { GettingStarted, type SecretStatus } from '@/components/GettingStarted'
import { slugify, taskConfigFromYaml, type TaskConfig } from '@/lib/yamlGenerator'
import { TemplatePicker } from '@/components/TemplatePicker'
import { templateToConfig, type Template } from '@/lib/templates'
import type { GithatchTask } from '@/lib/workflows'

type View = 'tasks' | 'tools' | 'activity' | 'token-setup' | 'new-task' | 'edit-task' | 'about'

export default function App() {
  const { user, loading, error, login, logout, token } = useAuth()
  const { repos, reposLoading, reposError, activeRepo, setActiveRepo } = useRepo(token)
  const [view, setView] = useState<View>('tasks')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<GithatchTask | null>(null)
  const [editingConfig, setEditingConfig] = useState<TaskConfig | null>(null)
  const [editingOriginalYaml, setEditingOriginalYaml] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  const [secretStatus, setSecretStatus] = useState<SecretStatus>('loading')

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

  useEffect(() => {
    if (!token || !owner || !repo) return
    setSecretStatus('loading')
    listRepoSecrets({ token, owner, repo })
      .then((names) =>
        setSecretStatus(names.includes('CLAUDE_CODE_OAUTH_TOKEN') ? 'present' : 'absent'),
      )
      .catch(() => setSecretStatus('unknown'))
  }, [token, owner, repo])

  async function handleEditTask(task: GithatchTask) {
    if (!token) return
    try {
      const yaml = await fetchFileContent({ token, owner, repo, path: task.path })
      const config = taskConfigFromYaml(task.displayName, task.schedule || undefined, yaml)
      setEditingTask(task)
      setEditingConfig(config)
      setEditingOriginalYaml(yaml)
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
        enabled: true,
        outputDestination: config.outputDestination,
      })
      setView('tasks')
      loadTasks()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save workflow')
    } finally {
      setSaving(false)
    }
  }

  const isMainView = view === 'tasks' || view === 'tools' || view === 'activity'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-t-[8px] border-b-[4px] border-black bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setView('tasks')}
              className="font-display shrink-0 text-xl font-black tracking-tighter"
            >
              Githatch
            </button>
            {user && activeRepo && (
              <span className="min-w-0 truncate border border-black bg-white px-2 py-1 font-mono text-xs tracking-widest text-black uppercase">
                {activeRepo.name}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => setView('about')}
              className="px-2 font-mono text-xs tracking-widest text-black/40 uppercase hover:text-black"
            >
              About
            </button>
            {user ? (
              <UserMenu
                user={user}
                onLogout={() => {
                  logout()
                  setActiveRepo(null)
                }}
              />
            ) : (
              <LoginButton onLogin={login} loading={loading} />
            )}
          </div>
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

        {!user && !loading && GITHUB_CLIENT_ID && view !== 'about' && (
          <Landing onLogin={login} loading={loading} onAbout={() => setView('about')} />
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
                <button
                  onClick={() => setView('activity')}
                  className={`px-3 py-1 font-mono text-xs tracking-widest uppercase transition-colors duration-100 ${
                    view === 'activity' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
                  }`}
                >
                  Activity
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setView('token-setup')}
                    className="border border-black px-2.5 py-1 font-mono text-xs tracking-widest text-black uppercase transition-colors duration-100 hover:bg-black hover:text-white"
                  >
                    Secrets
                  </button>
                  <button
                    onClick={() => setActiveRepo(null)}
                    className="border border-black px-2.5 py-1 font-mono text-xs tracking-widest text-black uppercase transition-colors duration-100 hover:bg-black hover:text-white"
                  >
                    Switch repo
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
            </div>

            {view === 'tasks' && activeRepo && (
              <GettingStarted
                repoFullName={activeRepo.full_name}
                repoName={activeRepo.name}
                secretStatus={secretStatus}
                hasTasks={tasks.length > 0}
                onSetupToken={() => setView('token-setup')}
                onNewTask={() => setView('new-task')}
              />
            )}

            {view === 'tasks' && (
              <ErrorBoundary>
                <AgentConfig token={token!} owner={owner} repo={repo} />
              </ErrorBoundary>
            )}

            {view === 'tasks' && (
              <ErrorBoundary>
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
              </ErrorBoundary>
            )}

            {view === 'tools' && token && (
              <ErrorBoundary>
                <ToolsPanel token={token} owner={owner} repo={repo} />
              </ErrorBoundary>
            )}

            {view === 'activity' && token && (
              <ErrorBoundary>
                <ActivityPanel
                  tasks={tasks}
                  token={token}
                  owner={owner}
                  repo={repo}
                  defaultBranch={defaultBranch}
                />
              </ErrorBoundary>
            )}
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
            <ErrorBoundary>
              <Suspense
                fallback={
                  <p className="font-mono text-xs tracking-widest text-gray-400 uppercase">
                    Loading…
                  </p>
                }
              >
                <SecretsView
                  token={token}
                  owner={activeRepo.full_name.split('/')[0]}
                  repo={activeRepo.full_name.split('/')[1]}
                  onDone={() => setView('tasks')}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {user && activeRepo && view === 'new-task' && (
          <div className="w-full max-w-lg">
            <button
              onClick={() => {
                setView('tasks')
                setSelectedTemplate(null)
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
            <TemplatePicker
              selected={selectedTemplate?.id ?? null}
              onSelect={(t) => setSelectedTemplate(t)}
            />
            <ErrorBoundary>
              <TaskForm
                key={selectedTemplate?.id ?? 'scratch'}
                onSubmit={handleTaskFormSubmit}
                loading={saving}
                initialConfig={selectedTemplate ? templateToConfig(selectedTemplate) : undefined}
              />
            </ErrorBoundary>
          </div>
        )}

        {view === 'about' && <AboutPage onBack={() => setView('tasks')} />}

        {user && activeRepo && view === 'edit-task' && editingConfig && (
          <div className="w-full max-w-lg">
            <button
              onClick={() => {
                setView('tasks')
                setEditingTask(null)
                setEditingConfig(null)
                setEditingOriginalYaml(null)
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
            <ErrorBoundary>
              <TaskForm
                onSubmit={handleEditFormSubmit}
                loading={saving}
                initialConfig={editingConfig}
                originalYaml={editingOriginalYaml ?? undefined}
              />
            </ErrorBoundary>
          </div>
        )}
      </main>
    </div>
  )
}
