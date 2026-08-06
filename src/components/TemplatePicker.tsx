import { TEMPLATES, type Template } from '@/lib/templates'

interface Props {
  selected: string | null
  onSelect: (template: Template | null) => void
}

export function TemplatePicker({ selected, onSelect }: Props) {
  return (
    <div className="mb-6">
      <p className="mb-2 font-mono text-xs tracking-widest text-black uppercase">
        Start from template
      </p>
      <div className="flex flex-col gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(selected === t.id ? null : t)}
            className={`w-full border-2 px-4 py-3 text-left transition-colors duration-100 ${
              selected === t.id
                ? 'border-black bg-black text-white'
                : 'border-black bg-white text-black hover:bg-gray-50'
            }`}
          >
            <p className="font-mono text-sm font-semibold">{t.name}</p>
            <p
              className={`mt-0.5 text-xs ${selected === t.id ? 'text-white/70' : 'text-gray-500'}`}
            >
              {t.description}
            </p>
          </button>
        ))}
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="self-start font-mono text-xs text-gray-400 underline hover:text-black"
          >
            Start from scratch
          </button>
        )}
      </div>
    </div>
  )
}
