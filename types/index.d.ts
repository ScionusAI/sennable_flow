export type Phase = 'plan' | 'design' | 'delegate' | 'review' | 'close'

export type PlannedTask = {
  title: string
  /** haiku | sonnet | opus | fable | jev | jev_image */
  model: string
  effort: string
  skill: string
  /** Jev's probability for the model pick, 0..1; null when Jev did not answer. */
  sure: number | null
  /** Questions that fell back to their default (Jev under 60%). */
  fallback: string[]
  /** Jev's own guess when the model fell back, e.g. 'haiku'. */
  guess?: string
  /** Set when the orchestrator raised Jev's pick: the one-line reason. */
  raised?: string
  after: number[]
  /** For a task with no Agent run (a Jev task), as the orchestrator reports it; unset for planned and Agent tasks. */
  state?: 'running' | 'done' | 'failed'
  /** Chip label for the model (the pick row's model_name, e.g. "Jev 1.13"); falls back to MODEL_LABEL. */
  label?: string
}

export type Flow = {
  title: string
  total: number
  done: number
  running: number
  phase: Phase
  isFinished: boolean
  tasks: PlannedTask[]
}

export type AgentStatus = 'running' | 'done' | 'failed'

export type AgentRun = {
  id: string
  agentId?: string
  type: string
  description: string
  model: string
  effort?: string
  status: AgentStatus
  startedAt: number
  endedAt?: number
  contextTokens: number
  contextMax: number
  tokens: number
  costUsd: number
  steps: number
  round: number
  /** Self-reported by the worker through the `step` tool. */
  stepDone?: number
  stepTotal?: number
  stepNote?: string
}

export type Panel = {
  isCompact: boolean
  isDoneCollapsed: boolean
  autoOpenedFor: string
}

/** One line of the panel's Locks block, read from the collision-guard mod's lock folder. */
export type LockRow = {
  isWaiting: boolean
  text: string
}

declare module 'claude-code' {
  interface PluginState {
    'sennable-flow': {
      flow: Flow | null
      agents: AgentRun[]
      panel: Panel
      now: number
      /** Last model request of the main session and of any worker, for the cache countdowns. */
      lastMainAt: number
      lastWorkerAt: number
      /** The on/off switch, mirrored from ~/.claude/sennable-flow.json so it holds across sessions. */
      mode: { on: boolean }
      /** The elephant/goldfish switch, mirrored from ~/.claude/elephant-goldfish.json. */
      egMode: { on: boolean }
      /** Whether the working directory has a .claude/commands/eg-*.md; the switch applies only then. */
      egAvailable: boolean
      /** Keep-warm ping, this session only: on until `until`, `pings` sent, `retryAt` after a failed ping. */
      keepWarm: { on: boolean; until: number; pings: number; retryAt: number }
      /** Who holds and who waits for what, per the collision-guard lock folder (polled every 2 s). */
      locks: LockRow[]
    }
  }
}
