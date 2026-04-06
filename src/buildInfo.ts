export type ChangelogEntry = { hash: string; date: string; message: string }

export type BuildInfo = {
  version: string
  commit: string
  builtAt: string
  changelog: ChangelogEntry[]
}

export const buildInfo: BuildInfo = {
  version: '1.0.0',
  commit: 'dev',
  builtAt: new Date().toISOString(),
  changelog: [],
}
