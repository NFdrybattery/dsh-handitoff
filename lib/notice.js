/**
 * Step-threshold reminders. At the first step of each user turn the plugin
 * checks the current step count; a crossed, not-yet-delivered band emits one
 * client notification. Delivered bands persist beside the handoff documents so
 * a plugin reload or Session resume does not re-fire or skip a threshold.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { FACTS_KEY, resolveProjectionRegistry } from './facts.js'
import { nextReminder } from './notice-core.js'

const REMINDER_EVENT = 'dsh-handitoff/reminder'
const MAX_SESSIONS = 200
const STATE_FILE = '.dsh/dsh-handitoff/reminders.json'

export function registerHandoffNotices(ctx, config) {
  const delivered = new Map()
  const files = new Map()
  const checkedTurns = new Map()

  const registry = () => resolveProjectionRegistry(ctx)

  const statePath = (session) => {
    const cwd = session?.header?.cwd
    return typeof cwd === 'string' && cwd.length > 0 ? join(cwd, STATE_FILE) : undefined
  }

  const loadFile = async (session) => {
    const path = statePath(session)
    if (path === undefined) return undefined
    const cached = files.get(path)
    if (cached !== undefined) return cached
    try {
      const parsed = JSON.parse(await readFile(path, 'utf8'))
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        files.set(path, parsed)
        return parsed
      }
    } catch {
      // Missing or unreadable state starts empty.
    }
    const empty = {}
    files.set(path, empty)
    return empty
  }

  const saveFile = async (session, state) => {
    const path = statePath(session)
    if (path === undefined) return
    try {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, JSON.stringify(state), 'utf8')
    } catch {
      // Keep the in-memory map as the fallback.
    }
  }

  const check = async (session) => {
    if (session === undefined || typeof session?.id !== 'string') return undefined
    const projections = registry()
    if (projections === undefined) return undefined
    let stats
    let facts
    try {
      stats = projections.stateOf(session, 'sessionStats')
      facts = projections.stateOf(session, FACTS_KEY)
    } catch {
      return undefined
    }
    const turn = Math.max(Number(stats?.turns) || 0, Number(facts?.turns) || 0)
    if (turn <= 0 || checkedTurns.get(session.id) === turn) return undefined
    checkedTurns.set(session.id, turn)

    // Current started step, not only the finished-step counter.
    const steps = Math.max(Number(stats?.steps) || 0, Number(facts?.steps) || 0)
    const stored = await loadFile(session)
    const bands = new Set(
      Array.isArray(stored?.[session.id])
        ? stored[session.id]
        : [...(delivered.get(session.id) ?? [])],
    )
    const reminder = nextReminder({ steps }, config, bands)
    if (reminder === undefined) return undefined

    bands.add(reminder.key)
    delivered.set(session.id, bands)
    if (stored !== undefined) {
      stored[session.id] = [...bands]
      await saveFile(session, stored)
    }
    if (delivered.size > MAX_SESSIONS) {
      const oldest = delivered.keys().next().value
      delivered.delete(oldest)
    }
    return reminder.text
  }

  ctx.on('agent/turn-stopping', async (payload) => {
    const session = payload?.agent?.session ?? payload?.session ?? payload
    const text = await check(session)
    if (text !== undefined) ctx.emit(REMINDER_EVENT, { text })
  })
}
