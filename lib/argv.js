/**
 * `/handoff` argument parsing, kept pure and separate from the command wiring so
 * flag handling (including `--latest`) is covered by unit tests.
 */

/**
 * @param {string} rawInput everything the caller typed after `/handoff `
 * @returns {{subcommand:string,taskId:string|undefined,force:boolean,latest:boolean,newTask:boolean,wake:boolean,narrative:boolean,help:boolean,supplement:string|undefined}}
 */
export function parseInput(rawInput) {
  const tokens = String(rawInput ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const flags = new Set(tokens.filter((token) => token.startsWith('--')))
  const words = tokens.filter((token) => !token.startsWith('--'))
  const subcommand = (words[0] ?? 'update').toLowerCase()
  const supplementFlag = tokens.find((token) => token.startsWith('--supplement='))
  let supplement
  if (supplementFlag !== undefined) {
    const encoded = supplementFlag.slice('--supplement='.length)
    if (encoded.length > 0) {
      try {
        supplement = Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
      } catch {
        supplement = undefined
      }
    }
  }
  return {
    subcommand,
    taskId: words[1],
    force: flags.has('--force'),
    latest: flags.has('--latest'),
    newTask: flags.has('--new'),
    wake: flags.has('--wake'),
    narrative: flags.has('--narrative') || flags.has('--full'),
    help: subcommand === 'help' || flags.has('--help'),
    supplement,
  }
}
