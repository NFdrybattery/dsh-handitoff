/**
 * dsh-handitoff — Web client half.
 *
 * One click asks the current Session to write its handoff document, waits for
 * that model turn to finish, then creates a new Session and uses
 * `/handitoff resume --latest --wake` so the new Session starts from the document.
 *
 * Entry points:
 *   - sidebar.workspaces.session.menu.item  "…" menu row (the only button; the
 *     Session header and the Session row stay untouched)
 *   - shell.overlay                         progress / error toast
 */

window.__ModuleLoader__.load({
  id: 'dsh-handitoff',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const TEXT = {
      zh: {
        action: '交接并继续',
        title: '生成交接文档，并在新会话生成接手说明',
        writing: '已发送交接指令，模型正在写交接文档…',
        creating: '正在创建新会话…',
        starting: '正在完整读取交接并生成接手说明…',
        done: '已创建新会话，模型正在完整读取交接并生成接手说明',
        error: '交接失败',
        resumeWarn: '交接摘要未能载入（新会话仍会自己读文档）',
        blank: '当前会话还没有内容，无法交接',
        noWorkspace: '找不到会话所属的工作区',
        workingShort: '交接中…',
        cancelled: '已取消交接',
        awaiting: '等待确认交接（开始 / 取消 / 填写补充要求）…',
        askTimeout: '等待交接确认超时，已停止本次交接；请重新点击「交接并继续」',
        writingFailed: '交接指令没有启动模型回合：/handitoff 可能已报错，请查看会话中的错误行后重试',
        resumeNoTurn: '接续指令没有启动模型回合（交接文档可能校验失败）',
        reminder: (steps) => `本会话已 ${steps} 步，建议交接到新会话。`,
        postpone: '推迟',
        handoffNow: '交接',
        prompt: (workspacePath) =>
          [
            '请先完整读取 HANDOFF.md，并结合项目文件梳理前期工作。',
            '然后给出一份简要的接手总结与下一步说明；必要时可以读取旧会话，不要执行长任务、不要改文件。',
            `若上一条没有【交接续接】标题，读取 ${workspacePath}\\.dsh\\dsh-handitoff\\ 下最新的 HANDOFF.md。`,
          ].join('\n'),
      },
      en: {
        action: 'Handoff and continue',
        title: 'Create a handoff document and a takeover note in a new Session',
        writing: 'Handoff instruction sent; the model is writing the document…',
        creating: 'Creating a new Session…',
        starting: 'Reading the full handoff and writing the takeover note…',
        done: 'New Session created; the model is reading the full handoff and writing the takeover note',
        error: 'Handoff failed',
        resumeWarn: 'The resume brief could not be loaded (the new Session will read the document)',
        blank: 'This Session has no content yet',
        noWorkspace: 'Could not resolve the Session workspace',
        workingShort: 'Handing off…',
        cancelled: 'Handoff cancelled',
        awaiting: 'Waiting for the handoff confirmation (start / cancel / add requirements)…',
        askTimeout: 'Timed out waiting for the handoff confirmation; this handoff stopped — click "Handoff and continue" again',
        writingFailed: 'The handoff instruction did not start a model turn; /handitoff may have failed — check the error row and retry',
        resumeNoTurn: 'The resume instruction did not start a model turn (the document may have failed validation)',
        reminder: (steps) => `This Session has ${steps} steps; consider handing it off to a new Session.`,
        postpone: 'Postpone',
        handoffNow: 'Hand off',
        prompt: (workspacePath) =>
          [
            'Read HANDOFF.md completely and review the project files.',
            'Then give a concise takeover summary of the earlier work and the next steps; read the old Session only when necessary, and do not run a long task or modify files.',
            `If the previous message has no "[Handoff resume]" header, read the newest HANDOFF.md under ${workspacePath}\\.dsh\\dsh-handitoff\\.`,
          ].join('\n'),
      },
    }

    const SETTINGS_TEXT = {
      zh: {
        title: 'Handitoff',
        subtitle: '长会话交接与接续设置。保存后，部分设置需要重新加载插件才生效。',
        basic: '基础',
        reminders: '提醒',
        storage: '保留与接续',
        language: '语言',
        languageHint: '当前影响接续摘要和唤醒消息；交接文档生成指令仍为中文。',
        remindAfterSteps: '首次提醒步数',
        remindEverySteps: '提醒间隔步数',
        retentionDays: '任务保留天数',
        retentionHint: '每次执行 /handitoff 时清理更早的任务；0 = 不清理，删除不可恢复。',
        recentRounds: '最近对话轮数',
        recentRoundsHint: '把最近几轮用户输入与助手回复原样抄进交接文档；0 = 不生成该节。',
        save: '保存',
        saving: '保存中…',
        saved: '已保存；部分设置需要重新加载插件后生效。',
        loading: '加载设置中…',
        missing: '没有找到 dsh-handitoff 的设置项；插件可能未启用。',
        readonly: '当前设置为只读。',
        loadError: '读取设置失败：',
        saveError: '保存失败：',
        reset: '恢复默认',
      },
      en: {
        title: 'Handitoff',
        subtitle: 'Long-session handoff and resume settings. Some changes take effect after the plugin is reloaded.',
        basic: 'Basics',
        reminders: 'Reminders',
        storage: 'Retention and resume',
        language: 'Language',
        languageHint: 'Currently affects the resume brief and wake message; the handoff instruction is still Chinese.',
        remindAfterSteps: 'First reminder (steps)',
        remindEverySteps: 'Reminder interval (steps)',
        retentionDays: 'Retention (days)',
        retentionHint: 'Cleans older tasks on each /handitoff; 0 = never, deletion is irreversible.',
        recentRounds: 'Recent rounds',
        recentRoundsHint: 'Recent user/assistant rounds copied verbatim into the handoff; 0 disables the section.',
        save: 'Save',
        saving: 'Saving…',
        saved: 'Saved; some settings take effect after the plugin is reloaded.',
        loading: 'Loading settings…',
        missing: 'No settings entry for dsh-handitoff; the plugin may be disabled.',
        readonly: 'Settings are read-only.',
        loadError: 'Could not load settings: ',
        saveError: 'Could not save: ',
        reset: 'Restore defaults',
      },
    }

    const SETTINGS_DEFAULTS = {
      remindAfterSteps: 1000,
      remindEverySteps: 200,
      retentionDays: 1,
      recentRounds: 5,
      language: 'zh',
    }

    const SETTINGS_LABELS = [
      'remindAfterSteps',
      'remindEverySteps',
      'retentionDays',
      'recentRounds',
      'language',
    ]

    function settingsText(locale) {
      return String(locale?.active ?? '').toLowerCase().startsWith('en') ? SETTINGS_TEXT.en : SETTINGS_TEXT.zh
    }

    function resolveSettings(raw) {
      const source = raw !== null && typeof raw === 'object' ? raw : {}
      const input = Object.fromEntries(
        Object.entries(source).map(([key, value]) => [
          key,
          value !== null && typeof value === 'object' && typeof value.get === 'function' ? value.get() : value,
        ]),
      )
      const integer = (value, fallback, minimum) => {
        const number = Number(value)
        return Number.isFinite(number) && number >= minimum ? Math.round(number) : fallback
      }
      return {
        remindAfterSteps: integer(input.remindAfterSteps, SETTINGS_DEFAULTS.remindAfterSteps, 1),
        remindEverySteps: integer(input.remindEverySteps, SETTINGS_DEFAULTS.remindEverySteps, 1),
        retentionDays:
          Number.isFinite(Number(input.retentionDays)) && Number(input.retentionDays) >= 0
            ? Number(input.retentionDays)
            : SETTINGS_DEFAULTS.retentionDays,
        recentRounds: integer(input.recentRounds, SETTINGS_DEFAULTS.recentRounds, 0),
        language: input.language === 'en' ? 'en' : 'zh',
      }
    }

    /** The plugin's settings namespace in a `settings.describe()` result. */
    function findSettingsNamespace(namespaces) {
      if (!Array.isArray(namespaces)) return undefined
      return (
        namespaces.find(
          (entry) =>
            entry.ns === 'dsh-handitoff' ||
            entry.ns === 'include:dsh-handitoff' ||
            entry.ns === 'dsh-handoff' ||
            entry.ns === 'include:dsh-handoff',
        ) ??
        namespaces.find((entry) => {
          const properties = entry.schema?.properties ?? {}
          return 'remindAfterSteps' in properties || 'recentRounds' in properties
        })
      )
    }

    const REMINDER_STYLE = {
      wrap: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        margin: '0 0 8px',
        padding: '10px 14px',
        border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.16))',
        borderRadius: 10,
        background: 'var(--dsw-alias-bg-overlay, #1f2430)',
        color: 'var(--dsw-alias-label-primary, #e6e8ee)',
        boxShadow: '0 8px 28px rgba(0,0,0,.28)',
        fontSize: 13,
        lineHeight: 1.5,
      },
      text: { flex: '1 1 240px', minWidth: 0 },
      actions: { display: 'flex', alignItems: 'center', gap: 8 },
      postpone: {
        padding: '5px 12px',
        border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.14))',
        borderRadius: 7,
        background: 'transparent',
        color: 'inherit',
        font: 'inherit',
        fontSize: 13,
        cursor: 'pointer',
      },
      handoff: {
        padding: '5px 12px',
        border: '1px solid var(--dsw-alias-brand-primary, #4f7cff)',
        borderRadius: 7,
        background: 'var(--dsw-alias-brand-primary, #4f7cff)',
        color: '#fff',
        font: 'inherit',
        fontSize: 13,
        fontWeight: 550,
        cursor: 'pointer',
      },
    }

    const REMINDER_CSS = [
      '@keyframes dsh-handitoff-reminder-rise {',
      '  from { opacity: 0; transform: translateY(10px); }',
      '  to { opacity: 1; transform: translateY(0); }',
      '}',
      '.dsh-handitoff-reminder {',
      '  animation: dsh-handitoff-reminder-rise .18s ease-out;',
      '}',
    ].join('\n')

    /** Session-scoped postponed threshold (`remindAfterSteps` + n × `remindEverySteps`). */
    const POSTPONE_KEY_PREFIX = 'dsh-handitoff:after-steps:'
    /** Sessions whose one-click handoff was already started from the card. */
    const handedOffSessions = new Set()
    /** Sessions whose last one-click handoff was cancelled in the confirm card. */
    const handoffCancelledSessions = new Set()

    function readPostponed(sessionId) {
      try {
        const raw = window.localStorage.getItem(POSTPONE_KEY_PREFIX + sessionId)
        const value = Number(raw)
        return Number.isFinite(value) && value > 0 ? value : undefined
      } catch {
        return undefined
      }
    }

    function writePostponed(sessionId, value) {
      try {
        window.localStorage.setItem(POSTPONE_KEY_PREFIX + sessionId, String(value))
      } catch {
        // Memory-only when storage is unavailable.
      }
    }

    /**
     * Step-threshold reminder: a floating card at the bottom of the transcript
     * with handoff and postpone actions.
     *
     * It is rendered here, not written into the Session: a reminder that enters
     * model-facing context makes the model answer it (and sometimes write a
     * handoff document by itself), while the user asked for a visible hint they
     * act on. `sessionStats` is the same client-visible projection the composer
     * stats use, so the count is live and needs no Host round trip.
     */
    function ReminderCard(props) {
      // The global seat is typed for session-scoped slots; fall back to the
      // workspaces service when a composition omits it, so the card still
      // resolves its workspace instead of vanishing.
      const useWorkspaces = typeof props.useWorkspaces === 'function' ? props.useWorkspaces : NO_WORKSPACES
      return h(ReminderCardInner, { ...props, useWorkspaces })
    }

    const NO_WORKSPACES = () => undefined

    /** Workspace row for a Session from the Workspaces service (no hook seat). */
    function workspaceFromService(ctx, sessionId) {
      try {
        const service = typeof ctx.get === 'function' ? ctx.get('workspaces') : ctx.workspaces
        const list = service?.list
        const snapshot =
          typeof list?.getSnapshot === 'function' ? list.getSnapshot() : typeof list === 'function' ? list() : undefined
        const items = Array.isArray(snapshot?.items) ? snapshot.items : []
        return items.find((workspace) => Array.isArray(workspace?.sessionIds) && workspace.sessionIds.includes(sessionId))
      } catch {
        return undefined
      }
    }

    function ReminderCardInner({ session, useProjection, useWorkspaces }) {
      const ctx = pluginCtx
      const locale = useLocale(ctx)
      const t = strings(locale)
      const sessionId = session?.sessionId
      const hookWorkspace = useWorkspaceForSession(useWorkspaces, sessionId)
      const [fallbackWorkspace, setFallbackWorkspace] = React.useState(undefined)
      React.useEffect(() => {
        if (hookWorkspace !== undefined || typeof sessionId !== 'string') return
        setFallbackWorkspace(workspaceFromService(ctx, sessionId))
      }, [ctx, hookWorkspace, sessionId])
      const workspace = hookWorkspace ?? fallbackWorkspace
      const handoff = useHandoffAction(ctx, sessionId, workspace)
      const [config, setConfig] = React.useState(() => resolveSettings(SETTINGS_DEFAULTS))
      const [after, setAfter] = React.useState(() =>
        typeof sessionId === 'string' ? readPostponed(sessionId) : undefined,
      )
      const [, setRevision] = React.useState(0)
      React.useEffect(() => {
        setAfter(typeof sessionId === 'string' ? readPostponed(sessionId) : undefined)
      }, [sessionId])
      React.useEffect(() => {
        let alive = true
        void (async () => {
          try {
            const result = await ctx.remote.settings.describe()
            if (!result.ok) return
            const found = findSettingsNamespace(result.value.namespaces)
            if (alive) setConfig(resolveSettings(found?.value))
          } catch {
            // Defaults already apply.
          }
        })()
        return () => {
          alive = false
        }
      }, [ctx])
      const steps = useProjection('sessionStats', (value) => {
        const count = Number(value?.steps)
        return Number.isFinite(count) && count > 0 ? count : 0
      })
      if (typeof sessionId !== 'string' || sessionId.length === 0) return null
      if (handedOffSessions.has(sessionId)) return null
      const threshold = after ?? config.remindAfterSteps
      if (steps < threshold) return null
      const every = config.remindEverySteps > 0 ? config.remindEverySteps : SETTINGS_DEFAULTS.remindEverySteps
      const postpone = () => {
        let next = threshold + every
        // A postpone always moves the reminder past the count already reached.
        while (next <= steps) next += every
        setAfter(next)
        writePostponed(sessionId, next)
      }
      const startHandoff = () => {
        if (handoff.busy) return
        if (!workspace || typeof workspace.workspaceId !== 'string') {
          pushToast(t.noWorkspace, 'error', 8000)
          return
        }
        handedOffSessions.add(sessionId)
        void Promise.resolve(handoff.run()).finally(() => {
          // A cancelled confirmation means nothing was handed off: bring the
          // reminder back instead of leaving the Session silently unflagged.
          if (handoffCancelledSessions.delete(sessionId)) {
            handedOffSessions.delete(sessionId)
            setRevision((value) => value + 1)
          }
        })
      }
      return h(
        React.Fragment,
        null,
        h('style', { key: 'reminder-css' }, REMINDER_CSS),
        h(
          'div',
          {
            key: 'reminder',
            role: 'status',
            className: 'dsh-handitoff-reminder',
            style: REMINDER_STYLE.wrap,
            'data-dsh-handitoff-reminder': '',
          },
          h('span', { style: REMINDER_STYLE.text }, t.reminder(steps)),
          h(
            'div',
            { style: REMINDER_STYLE.actions },
            h(
              'button',
              { type: 'button', style: REMINDER_STYLE.postpone, disabled: handoff.busy, onClick: postpone },
              t.postpone,
            ),
            h(
              'button',
              { type: 'button', style: REMINDER_STYLE.handoff, disabled: handoff.busy, onClick: startHandoff },
              handoff.busy ? t.workingShort : t.handoffNow,
            ),
          ),
        ),
      )
    }

    const SETTINGS_STYLE = {
      page: { display: 'grid', gap: 16, padding: '4px 0 24px', color: 'var(--dsw-alias-label-primary, #e6e8ee)' },
      title: { margin: 0, fontSize: 22, fontWeight: 650, lineHeight: 1.3 },
      subtitle: { margin: '6px 0 0', fontSize: 13, color: 'var(--dsw-alias-label-secondary, #a8adba)', lineHeight: 1.6 },
      card: {
        display: 'grid',
        gap: 14,
        padding: '16px 18px',
        border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.12))',
        borderRadius: 12,
        background: 'var(--dsw-alias-bg-layer-1, rgba(255,255,255,.03))',
      },
      cardTitle: { margin: 0, fontSize: 15, fontWeight: 600 },
      field: { display: 'grid', gap: 5 },
      label: { fontSize: 13, fontWeight: 550 },
      hint: { fontSize: 12, color: 'var(--dsw-alias-label-secondary, #a8adba)', lineHeight: 1.5 },
      input: {
        boxSizing: 'border-box',
        width: '100%',
        padding: '8px 10px',
        border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.14))',
        borderRadius: 8,
        background: 'var(--dsw-alias-bg-layer-2, rgba(255,255,255,.05))',
        color: 'var(--dsw-alias-label-primary, #e6e8ee)',
        font: 'inherit',
        fontSize: 13,
      },
      actions: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
      primary: {
        padding: '7px 16px',
        border: '1px solid var(--dsw-alias-brand-primary, #4f7cff)',
        borderRadius: 8,
        background: 'var(--dsw-alias-brand-primary, #4f7cff)',
        color: '#fff',
        font: 'inherit',
        fontSize: 13,
        fontWeight: 550,
        cursor: 'pointer',
      },
      secondary: {
        padding: '7px 14px',
        border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.14))',
        borderRadius: 8,
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary, #e6e8ee)',
        font: 'inherit',
        fontSize: 13,
        cursor: 'pointer',
      },
      success: { fontSize: 12, color: 'var(--dsw-alias-state-success-primary, #30a46c)' },
      error: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary, #e5484d)' },
    }

    function SettingsSection({ ctx }) {
      const locale = useLocale(ctx)
      const t = settingsText(locale)
      const [loaded, setLoaded] = React.useState(false)
      const [writable, setWritable] = React.useState(false)
      const [view, setView] = React.useState(undefined)
      const [draft, setDraft] = React.useState(undefined)
      const [message, setMessage] = React.useState(undefined)
      const [saving, setSaving] = React.useState(false)

      const load = React.useCallback(async () => {
        try {
          const result = await ctx.remote.settings.describe()
          if (!result.ok) throw new Error(result.error.message)
          const found = findSettingsNamespace(result.value.namespaces)
          setWritable(result.value.writable)
          setView(found)
          setDraft(resolveSettings(found?.value))
        } catch (error) {
          setMessage({ kind: 'error', text: `${t.loadError}${error.message}` })
        } finally {
          setLoaded(true)
        }
      }, [ctx, t.loadError])

      React.useEffect(() => {
        load()
        const off = ctx.remote.$on?.('settings/document-updated', (ns) => {
          if (
            ns === 'dsh-handitoff' ||
            ns === 'include:dsh-handitoff' ||
            ns === 'dsh-handoff' ||
            ns === 'include:dsh-handoff' ||
            ns === view?.ns
          ) load()
        })
        return () => {
          if (typeof off === 'function') off()
        }
      }, [ctx, load, view?.ns])

      const setValue = (key, value) => setDraft((previous) => ({ ...previous, [key]: value }))
      const disabled = !writable || view === undefined || draft === undefined || saving

      const save = async () => {
        if (draft === undefined || view === undefined) return
        const next = resolveSettings(draft)
        setSaving(true)
        try {
          const ops = SETTINGS_LABELS.map((key) => ({ op: 'set', path: [key], value: next[key] }))
          const result = await ctx.remote.settings.mutate(view.ns, ops, view.revision)
          if (!result.ok) throw new Error(result.error.message)
          setMessage({ kind: 'ok', text: t.saved })
          await load()
        } catch (error) {
          setMessage({ kind: 'error', text: `${t.saveError}${error.message}` })
        } finally {
          setSaving(false)
        }
      }

      if (!loaded) return h('div', { style: SETTINGS_STYLE.page }, t.loading)
      return h(
        'div',
        { style: SETTINGS_STYLE.page },
        h('div', null, h('h2', { style: SETTINGS_STYLE.title }, t.title), h('p', { style: SETTINGS_STYLE.subtitle }, t.subtitle)),
        view === undefined ? h('div', { style: SETTINGS_STYLE.error }, t.missing) : null,
        !writable ? h('div', { style: SETTINGS_STYLE.error }, t.readonly) : null,
        draft === undefined
          ? null
          : [
              h(
                'section',
                { key: 'basic', style: SETTINGS_STYLE.card },
                h('h3', { style: SETTINGS_STYLE.cardTitle }, t.basic),
                h(
                  'div',
                  { style: SETTINGS_STYLE.field },
                  h('span', { style: SETTINGS_STYLE.label }, t.language),
                  h(
                    'select',
                    {
                      value: draft.language,
                      disabled,
                      onChange: (event) => setValue('language', event.target.value),
                      style: SETTINGS_STYLE.input,
                    },
                    h('option', { value: 'zh' }, '中文'),
                    h('option', { value: 'en' }, 'English'),
                  ),
                  h('span', { style: SETTINGS_STYLE.hint }, t.languageHint),
                ),
              ),
              h(
                'section',
                { key: 'reminders', style: SETTINGS_STYLE.card },
                h('h3', { style: SETTINGS_STYLE.cardTitle }, t.reminders),
                numberField(t.remindAfterSteps, draft.remindAfterSteps, 1, 1, t, (value) => setValue('remindAfterSteps', value), disabled),
                numberField(t.remindEverySteps, draft.remindEverySteps, 1, 1, t, (value) => setValue('remindEverySteps', value), disabled),
              ),
              h(
                'section',
                { key: 'storage', style: SETTINGS_STYLE.card },
                h('h3', { style: SETTINGS_STYLE.cardTitle }, t.storage),
                numberField(t.retentionDays, draft.retentionDays, 0, 0.5, t, (value) => setValue('retentionDays', value), disabled, t.retentionHint),
                numberField(t.recentRounds, draft.recentRounds, 0, 1, t, (value) => setValue('recentRounds', value), disabled, t.recentRoundsHint),
              ),
              h(
                'div',
                { key: 'actions', style: SETTINGS_STYLE.actions },
                h('button', { type: 'button', disabled, onClick: save, style: SETTINGS_STYLE.primary }, saving ? t.saving : t.save),
                h(
                  'button',
                  {
                    type: 'button',
                    disabled,
                    onClick: () => {
                      setDraft(resolveSettings(SETTINGS_DEFAULTS))
                      setMessage(undefined)
                    },
                    style: SETTINGS_STYLE.secondary,
                  },
                  t.reset,
                ),
                message === undefined
                  ? null
                  : h('span', { style: message.kind === 'ok' ? SETTINGS_STYLE.success : SETTINGS_STYLE.error }, message.text),
              ),
            ],
      )
    }

    function numberField(label, value, min, step, t, onChange, disabled, hint) {
      return h(
        'div',
        { style: SETTINGS_STYLE.field },
        h('span', { style: SETTINGS_STYLE.label }, label),
        h('input', {
          type: 'number',
          value,
          min,
          step,
          disabled,
          onChange: (event) => onChange(event.target.value),
          style: SETTINGS_STYLE.input,
        }),
        hint === undefined ? null : h('span', { style: SETTINGS_STYLE.hint }, hint),
      )
    }

    const toastStore = { state: { visible: false, text: '', tone: 'info', id: 0 }, listeners: new Set(), timer: null }

    function notifyToast(next, autoHideMs) {
      toastStore.state = { ...next, id: toastStore.state.id + 1 }
      for (const listener of toastStore.listeners) listener()
      if (toastStore.timer !== null) clearTimeout(toastStore.timer)
      toastStore.timer = null
      if (autoHideMs > 0) {
        toastStore.timer = setTimeout(() => {
          toastStore.state = { ...toastStore.state, visible: false, id: toastStore.state.id + 1 }
          for (const listener of toastStore.listeners) listener()
        }, autoHideMs)
      }
    }

    function pushToast(text, tone = 'info', autoHideMs = 0) {
      notifyToast({ visible: true, text, tone }, autoHideMs)
    }

    function useToast() {
      return React.useSyncExternalStore(
        (listener) => {
          toastStore.listeners.add(listener)
          return () => toastStore.listeners.delete(listener)
        },
        () => toastStore.state,
        () => toastStore.state,
      )
    }

    const activeSessions = new Set()
    let pluginCtx = null

    function HandoffIcon({ size = 16 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2.2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('rect', { x: 2.5, y: 3, width: 11, height: 13, rx: 2.8 }),
        h('rect', { x: 10.5, y: 8, width: 11, height: 13, rx: 2.8 }),
      )
    }

    function Toast() {
      const state = useToast()
      if (!state.visible) return null
      const color =
        state.tone === 'error'
          ? 'var(--dsw-alias-state-error-primary, #e5484d)'
          : state.tone === 'success'
            ? 'var(--dsw-alias-state-success-primary, #30a46c)'
            : 'var(--dsw-alias-brand-primary, #4f7cff)'
      return h(
        'div',
        {
          role: 'status',
          'aria-live': 'polite',
          style: {
            position: 'fixed',
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            zIndex: 2147483000,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            maxWidth: 'min(620px, calc(100vw - 32px))',
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.14))',
            background: 'var(--dsw-alias-bg-overlay, #1f2430)',
            color: 'var(--dsw-alias-label-primary, #e6e8ee)',
            boxShadow: '0 8px 28px rgba(0,0,0,.28)',
            fontSize: 13,
            lineHeight: 1.5,
            pointerEvents: 'none',
          },
        },
        h('span', { style: { color, marginTop: 1 } }, '●'),
        h('span', null, state.text),
      )
    }

    function useLocale(ctx) {
      return React.useSyncExternalStore(
        (listener) => ctx.locale.subscribe(listener),
        () => ctx.locale.getSnapshot(),
        () => ctx.locale.getSnapshot(),
      )
    }

    function strings(locale) {
      return String(locale?.active ?? '').toLowerCase().startsWith('en') ? TEXT.en : TEXT.zh
    }

    function useWorkspaceForSession(useWorkspaces, sessionId) {
      const snapshot = useWorkspaces((state) => state)
      return snapshot?.items?.find((workspace) => Array.isArray(workspace?.sessionIds) && workspace.sessionIds.includes(sessionId))
    }

    /**
     * The command round trip may report its outcome as the result itself, as
     * `{ result }`, or as `{ value: { result } }` depending on the client half
     * that carries it. Normalize that here so a failed command is never silent.
     */
    function commandFailure(outcome) {
      if (outcome === null || typeof outcome !== 'object') return null
      const inner = outcome.result ?? outcome.value?.result ?? outcome.value ?? outcome
      return inner?.kind === 'error' ? String(inner.text ?? 'command failed') : null
    }

    /**
     * `session.command()` resolves to the dispatch ack (`{ ok: true, value:
     * { matched: true } }`), not the handler's own result, so a failed
     * `/handitoff resume` looks exactly like a successful one. The only
     * reliable signal is the model turn the `--wake` handler starts.
     */
    async function waitForTurnStart(sessionFace, timeoutMs) {
      const startedAt = Date.now()
      while (Date.now() - startedAt < timeoutMs) {
        if (sessionFace.getSnapshot()?.running === true) return true
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      return sessionFace.getSnapshot()?.running === true
    }

    const HANDOFF_INDEX_PATH = '.dsh/dsh-handitoff/index.json'
    const ASK_WAIT_MS = 10 * 60_000
    const ASK_POLL_MS = 700
    /** Host and browser clocks may differ by a few ms on one machine. */
    const ASK_CLOCK_TOLERANCE_MS = 2_000

    /**
     * The newest confirmation result the task index records for this Session at
     * or after `sinceMs`. `/handitoff ask-supplement` writes
     * `askAt`/`askOutcome` before its handler returns, so this parses one task
     * row and nothing else.
     */
    function pickAskOutcome(indexText, sinceMs, sessionId) {
      let parsed
      try {
        parsed = JSON.parse(String(indexText ?? '').replace(/^\uFEFF/, ''))
      } catch {
        return undefined
      }
      const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : []
      let picked
      for (const task of tasks) {
        if (task === null || typeof task !== 'object') continue
        const owned =
          task.sourceSessionId === sessionId ||
          (Array.isArray(task.resumedBy) && task.resumedBy.includes(sessionId))
        if (!owned) continue
        const askAt = Number(task.askAt)
        if (!Number.isFinite(askAt) || askAt < sinceMs) continue
        if (picked !== undefined && askAt <= picked.askAt) continue
        picked = {
          askAt,
          outcome: typeof task.askOutcome === 'string' ? task.askOutcome : '',
          taskId: typeof task.taskId === 'string' ? task.taskId : '',
        }
      }
      return picked
    }

    /**
     * Wait for the Host to record the confirmation card's answer in the task
     * index. The card's answer travels back to the Host only, and the forwarded
     * Remote event allowlist carries no plugin event, so the index file is the
     * one Client-readable proof of what the user chose.
     *
     * @returns the recorded answer, `{ unavailable: true }` when this build has
     *   no workspace-file Remote, or undefined when the wait times out.
     */
    async function waitForAskOutcome(ctx, sessionId, sinceMs) {
      // `ctx.get` reads a service without an injection declaration, so a build
      // without the workspace-file Remote degrades to "cannot observe" instead
      // of parking the whole plugin.
      let remote
      try {
        remote = typeof ctx?.get === 'function' ? ctx.get('remote.workspaceFiles') : undefined
      } catch {
        remote = undefined
      }
      if (remote === undefined) {
        try {
          remote = ctx?.remote?.workspaceFiles
        } catch {
          remote = undefined
        }
      }
      if (remote === null || remote === undefined || typeof remote.read !== 'function') {
        return { unavailable: true }
      }
      const deadline = Date.now() + ASK_WAIT_MS
      while (Date.now() < deadline) {
        try {
          const result = await remote.read(sessionId, HANDOFF_INDEX_PATH, {}, new AbortController().signal)
          if (result?.ok === true) {
            const picked = pickAskOutcome(result.value?.text, sinceMs - ASK_CLOCK_TOLERANCE_MS, sessionId)
            if (picked !== undefined) return picked
          }
        } catch {
          // The index appears with the first handoff task; keep waiting.
        }
        await new Promise((resolve) => setTimeout(resolve, ASK_POLL_MS))
      }
      return undefined
    }

    function useHandoffAction(ctx, sessionId, workspace) {
      const locale = useLocale(ctx)
      const t = strings(locale)
      const [busy, setBusy] = React.useState(false)

      const run = async () => {
        if (busy || activeSessions.has(sessionId)) return
        if (!workspace || typeof workspace.workspaceId !== 'string') {
          pushToast(t.noWorkspace, 'error', 8000)
          return
        }
        const snapshot = ctx.sessions.list.getSnapshot()
        if (snapshot.byId?.[sessionId]?.blank === true) {
          pushToast(t.blank, 'error', 8000)
          return
        }

        activeSessions.add(sessionId)
        setBusy(true)
        let cancelled = false
        try {
          pushToast(t.writing, 'info')
          await ctx.sessions.using(sessionId, { source: 'controllerOperation' }, async (reference) => {
            const result = await reference.binding.session.command('/handitoff')
            const failure = commandFailure(result)
            if (failure !== null) throw new Error(failure)

            // Wait for the old Session's model to finish writing HANDOFF.md
            // before opening the new Session, so it never reads a missing or
            // half-written document. Give the turn 10s to start, then up to 4min.
            const sessionFace = reference.binding.session
            const startedAt = Date.now()
            // If a turn was already running, wait for it to end, then wait for
            // the queued handoff turn to start and finish. If idle, wait for the
            // handoff turn directly.
            let phase = sessionFace.getSnapshot().running === true ? 'idle' : 'start'
            let handoffStarted = false
            while (Date.now() - startedAt < 240_000) {
              const running = sessionFace.getSnapshot().running === true
              if (phase === 'idle') {
                if (!running) phase = 'start'
              } else if (phase === 'start') {
                if (running) {
                  phase = 'finish'
                  handoffStarted = true
                } else if (Date.now() - startedAt > 10_000) break
              } else if (phase === 'finish' && !running) {
                break
              }
              await new Promise((resolve) => setTimeout(resolve, 250))
            }
            if (!handoffStarted) throw new Error(t.writingFailed)

            const appended = await sessionFace.command('/handitoff append-recent')
            const appendFailure = commandFailure(appended)
            if (appendFailure !== null) throw new Error(appendFailure)

            const askedAt = Date.now()
            const asked = await sessionFace.command('/handitoff ask-supplement')
            const askFailure = commandFailure(asked)
            if (askFailure !== null) throw new Error(askFailure)

            // The card's answer returns to the Host only; wait for the Host to
            // record it in the task index before opening the new Session.
            pushToast(t.awaiting, 'info', 4000)
            const ask = await waitForAskOutcome(ctx, sessionId, askedAt)
            if (ask === undefined) throw new Error(t.askTimeout)
            if (ask.unavailable !== true && ask.outcome === 'cancelled') {
              cancelled = true
              return
            }
          })

          if (cancelled) {
            handoffCancelledSessions.add(sessionId)
            pushToast(t.cancelled, 'info', 4000)
            return
          }

          pushToast(t.creating, 'info')
          const newSessionId = await ctx.uiWorkspace.connectWorkspace(workspace.workspaceId)

          pushToast(t.starting, 'info')
          let resumeWarning = ''
          await ctx.sessions.using(newSessionId, { source: 'controllerOperation' }, async (reference) => {
            // `--wake` injects the brief and starts the model turn from the
            // command handler, so the first visible input is the collapsed
            // command result instead of a long user prompt.
            // `--latest` targets the task this flow just wrote.
            const newSessionFace = reference.binding.session
            try {
              const resumed = await newSessionFace.command('/handitoff resume --latest --wake')
              resumeWarning = commandFailure(resumed) ?? ''
            } catch (error) {
              resumeWarning = error instanceof Error ? error.message : String(error)
            }
            // A dispatch ack cannot report a handler failure, so an accepted but
            // failed resume is detected by the missing model turn instead.
            if (resumeWarning.length === 0 && !(await waitForTurnStart(newSessionFace, 12_000))) {
              resumeWarning = t.resumeNoTurn
            }
            if (resumeWarning.length > 0) {
              // Fallback only when the command could not wake the model.
              const result = await newSessionFace.prompt(
                [{ type: 'text', text: t.prompt(workspace.path ?? '') }],
                'queue',
              )
              if (result?.ok === false) throw new Error(result.error?.message ?? 'prompt failed')
            }
          })

          ctx.uiWorkspace.openSession(newSessionId)
          if (resumeWarning.length > 0) {
            pushToast(`${t.done}；${t.resumeWarn}: ${resumeWarning}`, 'error', 10000)
          } else {
            pushToast(t.done, 'success', 5000)
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          pushToast(`${t.error}: ${message}`, 'error', 10000)
        } finally {
          activeSessions.delete(sessionId)
          setBusy(false)
        }
      }

      return { busy, run, t }
    }

    function MenuItem({ sessionId, useWorkspaces, useMenuOpenState }) {
      const workspace = useWorkspaceForSession(useWorkspaces, sessionId)
      const { busy, run, t } = useHandoffAction(pluginCtx, sessionId, workspace)
      const [, setMenuOpen] = useMenuOpenState()
      const [hover, setHover] = React.useState(false)
      if (!workspace) return null
      const start = () => {
        setMenuOpen(false)
        run()
      }
      return h(
        'button',
        {
          type: 'button',
          role: 'menuitem',
          tabIndex: 0,
          disabled: busy,
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              start()
            }
          },
          onClick: start,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            minHeight: 32,
            padding: '6px 10px',
            border: 0,
            borderRadius: 6,
            background: hover && !busy ? 'var(--dsw-alias-bg-layer-2, rgba(255,255,255,.08))' : 'transparent',
            color: 'var(--dsw-alias-label-primary, #e6e8ee)',
            font: 'inherit',
            fontSize: 13,
            textAlign: 'left',
            cursor: 'pointer',
            opacity: busy ? 0.6 : 1,
          },
        },
        h(HandoffIcon, { size: 14 }),
        h('span', null, busy ? t.workingShort : t.action),
      )
    }

    return {
      inject: ['slots', 'sessions', 'uiWorkspace', 'locale', 'remote', 'remote.settings'],
      apply(ctx) {
        pluginCtx = ctx
        ctx.effect(
          () => () => {
            if (toastStore.timer !== null) clearTimeout(toastStore.timer)
          },
          'dsh-handitoff toast timer',
        )
        ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
          ctx.slots.register({ name: 'sidebar.workspaces.session.menu.item', id: 'dsh-handitoff', order: 350 }, MenuItem),
        )
        ctx.slots.inject('conversation.input.dock', () =>
          ctx.slots.register(
            { name: 'conversation.input.dock', id: 'dsh-handitoff-reminder', order: 400 },
            ReminderCard,
          ),
        )
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register({ name: 'shell.overlay', id: 'dsh-handitoff-toast', order: 1000 }, Toast),
        )
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            { name: 'settings.section', id: 'dsh-handitoff', order: 63, label: () => 'Handitoff' },
            () => h(SettingsSection, { ctx }),
          ),
        )
      },
    }
  },
})
