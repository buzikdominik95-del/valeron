import { ref } from 'vue'
import type { Ref } from 'vue'
import { createSharedComposable, useTimeoutFn } from '@vueuse/core'

/**
 * Toast «Nuovo messaggio» от консультанта / system.
 * Shared: useSupportChat (pushAgentMessage) и VelAccountFlow читают один open/kind.
 */

export type AgentToastKind = 'agent' | 'system' | 'welcome'

const AGENT_TOAST_MS = 7_000

export interface AgentNotifyApi {
  open: Ref<boolean>
  kind: Ref<AgentToastKind>
  show: (variant?: AgentToastKind) => void
  hide: () => void
}

function createAgentNotify(): AgentNotifyApi {
  const open = ref(false)
  const kind = ref<AgentToastKind>('agent')

  const { start: hideLater } = useTimeoutFn(
    () => {
      open.value = false
    },
    AGENT_TOAST_MS,
    { immediate: false },
  )

  function show(variant: AgentToastKind = 'agent'): void {
    kind.value = variant
    open.value = true
    hideLater()
  }

  function hide(): void {
    open.value = false
  }

  return { open, kind, show, hide }
}

export const useAgentNotify = createSharedComposable(createAgentNotify)
