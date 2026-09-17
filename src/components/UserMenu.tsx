import type { GitHubUser } from '@/lib/auth'

interface Props {
  user: GitHubUser
  onLogout: () => void
  disabled?: boolean
}

export function UserMenu({ user, onLogout, disabled = false }: Props) {
  return (
    <div className="flex items-center gap-3">
      <img src={user.avatar_url} alt={user.login} className="h-7 w-7" />
      <span className="hidden font-mono text-xs tracking-widest uppercase sm:inline">
        {user.login}
      </span>
      <button
        onClick={onLogout}
        disabled={disabled}
        className="font-mono text-xs tracking-widest text-black/40 uppercase hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        Logout
      </button>
    </div>
  )
}
