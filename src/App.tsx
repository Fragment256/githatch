import { useAuth } from '@/hooks/useAuth'
import { LoginButton } from '@/components/LoginButton'
import { UserMenu } from '@/components/UserMenu'

export default function App() {
  const { user, loading, error, login, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Githatch</span>
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
        {!user && !loading && (
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
        {user && (
          <p className="text-gray-500">
            Logged in as <strong>{user.login}</strong>. Select a repo to get started.
          </p>
        )}
      </main>
    </div>
  )
}
