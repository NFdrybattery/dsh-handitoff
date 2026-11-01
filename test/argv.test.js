import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseInput } from '../lib/argv.js'

test('an empty line is the plain write action', () => {
  const parsed = parseInput('')
  assert.equal(parsed.subcommand, 'update')
  assert.equal(parsed.taskId, undefined)
  assert.equal(parsed.narrative, false)
  assert.equal(parsed.latest, false)
})

test('resume with an explicit task id keeps it', () => {
  const parsed = parseInput(' resume 20261029-1710-keep-history')
  assert.equal(parsed.subcommand, 'resume')
  assert.equal(parsed.taskId, '20261029-1710-keep-history')
  assert.equal(parsed.latest, false)
})

test('resume --latest sets only the latest flag', () => {
  const parsed = parseInput(' resume --latest')
  assert.equal(parsed.subcommand, 'resume')
  assert.equal(parsed.taskId, undefined)
  assert.equal(parsed.latest, true)
  assert.equal(parsed.force, false)
})

test('flags are accepted before the subcommand and next to task ids', () => {
  const parsed = parseInput(' --latest resume 20261029-1710 --force')
  assert.equal(parsed.subcommand, 'resume')
  assert.equal(parsed.taskId, '20261029-1710')
  assert.equal(parsed.latest, true)
  assert.equal(parsed.force, true)
})

test('narrative and help flags still parse', () => {
  assert.equal(parseInput(' --narrative').narrative, true)
  assert.equal(parseInput(' --full').narrative, true)
  assert.equal(parseInput(' --help').help, true)
  assert.equal(parseInput(' help').help, true)
})

test('resume --wake asks the handler to wake the new session', () => {
  const parsed = parseInput(' resume --latest --wake')
  assert.equal(parsed.subcommand, 'resume')
  assert.equal(parsed.latest, true)
  assert.equal(parsed.wake, true)
})

test('resume carries a base64url supplement verbatim', () => {
  const supplement = '补充要求：\n先改设置页，不要动图标。'
  const encoded = Buffer.from(supplement, 'utf8').toString('base64url')
  const parsed = parseInput(` resume --latest --wake --supplement=${encoded}`)
  assert.equal(parsed.subcommand, 'resume')
  assert.equal(parsed.latest, true)
  assert.equal(parsed.wake, true)
  assert.equal(parsed.supplement, supplement)
})

test('the one-click client half asks for the latest task, not an ambiguous resume', async () => {
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(source, /\/handitoff resume --latest --wake/, 'the client must resolve the task and wake the model')
  assert.doesNotMatch(source, /\/handitoff resume'/, 'a bare resume fails once an older pending task exists')
  assert.match(source, /\/handitoff ask-supplement/, 'the one-click flow must use the normal question card')
})
