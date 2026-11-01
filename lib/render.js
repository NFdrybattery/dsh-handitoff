/**
 * Markdown rendering for HANDOFF.md and the resume brief.
 *
 * Pure functions: existence checks for the file map happen before rendering,
 * so the output is deterministic and unit-testable.
 */

const LABELS = {
  zh: {
    title: '任务交接',
    sections: [
      '0. 60 秒摘要',
      '1. 目标与需求 / 验收标准',
      '2. 当前状态',
      '3. 已完成',
      '4. 待办与下一步',
      '5. 关键决策与理由',
      '6. 文件地图',
      '7. 坑与失败尝试',
      '8. 验证方式与命令',
      '9. 环境与依赖',
      '10. 未决问题',
      '11. 相关会话与资料',
    ],
    none: '无',
    todo: '> TODO(模型补写)',
    first: '第一件事',
    next: '接下来',
    status: '当前状态',
    progress: '进度',
    blockers: '阻塞',
    fileTableHead: '| 路径 | 作用 | 状态 |',
    fileTableSep: '| --- | --- | --- |',
    acceptance: '**验收标准**',
    brief: {
      head: '【交接续接】',
      sep: '：',
      task: '任务',
      doc: '文档',
      state: '状态',
      requirement: '要求',
      requirementText:
        '1）先完整读取 HANDOFF.md，给出一份简要的接手总结和下一步说明。2）未确认前不要修改文件，不要执行长任务。3）必要时可以读取旧会话和项目文件。',
      supplement: '用户补充要求',
    },
  },
  en: {
    title: 'Task handoff',
    sections: [
      '0. 60-second summary',
      '1. Goal and acceptance criteria',
      '2. Current state',
      '3. Completed',
      '4. Next steps',
      '5. Key decisions',
      '6. File map',
      '7. Pitfalls and failed attempts',
      '8. Verification',
      '9. Environment and dependencies',
      '10. Open questions',
      '11. Related sessions and references',
    ],
    none: 'None',
    todo: '> TODO(write this section)',
    first: 'First action',
    next: 'Next',
    status: 'Current state',
    progress: 'Progress',
    blockers: 'Blockers',
    fileTableHead: '| Path | Purpose | State |',
    fileTableSep: '| --- | --- | --- |',
    acceptance: '**Acceptance criteria**',
    brief: {
      head: '[Handoff resume]',
      sep: ': ',
      task: 'Task',
      doc: 'Document',
      state: 'Status',
      requirement: 'Requirements',
      requirementText:
        '1) Read HANDOFF.md completely and give a concise takeover summary and next steps. 2) Do not modify files or run a long task before confirmation. 3) Read the old Session and project files when necessary.',
      supplement: 'User supplement',
    },
  },
}

/** Labels for the configured document language, defaulting to Chinese. */
export function labelsFor(language) {
  return language === 'en' ? LABELS.en : LABELS.zh
}

/** Render the injected resume brief. */
export function renderBrief({ task, docPath, language = 'zh' }) {
  const labels = labelsFor(language).brief
  const sep = labels.sep
  const title = String(task.title ?? task.taskId ?? '').trim()
  const status = String(task.status ?? 'pending').trim() || 'pending'
  const lines = [
    `${labels.head}${title}`,
    '',
    `${labels.task}${sep}${task.taskId}`,
    `${labels.doc}${sep}${docPath}`,
    `${labels.state}${sep}${status}`,
    `${labels.requirement}${sep}${labels.requirementText}`,
  ]
  return lines.join('\n')
}

/**
 * Split a HANDOFF.md into frontmatter and `## heading` sections.
 */
export function splitSections(markdown) {
  const text = typeof markdown === 'string' ? markdown : ''
  const sections = {}
  let current = null
  for (const line of text.split(/\r?\n/)) {
    const match = /^## (.+?)\s*$/.exec(line)
    if (match) {
      current = match[1]
      sections[current] = []
    } else if (current !== null) {
      sections[current].push(line)
    }
  }
  const compact = {}
  for (const [key, value] of Object.entries(sections)) compact[key] = value.join('\n').trim()
  return compact
}

const REQUIRED_SECTIONS = Array.from({ length: 12 }, (_, index) => index)

/**
 * Validate and reorder the model-written 0–11 sections. Section 12 is added by
 * the plugin and is deliberately dropped here.
 *
 * @param {string} markdown
 * @returns {{ok:boolean,markdown:string,missing:number[],duplicates:number[],empty:number[]}}
 */
export function normalizeHandoffDocument(markdown) {
  const text = typeof markdown === 'string' ? markdown : ''
  const rawHeadings = [...text.matchAll(/^## (.+?)\s*$/gm)].map((match) => match[1])
  const numbered = []
  for (const heading of rawHeadings) {
    const match = /^(\d+)\./.exec(heading)
    if (match !== null) numbered.push({ number: Number(match[1]), heading })
  }
  const numbers = numbered.map((item) => item.number)
  const missing = REQUIRED_SECTIONS.filter((number) => !numbers.includes(number))
  const duplicates = [...new Set(numbers.filter((number, index) => numbers.indexOf(number) !== index))]
  const sections = splitSections(text)
  const empty = REQUIRED_SECTIONS.filter((number) => {
    const item = numbered.find((entry) => entry.number === number)
    return item !== undefined && (sections[item.heading] ?? '').trim().length === 0
  })

  if (missing.length > 0 || duplicates.length > 0 || empty.length > 0) {
    return { ok: false, markdown: text, missing, duplicates, empty }
  }

  const firstHeading = text.search(/^## \d+\./m)
  const prefix = firstHeading >= 0 ? text.slice(0, firstHeading).trimEnd() : ''
  const body = REQUIRED_SECTIONS.map((number) => {
    const item = numbered.find((entry) => entry.number === number)
    return `## ${item.heading}\n\n${sections[item.heading]}`
  }).join('\n\n')
  return {
    ok: true,
    markdown: `${prefix}\n\n${body}\n`,
    missing,
    duplicates,
    empty,
  }
}
