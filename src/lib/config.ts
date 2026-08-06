export const GITHUB_CLIENT_ID: string = import.meta.env.VITE_GITHUB_CLIENT_ID ?? ''

export function getRedirectUri(): string {
  return import.meta.env.VITE_REDIRECT_URI ?? `${window.location.origin}/githatch/`
}
