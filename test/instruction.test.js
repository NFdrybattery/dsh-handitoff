import test from 'node:test'
import assert from 'node:assert/strict'
import { buildHandoffInstruction } from '../lib/instruction.js'

test('handoff instruction carries frontmatter, sections 0-11 and content rules', () => {
  const text = buildHandoffInstruction({
    taskId: '20261029-1957-dsh-handover',
    title: 'dsh-handitoff 交接流程',
    createdAt: '2026-10-29T19:57:00+08:00',
    updatedAt: '2026-10-29T22:00:00+08:00',
    workspace: 'D:\\41_Agent\\50_Deepseek',
    sourceSession: 'session-f76d',
    steps: 360,
    turns: 8,
    docPath: 'D:\\41_Agent\\50_Deepseek\\.dsh\\dsh-handoff\\20261029-1957-dsh-handover\\HANDOFF.md',
  })

  assert.ok(text.includes('task_id: "20261029-1957-dsh-handover"'))
  assert.ok(text.includes('title: "dsh-handitoff 交接流程"'))
  assert.ok(text.includes('status: pending'))
  assert.ok(text.includes('source_session: "session-f76d"'))
  assert.ok(text.includes('steps: 360'))
  assert.ok(text.includes('turns: 8'))
  for (let index = 0; index <= 11; index++) {
    assert.ok(text.includes(`## ${index}. `), `missing section ${index}`)
  }
  assert.ok(!text.includes('## 12. '), 'section 12 is appended by the plugin, not the model')
  assert.ok(!text.includes('最近 5 轮'))
  assert.ok(!text.includes('原样抄录'))
  assert.ok(!text.includes('【接手】<taskId'))
  assert.ok(text.includes('每一节都要写实际内容，不能只有标题'))
  assert.ok(text.includes('不要把“改过文件”当成“已完成”'))
  assert.ok(text.includes('不要写 API key、token、密码或私钥'))
  assert.ok(text.includes('只写这一个 HANDOFF.md'))
  assert.ok(text.includes('20261029-1957-dsh-handover\\HANDOFF.md'))
})

test('the plugin appends section 12 after the model writes the document', () => {
  const text = buildHandoffInstruction({
    taskId: 't',
    title: 't',
    createdAt: 'now',
    updatedAt: 'now',
    workspace: 'D:\\ws',
    sourceSession: 's',
    steps: 0,
    turns: 0,
    docPath: 'D:\\ws\\HANDOFF.md',
  })
  assert.ok(text.includes('0–11 共 12 个章节'))
  assert.ok(!text.includes('## 12. '))
})
