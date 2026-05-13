import { LoginButton } from '@/components/LoginButton'

interface Props {
  onLogin: () => void
  loading: boolean
  onAbout: () => void
}

function FlowStep({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="border-2 border-black px-4 py-3 font-mono text-xs tracking-widest text-black uppercase">
        {label}
      </div>
      <span className="font-mono text-xs text-black/40">{sub}</span>
    </div>
  )
}

function Arrow() {
  return (
    <div className="flex items-center self-start pt-3">
      <div className="h-px w-6 bg-black sm:w-10" />
      <div className="border-t-4 border-r-0 border-b-4 border-l-8 border-transparent border-l-black" />
    </div>
  )
}

export function Landing({ onLogin, loading, onAbout }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-16 px-6 py-16">
      {/* Hero */}
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-4xl font-black tracking-tight text-black sm:text-5xl">
          Your repo is already
          <br />
          an agent runtime.
        </h1>
        <p className="max-w-xl text-base text-black/60">
          GitHatch is a UI for scheduling Claude agents via GitHub Actions.
        </p>
        <div className="mt-2 flex items-center gap-4">
          <LoginButton onLogin={onLogin} loading={loading} />
          <button
            onClick={onAbout}
            className="font-mono text-xs tracking-widest text-black/40 uppercase hover:text-black"
          >
            About →
          </button>
        </div>
      </div>

      {/* Flow diagram */}
      <div className="flex flex-col gap-6">
        <p className="font-mono text-xs tracking-widest text-black/40 uppercase">How it works</p>
        <div className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
          <FlowStep label="Define an agent" sub="what it should do" />
          <Arrow />
          <FlowStep label="Schedule it" sub="GitHatch commits the workflow" />
          <Arrow />
          <FlowStep label="Actions runs" sub="daily, weekly, on demand" />
          <Arrow />
          <FlowStep label="Claude delivers" sub="file · issue · PR" />
        </div>
      </div>

      {/* Three callouts */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="flex flex-col gap-2 border-t-2 border-black pt-4">
          <p className="font-mono text-xs font-bold tracking-widest text-black uppercase">
            Just GitHub Actions
          </p>
          <p className="text-sm text-black/60">
            The workflows live in your repo. Use the GitHub CLI as normal — run, watch, list.
          </p>
          <pre className="mt-2 bg-black px-3 py-2 font-mono text-xs text-white">
            {`gh workflow run githatch-task.yml\ngh run list\ngh run watch`}
          </pre>
        </div>

        <div className="flex flex-col gap-2 border-t-2 border-black pt-4">
          <p className="font-mono text-xs font-bold tracking-widest text-black uppercase">
            OAuth only
          </p>
          <p className="text-sm text-black/60">
            No backend. No database. Your GitHub token lives in your browser session only. GitHatch
            never touches your code or your conversations.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t-2 border-black pt-4">
          <p className="font-mono text-xs font-bold tracking-widest text-black uppercase">
            No lock-in
          </p>
          <p className="text-sm text-black/60">
            Workflows are committed to your repo. Stop using GitHatch and they keep running.
          </p>
        </div>
      </div>
    </div>
  )
}
