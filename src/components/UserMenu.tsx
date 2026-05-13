import type { GitHubUser } from '@/lib/auth'

interface Props {
  user: GitHubUser
  onLogout: () => void
}

export function UserMenu({ user, onLogout }: Props) {
  return (
    <div className="flex items-center gap-3">
      <img src={user.avatar_url} alt={user.login} className="h-7 w-7" />
      <span className="hidden font-mono text-xs tracking-widest uppercase sm:inline">
        {user.login}
      </span>
      <button
        onClick={onLogout}
        className="font-mono text-xs tracking-widest text-black/40 uppercase hover:text-black"
      >
        Logout
      </button>
    </div>
  )
}
