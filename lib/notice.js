/**
 * Threshold reminders: once per configured step band (and once for the token
 * threshold), insert a plugin-sourced notice at the next message boundary.
 *
 * Delivery uses the framework's native `notice` channel — the same pattern the
 * shipped multi-folder plugin uses — and never interrupts an in-flight tool
 * call or appends to the session log outside the normal message push.
 *
 * Delivered bands are persisted beside the handoff documents. Keeping them in
 * memory only made a plugin reload look like a fresh session and re-fire (or,
 * after the band had already passed, skip) a threshold.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { FACTS_KEY, projectedPressureTokens, resolveProjectionRegistry } from './facts.js'
import { nextReminder } from './notice-core.js'

const SOURCE_KIND = 'plugin:dsh-handitoff'
const MAX_SESSIONS = 200
const STATE_FILE = '.dsh/dsh-handitoff/reminders.json'

export function registerHandoffNotices(ctx, config) {
  const delivered = new Map()
  const files = new Map()

  // Read the registry through `ctx.get`: a plain `ctx.sessionProjections`
  // property read is rejected for services this plugin never injected.
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
    let pressure
    try {
      stats = projections.stateOf(session, 'sessionStats')
      facts = projections.stateOf(session, FACTS_KEY)
      pressure = projections.stateOf(session, 'contextPressure')
    } catch {
      return undefined
    }
    // `sessionStats.steps` counts finished steps; the handoff facts projection
    // already has the started step, so a threshold crossed inside a long step
    // can be reported at the next tool boundary instead of after the step end.
    const steps = Math.max(Number(stats?.steps) || 0, Number(facts?.steps) || 0)
    const tokens = Number(projectedPressureTokens(pressure)) || 0
    const window = Number(pressure?.contextWindow) || 0
    const stored = await loadFile(session)
    const bands = new Set(
      Array.isArray(stored?.[session.id])
        ? stored[session.id]
        : [...(delivered.get(session.id) ?? [])],
    )
    const reminder = nextReminder({ steps, tokens, window }, config, bands)
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

  const notice = (text, summary) =>
    createUserMessage({
      content: [{ type: 'text', text }],
      source: { kind: SOURCE_KIND, form: 'notice', summary: String(summary).slice(0, 120) },
    })

  ctx.on('agent/pre-step', async (payload, next) => {
    const decision = await next()
    if (decision.kind !== 'enter') return decision
    const text = await check(payload.agent?.session)
    if (text === undefined) return decision
    return { ...decision, messages: [notice(text, 'handoff reminder'), ...decision.messages] }
  })

  ctx.on('tools/post-execute', async (exec, result, next) => {
    const decision = await next()
    const text = await check(exec.agent?.session)
    if (text === undefined) return decision
    const message = notice(text, 'handoff reminder')
    const contexts = decision.additionalContexts ?? []
    return { ...decision, additionalContexts: [message, ...contexts] }
  })
}
