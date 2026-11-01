import test from 'node:test'
import assert from 'node:assert/strict'
import { nextReminder } from '../lib/notice-core.js'

const config = {
  remindAfterSteps: 1000,
  remindEverySteps: 200,
}

test('no reminder below the threshold', () => {
  assert.equal(nextReminder({ steps: 999 }, config, new Set()), undefined)
})

test('one reminder per step band', () => {
  const delivered = new Set()
  const first = nextReminder({ steps: 1000 }, config, delivered)
  assert.equal(first.key, 'steps:1000')
  delivered.add(first.key)
  assert.equal(nextReminder({ steps: 1012 }, config, delivered), undefined)
  assert.equal(nextReminder({ steps: 1199 }, config, delivered), undefined)

  const second = nextReminder({ steps: 1200 }, config, delivered)
  assert.equal(second.key, 'steps:1200')
  delivered.add(second.key)
  assert.equal(nextReminder({ steps: 1399 }, config, delivered), undefined)
})

test('reminder text carries the step number only', () => {
  const reminder = nextReminder({ steps: 1012 }, config, new Set())
  assert.ok(reminder.text.includes('1012'))
  assert.ok(reminder.text.includes('/handitoff'))
  assert.ok(!reminder.text.includes('token'))
})
