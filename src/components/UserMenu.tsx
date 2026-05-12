import type { GitHubUser } from '@/lib/auth'

interface Props {
  user: GitHubUser
  onLogout: () => void
}

export function UserMenu({ user, onLogout }: Props) {
  return (
    <div className="flex items-center gap-3">
      <img src={user.avatar_url} alt={user.login} className="h-7 w-7 rounded-full" />
      <span className="text-sm font-medium text-gray-700">{user.login}</span>
      <button
        onClick={onLogout}
        className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        Logout
      </button>
    </div>
  )
}
