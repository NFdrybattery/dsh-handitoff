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
        supplementTitle: '交接文档已生成',
        supplementQuestion: '是否还有其他补充？',
        supplementOption: '否，开始交接',
        supplementPlaceholder: '如需补充，请写在这里（可留空）',
        supplementNext: '下一步',
        supplementCancel: '取消',
        supplementCancelled: '已取消交接',
        supplementHeading: '## 交接前用户补充要求',
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
        supplementTitle: 'Handoff document generated',
        supplementQuestion: 'Anything else to add?',
        supplementOption: 'No, start handoff',
        supplementPlaceholder: 'Add anything the new Session should know (optional)',
        supplementNext: 'Next',
        supplementCancel: 'Cancel',
        supplementCancelled: 'Handoff cancelled',
        supplementHeading: '## User supplement before takeover',
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
        enabled: '启用插件',
        enabledHint: '关闭后不再注册命令和提醒；需要重新加载插件才生效。',
        language: '语言',
        languageHint: '当前影响接续摘要和唤醒消息；交接文档生成指令仍为中文。',
        remindAfterSteps: '首次提醒步数',
        remindEverySteps: '提醒间隔步数',
        remindAfterTokens: '上下文提醒 token',
        offHint: '0 = 关闭',
        retentionDays: '任务保留天数',
        retentionHint: '每次执行 /handitoff 时清理更早的任务；0 = 不清理，删除不可恢复。',
        recentRounds: '最近对话轮数',
        recentRoundsHint: '把最近几轮用户输入与助手回复原样抄进交接文档；0 = 不生成该节。',
        resumeBriefMaxChars: '摘要最大字符数',
        resumeHint: '只限制注入摘要，不影响模型读取完整 HANDOFF.md。',
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
        enabled: 'Enable plugin',
        enabledHint: 'When off, commands and reminders are not registered; reload the plugin to apply.',
        language: 'Language',
        languageHint: 'Currently affects the resume brief and wake message; the handoff instruction is still Chinese.',
        remindAfterSteps: 'First reminder (steps)',
        remindEverySteps: 'Reminder interval (steps)',
        remindAfterTokens: 'Context reminder (tokens)',
        offHint: '0 = off',
        retentionDays: 'Retention (days)',
        retentionHint: 'Cleans older tasks on each /handitoff; 0 = never, deletion is irreversible.',
        recentRounds: 'Recent rounds',
        recentRoundsHint: 'Recent user/assistant rounds copied verbatim into the handoff; 0 disables the section.',
        resumeBriefMaxChars: 'Maximum brief characters',
        resumeHint: 'Limits the injected brief only; the model still reads the full HANDOFF.md.',
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
      enabled: true,
      remindAfterSteps: 800,
      remindEverySteps: 200,
      remindAfterTokens: 120000,
      retentionDays: 1,
      recentRounds: 5,
      resumeBriefMaxChars: 2400,
      language: 'zh',
    }

    const SETTINGS_LABELS = [
      'remindAfterSteps',
      'remindEverySteps',
      'remindAfterTokens',
      'retentionDays',
      'recentRounds',
      'resumeBriefMaxChars',
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
        enabled: input.enabled !== false,
        remindAfterSteps: integer(input.remindAfterSteps, SETTINGS_DEFAULTS.remindAfterSteps, 1),
        remindEverySteps: integer(input.remindEverySteps, SETTINGS_DEFAULTS.remindEverySteps, 1),
        remindAfterTokens: integer(input.remindAfterTokens, SETTINGS_DEFAULTS.remindAfterTokens, 0),
        retentionDays:
          Number.isFinite(Number(input.retentionDays)) && Number(input.retentionDays) >= 0
            ? Number(input.retentionDays)
            : SETTINGS_DEFAULTS.retentionDays,
        recentRounds: integer(input.recentRounds, SETTINGS_DEFAULTS.recentRounds, 0),
        resumeBriefMaxChars: integer(input.resumeBriefMaxChars, SETTINGS_DEFAULTS.resumeBriefMaxChars, 200),
        language: input.language === 'en' ? 'en' : 'zh',
      }
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
      checkRow: { display: 'flex', alignItems: 'flex-start', gap: 9 },
      check: { marginTop: 3, accentColor: 'var(--dsw-alias-brand-primary, #4f7cff)' },
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
          const found =
            result.value.namespaces.find(
              (entry) =>
                entry.ns === 'dsh-handitoff' ||
                entry.ns === 'include:dsh-handitoff' ||
                entry.ns === 'dsh-handoff' ||
                entry.ns === 'include:dsh-handoff',
            ) ??
            result.value.namespaces.find((entry) => {
              const properties = entry.schema?.properties ?? {}
              return 'remindAfterSteps' in properties || 'recentRounds' in properties
            })
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
                numberField(t.remindAfterTokens, draft.remindAfterTokens, 0, 1000, t, (value) => setValue('remindAfterTokens', value), disabled, t.offHint),
              ),
              h(
                'section',
                { key: 'storage', style: SETTINGS_STYLE.card },
                h('h3', { style: SETTINGS_STYLE.cardTitle }, t.storage),
                numberField(t.retentionDays, draft.retentionDays, 0, 0.5, t, (value) => setValue('retentionDays', value), disabled, t.retentionHint),
                numberField(t.recentRounds, draft.recentRounds, 0, 1, t, (value) => setValue('recentRounds', value), disabled, t.recentRoundsHint),
                numberField(t.resumeBriefMaxChars, draft.resumeBriefMaxChars, 200, 100, t, (value) => setValue('resumeBriefMaxChars', value), disabled, t.resumeHint),
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

    const supplementStore = {
      state: { visible: false, id: 0 },
      listeners: new Set(),
      resolver: null,
    }

    function emitSupplement() {
      for (const listener of supplementStore.listeners) listener()
    }

    function askSupplement() {
      return new Promise((resolve) => {
        supplementStore.resolver = resolve
        supplementStore.state = { visible: true, id: supplementStore.state.id + 1 }
        emitSupplement()
      })
    }

    function settleSupplement(result) {
      const resolve = supplementStore.resolver
      supplementStore.resolver = null
      supplementStore.state = { ...supplementStore.state, visible: false, id: supplementStore.state.id + 1 }
      emitSupplement()
      if (typeof resolve === 'function') resolve(result)
    }

    function useSupplement() {
      return React.useSyncExternalStore(
        (listener) => {
          supplementStore.listeners.add(listener)
          return () => supplementStore.listeners.delete(listener)
        },
        () => supplementStore.state,
        () => supplementStore.state,
      )
    }

    function encodeSupplement(text) {
      const bytes = new TextEncoder().encode(String(text ?? ''))
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    }

    function SupplementDialog() {
      const state = useSupplement()
      const locale = useLocale(pluginCtx)
      const t = strings(locale)
      const [value, setValue] = React.useState('')
      React.useEffect(() => {
        if (state.visible) setValue('')
      }, [state.id, state.visible])
      if (!state.visible) return null
      return h(
        'div',
        {
          style: {
            position: 'fixed',
            inset: 0,
            zIndex: 2147482999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'rgba(0,0,0,.46)',
          },
        },
        h(
          'div',
          {
            role: 'dialog',
            'aria-modal': 'true',
            style: {
              width: 'min(520px, calc(100vw - 40px))',
              display: 'grid',
              gap: 14,
              padding: '20px 20px 16px',
              borderRadius: 14,
              border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.14))',
              background: 'var(--dsw-alias-bg-overlay, #1f2430)',
              color: 'var(--dsw-alias-label-primary, #e6e8ee)',
              boxShadow: '0 18px 60px rgba(0,0,0,.35)',
              fontSize: 13,
            },
          },
          h('h3', { style: { margin: 0, fontSize: 17, fontWeight: 650 } }, t.supplementTitle),
          h('p', { style: { margin: 0, color: 'var(--dsw-alias-label-secondary, #a8adba)', lineHeight: 1.6 } }, t.supplementQuestion),
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '10px 12px',
                borderRadius: 9,
                border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.14))',
                background: 'var(--dsw-alias-bg-secondary, rgba(255,255,255,.04))',
              },
            },
            h('span', {
              style: {
                width: 14,
                height: 14,
                borderRadius: 999,
                border: '1.5px solid var(--dsw-alias-state-success-primary, #30a46c)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
              },
            }, h('span', {
              style: { width: 7, height: 7, borderRadius: 999, background: 'var(--dsw-alias-state-success-primary, #30a46c)' },
            })),
            h('span', { style: { fontWeight: 600 } }, t.supplementOption),
          ),
          h('textarea', {
            value,
            rows: 4,
            autoFocus: true,
            placeholder: t.supplementPlaceholder,
            onChange: (event) => setValue(event.target.value),
            style: {
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
              minHeight: 92,
              padding: '10px 12px',
              borderRadius: 9,
              border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.14))',
              background: 'var(--dsw-alias-bg-primary, rgba(0,0,0,.18))',
              color: 'inherit',
              font: 'inherit',
              lineHeight: 1.55,
            },
          }),
          h(
            'div',
            { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
            h(
              'button',
              {
                type: 'button',
                onClick: () => settleSupplement({ cancelled: true }),
                style: {
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.14))',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  font: 'inherit',
                },
              },
              t.supplementCancel,
            ),
            h(
              'button',
              {
                type: 'button',
                onClick: () => settleSupplement({ cancelled: false, text: value }),
                style: {
                  padding: '7px 16px',
                  borderRadius: 8,
                  border: 0,
                  background: 'var(--dsw-alias-state-success-primary, #30a46c)',
                  color: '#fff',
                  cursor: 'pointer',
                  font: 'inherit',
                  fontWeight: 600,
                },
              },
              t.supplementNext,
            ),
          ),
        ),
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

    function supplementPayload(node, depth = 0, seen = new Set()) {
      if (depth > 8 || node === null || node === undefined) return null
      if (typeof node === 'string') {
        const text = node.trim()
        if (!text.startsWith('{') || !text.endsWith('}')) return null
        try {
          const parsed = JSON.parse(text)
          return parsed !== null && typeof parsed === 'object' ? supplementPayload(parsed, depth + 1, seen) : null
        } catch {
          return null
        }
      }
      if (typeof node !== 'object') return null
      if (seen.has(node)) return null
      seen.add(node)
      if (!Array.isArray(node) && (Object.hasOwn(node, 'supplement') || Object.hasOwn(node, 'cancelled'))) return node
      for (const value of Object.values(node)) {
        const found = supplementPayload(value, depth + 1, seen)
        if (found !== null) return found
      }
      return null
    }

    function supplementAnswer(outcome) {
      const parsed = supplementPayload(outcome)
      if (parsed !== null) {
        return {
          valid: parsed.cancelled === true || typeof parsed.supplement === 'string',
          cancelled: parsed.cancelled === true,
          supplement: typeof parsed.supplement === 'string' ? parsed.supplement : '',
        }
      }
      let raw = ''
      try {
        raw = JSON.stringify(outcome)
      } catch {
        raw = String(outcome)
      }
      return { valid: false, cancelled: false, supplement: '', raw: String(raw ?? '').slice(0, 300) }
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
        let supplement = ''
        let supplementCancelled = false
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
            while (Date.now() - startedAt < 240_000) {
              const running = sessionFace.getSnapshot().running === true
              if (phase === 'idle') {
                if (!running) phase = 'start'
              } else if (phase === 'start') {
                if (running) phase = 'finish'
                else if (Date.now() - startedAt > 10_000) break
              } else if (phase === 'finish' && !running) {
                break
              }
              await new Promise((resolve) => setTimeout(resolve, 250))
            }

            const appended = await sessionFace.command('/handitoff append-recent')
            const appendFailure = commandFailure(appended)
            if (appendFailure !== null) throw new Error(appendFailure)

            const asked = await sessionFace.command('/handitoff ask-supplement')
            const askFailure = commandFailure(asked)
            if (askFailure !== null) throw new Error(askFailure)
            const answer = supplementAnswer(asked)
            if (!answer.valid) {
              throw new Error(`交接前提问没有返回有效结果：${String(answer.raw ?? '').slice(0, 180)}`)
            }
            if (answer.cancelled) {
              supplementCancelled = true
              return
            }
            supplement = answer.supplement
          })

          if (supplementCancelled) {
            pushToast(t.supplementCancelled, 'info', 4000)
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
            try {
              const command =
                supplement.trim().length > 0
                  ? `/handitoff resume --latest --wake --supplement=${encodeSupplement(supplement)}`
                  : '/handitoff resume --latest --wake'
              const resumed = await reference.binding.session.command(command)
              resumeWarning = commandFailure(resumed) ?? ''
            } catch (error) {
              resumeWarning = error instanceof Error ? error.message : String(error)
            }
            if (resumeWarning.length > 0) {
              // Fallback only when the command could not wake the model.
              const fallback = supplement.trim().length > 0
                ? [t.prompt(workspace.path ?? ''), '', t.supplementHeading, supplement].join('\n')
                : t.prompt(workspace.path ?? '')
              const result = await reference.binding.session.prompt(
                [{ type: 'text', text: fallback }],
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
