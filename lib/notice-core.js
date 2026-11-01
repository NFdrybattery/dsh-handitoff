/**
 * Pure threshold decision for the handoff reminder. Kept separate from the
 * event wiring so the banding rules can be tested without a Harness process.
 */

/**
 * @param {{steps:number}} metrics
 * @param {{remindAfterSteps:number,remindEverySteps:number}} config
 * @param {Set<string>} delivered already-delivered band keys for one session
 * @returns {{key:string,text:string}|undefined}
 */
export function nextReminder(metrics, config, delivered) {
  const steps = Number(metrics?.steps) || 0
  if (steps < config.remindAfterSteps) return undefined

  const band = Math.floor(steps / config.remindEverySteps) * config.remindEverySteps
  const key = `steps:${band}`
  if (delivered.has(key)) return undefined
  return {
    key,
    text: `本会话已 ${steps} 步。建议执行 /handitoff 将任务交接到新会话。`,
  }
}
