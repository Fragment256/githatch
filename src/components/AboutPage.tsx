interface Props {
  onBack: () => void
}

export function AboutPage({ onBack }: Props) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <button
        onClick={onBack}
        className="mb-12 font-mono text-xs tracking-widest text-black/40 uppercase hover:text-black"
      >
        ← Back
      </button>

      <div className="flex flex-col gap-12">
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs font-bold tracking-widest text-black uppercase">Why</h2>
          <p className="text-base leading-relaxed text-black/80">
            At some point, using AI well stops being about better prompts and starts being about
            better specs. You write a clear brief, and you want an agent to pick it up — while you
            sleep, while you&apos;re in a meeting, on a schedule.
          </p>
          <p className="text-base leading-relaxed text-black/80">
            The bottleneck isn&apos;t Claude. It&apos;s having somewhere reliable to run it without
            babysitting it.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs font-bold tracking-widest text-black uppercase">
            Philosophy
          </h2>
          <p className="text-base leading-relaxed text-black/80">
            Most solutions introduce a new system: a new dashboard, a new scheduler, a platform to
            trust and eventually pay for. That&apos;s the wrong trade.
          </p>
          <p className="text-base leading-relaxed text-black/80">
            GitHub Actions already has everything — scheduled execution, secret management, access
            to your codebase, a full audit log, and compute you&apos;re probably already paying for.
            The right tool uses that infrastructure instead of replacing it.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs font-bold tracking-widest text-black uppercase">
            Solution
          </h2>
          <p className="text-base leading-relaxed text-black/80">
            GitHatch is a thin UI over GitHub Actions. It writes workflow files into your repo,
            wires up the Claude Code action, and stays out of the way.
          </p>
          <p className="text-base leading-relaxed text-black/80">
            No lock-in. No new database. If you stop using GitHatch, the workflows stay in your repo
            and keep running.
          </p>
        </section>
      </div>
    </div>
  )
}
