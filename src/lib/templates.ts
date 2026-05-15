import seDailySprintYaml from '../../.github/workflows/githatch-senior-engineer-daily-sprint.yml?raw'
import sprintPlanningYaml from '../../.github/workflows/githatch-sprint-planning.yml?raw'
import { taskConfigFromYaml, type TaskConfig } from './yamlGenerator'

export interface Template {
  id: string
  name: string
  description: string
  defaultTaskName: string
  yaml: string
}

function parseScheduleFromYaml(yaml: string): string | undefined {
  const match = yaml.match(/cron: '([^']+)'/)
  return match ? match[1] : undefined
}

export function templateToConfig(t: Template): TaskConfig {
  const schedule = parseScheduleFromYaml(t.yaml)
  return taskConfigFromYaml(t.defaultTaskName, schedule, t.yaml)
}

export const TEMPLATES: Template[] = [
  {
    id: 'se-daily-sprint',
    name: 'SE Daily Sprint',
    description:
      'Runs nightly — fixes CI, ships from roadmap and issues, implements existing specs. Never plans.',
    defaultTaskName: 'Senior Engineer Daily Sprint',
    yaml: seDailySprintYaml,
  },
  {
    id: 'sprint-planning',
    name: 'Sprint Planning',
    description:
      'Opus-powered planning agent — assesses state, updates roadmap, writes specs. Trigger manually before each sprint.',
    defaultTaskName: 'Sprint Planning',
    yaml: sprintPlanningYaml,
  },
]
