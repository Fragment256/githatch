const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
if (!clientId) throw new Error('VITE_GITHUB_CLIENT_ID is not set')
export const GITHUB_CLIENT_ID: string = clientId

export function getRedirectUri(): string {
  return import.meta.env.VITE_REDIRECT_URI ?? `${window.location.origin}/githatch/`
}
