# dsh-handitoff

Hand a long Session to a fresh one: the old Session's model writes `HANDOFF.md`,
and the new Session continues from that document alone.

The package is **dsh-handitoff**; the command is still `/handitoff`.

[Chinese](README.md)

## Features

- `/handitoff` sends a handoff instruction to the current Session; the model writes
  `HANDOFF.md` in 12 sections (0–11).
- Section 12 is appended by the plugin from the Session log after the model
  finishes; the agent does not transcribe or verify it. `recentRounds` defaults
  to 5.
- **Handoff and continue** in the Session **⋯** menu waits for the old model,
  creates a new Session, and reads only the document. The command result is a
  collapsed card instead of a long prompt.
- `/handitoff resume` injects a brief; `/handitoff resume --latest --wake` also wakes
  the model from the command handler.
- Tasks expire after one day by default; documents live under
  `<workspace>/.dsh/dsh-handitoff/`.

## Install

Requires DeepSeek Harness `0.2.1-rc.x` and Node.js `^22.19.0 || >=24.0.0`.

In **Settings → Plugins**, install a bundle from this local checkout, select
`dsh-handitoff`, and restart. CLI alternative:

```powershell
dsh plugin --profile desktop add link:D:\path\to\dsh-handitoff
```

The CLI only installs the package; still select `dsh-handitoff` in
**Settings → Plugins** (or add it to the profile's `dsh.profile.bundles`) and
restart.

Uninstall:

```powershell
dsh plugin --profile desktop remove dsh-handitoff
```

The first run with the new default migrates the old
`<workspace>/.dsh/dsh-handoff/` or `<workspace>/.dsh/handoff/` folder to
`<workspace>/.dsh/dsh-handitoff/`; existing documents move with it.

## Usage

### Write a handoff document

```text
/handitoff
/handitoff status
/handitoff list
```

`/handitoff` creates the task folder and sends a formatted instruction; the
document is ready only after that model turn finishes. `/handitoff update` is the
same action, `/handitoff --new` starts another task line.

Sections 0–11 are the handoff; section 12 records the most recent user/assistant
rounds. The instruction requires real content in every section and facts from
the current Session.

### One-click handoff

Session list **⋯** → **Handoff and continue**:

1. the old model writes `HANDOFF.md` (sections 0–11);
2. the turn is allowed to finish (up to 4 minutes), then the plugin appends
   section 12 directly from the Session log;
3. a standard question card asks whether anything should be added; the default
   option is "No, start handoff" and its input box is optional;
4. on "Next": empty opens the new Session directly; text is inserted verbatim
   into the resume injection under "User supplement before takeover";
5. the new Session runs `/handitoff resume --latest --wake`, reads the document,
   reviews the project files, and gives a concise takeover summary.

The first reply does not run commands or modify files.

### Resume manually

```text
/handitoff resume
/handitoff resume --latest
/handitoff resume --latest --wake
/handitoff resume <taskId>
```

- Without `--wake`: inject only; send another message to continue.
- With `--wake`: inject and start the model turn; this is the one-click path.
- With several pending tasks, use `--latest` or an explicit `taskId`.

Re-running in the same Session reports “already resumed”; add `--force` to
inject again.

### Archive

```text
/handitoff archive <taskId>
```

The document stays on disk but is no longer a resume candidate.

## Configuration

Override the row in the profile's `cordis.patch.yml`:

```yaml
- id: dsh-handitoff
  name: dsh-handitoff
  config:
    retentionDays: 1
    language: zh
```

| Key | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | Master switch. |
| `retentionDays` | `1` | Delete task folders not updated for this many days; `0` disables. |
| `recentRounds` | `5` | Recent rounds embedded in the handoff; `0` disables the section. |
| `resumeBriefMaxChars` | `2400` | Maximum injected brief length. |
| `language` | `zh` | `zh` or `en`. |
| `remindAfterSteps` | `800` | First step reminder. |
| `remindEverySteps` | `200` | Reminder band interval. |
| `remindAfterTokens` | `120000` | Context-token reminder; `0` disables. |

### Settings page

After the plugin is installed and enabled, **Settings → Handoff** edits:

- the three reminder thresholds
- retention days
- recent rounds
- maximum brief characters
- brief/wake language

Saving uses the Host settings API; some changes take effect after a plugin
reload. `enabled` is not on the page because disabling the plugin removes the
page itself; use the plugin manager or profile config for that.

## Files

```text
<workspace>/.dsh/dsh-handitoff/
  index.json              task index (metadata)
  <taskId>/HANDOFF.md     the only content file, sections 0–12
```

Every `/handitoff` command cleans up tasks older than `retentionDays`; legacy
`facts.json`, `history/`, and `resume-log.jsonl` are removed. Status flows
`draft` → `pending` → `resumed`, with `archived` terminal.

Add `.dsh/` to `.gitignore` if handoff notes should not be committed.

## Limitations

- The document is model-written; quality depends on following the template.
  `/handitoff status` shows whether the file exists.
- One-click requires a Session with a workspace; blank Sessions do not show the
  menu item.
- If frontmatter `task_id` is missing, `/handitoff resume` refuses the document;
  run `/handitoff` again.
- `index.json` is metadata for discovery and cleanup, not handoff content.

## Development

```powershell
npm test
```

Pure ESM, no build step. Tests cover storage, cleanup, index recovery, briefs,
instruction format, and resume selection.

Repository: <https://github.com/NFdrybattery/dsh-handitoff>

## License

MIT. See [LICENSE](LICENSE).
