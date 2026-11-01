import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeHandoffDocument, renderBrief, splitSections } from '../lib/render.js'

test('brief carries the requested compact fields', () => {
  const brief = renderBrief({
    task: {
      taskId: '20261029-1705',
      title: 'Long session handoff',
      status: 'pending',
    },
    docPath: 'C:\\ws\\.dsh\\dsh-handitoff\\20261029-1705\\HANDOFF.md',
    language: 'zh',
  })
  assert.ok(brief.startsWith('【交接续接】Long session handoff'))
  assert.ok(brief.includes('任务：20261029-1705'))
  assert.ok(brief.includes('文档：C:\\ws\\.dsh\\dsh-handitoff\\20261029-1705\\HANDOFF.md'))
  assert.ok(brief.includes('状态：pending'))
  assert.ok(brief.includes('要求：1）先完整读取 HANDOFF.md'))
  assert.ok(!brief.includes('来源：'))
  assert.ok(!brief.includes('规模：'))
  assert.ok(!brief.includes('第一件事：'))
  assert.ok(!brief.includes('进度：'))
  assert.ok(!brief.includes('undefined'))
})

test('normalizeHandoffDocument reorders 0-11 and drops section 12', () => {
  const order = [0, 2, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const source = [
    '---\ntask_id: "t"\n---',
    '',
    '# Title',
    '',
    ...order.map((number) => `## ${number}. Section ${number}\n\nbody ${number}`),
    '## 12. Recent\n\nuser text',
  ].join('\n\n')
  const result = normalizeHandoffDocument(source)
  assert.equal(result.ok, true)
  const headings = [...result.markdown.matchAll(/^## (\d+)\./gm)].map((match) => Number(match[1]))
  assert.deepEqual(headings, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  assert.ok(!result.markdown.includes('## 12.'))
})

test('normalizeHandoffDocument reports missing sections', () => {
  const source = [
    '# Title',
    ...Array.from({ length: 12 }, (_, number) => number)
      .filter((number) => number !== 5)
      .map((number) => `## ${number}. Section ${number}\n\nbody`),
  ].join('\n\n')
  const result = normalizeHandoffDocument(source)
  assert.equal(result.ok, false)
  assert.deepEqual(result.missing, [5])
})

test('splitSections returns headings in order', () => {
  const sections = splitSections('---\na: 1\n---\n\n# T\n\n## A\n\nalpha\n\n## B\n\nbeta\n')
  assert.deepEqual(Object.keys(sections), ['A', 'B'])
  assert.equal(sections.A, 'alpha')
  assert.equal(sections.B, 'beta')
})
