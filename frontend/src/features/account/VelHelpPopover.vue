<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'
import { useTemplateRef } from 'vue'

/**
 * Мини-сообщение у «?».
 * Teleport в открытый <dialog> (top layer) — иначе fixed на body
 * оказывается ПОД dialog.showModal() и «ничего не видно».
 */
const open = defineModel<boolean>('open', { default: false })

defineProps<{
  bodyHtml: string
}>()

const panel = useTemplateRef<HTMLElement>('panel')
const pos = ref<Record<string, string>>({})
/** куда телепортить: open dialog или body (fallback) */
const teleportTarget = ref<string | HTMLElement>('body')
/** не закрывать сразу после открытия (тот же click) */
let ignoreOutsideUntil = 0

function close(): void {
  open.value = false
}

function resolveTeleport(): HTMLElement | string {
  if (typeof document === 'undefined') return 'body'
  const openDlg =
    document.querySelector<HTMLElement>('dialog.vel-cdraw[open]') ??
    document.querySelector<HTMLElement>('dialog[open]')
  return openDlg ?? 'body'
}

function resolveAnchor(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return (
    document.querySelector<HTMLElement>('[data-vel-help-anchor="open"]') ??
    document.querySelector<HTMLElement>('[data-vel-help-anchor]')
  )
}

function place(): void {
  const el = panel.value
  if (!el) return

  const anchor = resolveAnchor()
  const margin = 12
  const gap = 8
  const width = Math.min(300, window.innerWidth - margin * 2)
  let left = (window.innerWidth - width) / 2
  let top = margin + 56

  if (anchor) {
    const r = anchor.getBoundingClientRect()
    const h = el.offsetHeight || 180

    /* Предпочитаем панель под «?», выровненную по правому краю якоря
       (угол amount-box / callout — «?» справа). */
    left = r.right - width
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin))

    top = r.bottom + gap
    if (top + h > window.innerHeight - margin) {
      top = Math.max(margin, r.top - h - gap)
    }
  }

  pos.value = {
    position: 'fixed',
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${Math.round(width)}px`,
    zIndex: '2147483646',
    transform: 'none',
  }
}

watch(open, async (isOpen) => {
  if (!isOpen) {
    pos.value = {}
    return
  }
  ignoreOutsideUntil = Date.now() + 280
  teleportTarget.value = resolveTeleport()
  await nextTick()
  place()
  requestAnimationFrame(() => {
    place()
    requestAnimationFrame(place)
  })
})

useEventListener(window, 'resize', () => {
  if (open.value) place()
})

useEventListener(
  window,
  'scroll',
  () => {
    if (open.value) place()
  },
  { capture: true, passive: true },
)

useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && open.value) open.value = false
})

onClickOutside(
  panel,
  () => {
    if (Date.now() < ignoreOutsideUntil) return
    if (open.value) open.value = false
  },
  {
    ignore: ['.vel-help-dot', '[data-vel-help-anchor]'],
  },
)

onUnmounted(() => {
  pos.value = {}
})

const teleportTo = computed(() => teleportTarget.value)
</script>

<template>
  <Teleport :to="teleportTo" :disabled="!open">
    <div
      v-if="open"
      ref="panel"
      class="vel-help-pop"
      role="dialog"
      aria-modal="false"
      :style="pos"
      @click.stop
    >
      <button type="button" class="vel-help-pop__x" aria-label="Close" @click="close">
        ×
      </button>
      <div class="vel-help-pop__body" v-html="bodyHtml" />
    </div>
  </Teleport>
</template>

<style scoped>
.vel-help-pop {
  position: fixed;
  box-sizing: border-box;
  max-width: calc(100vw - 1.5rem);
  padding: 0.85rem 1rem 0.9rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  box-shadow:
    0 0.65rem 1.6rem color-mix(in oklab, var(--color-fg) 14%, transparent),
    0 0 0 1px color-mix(in oklab, var(--color-fg) 4%, transparent);
  color: var(--color-muted);
  font-size: 0.8125rem;
  line-height: 1.5;
  text-align: left;
}

.vel-help-pop__x {
  position: absolute;
  top: 0.25rem;
  right: 0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--color-faint);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}

.vel-help-pop__x:hover {
  color: var(--color-fg);
  background: var(--color-raised);
}

.vel-help-pop__body {
  padding-inline-end: 0.9rem;
}

.vel-help-pop__body :deep(p) {
  margin: 0 0 0.55rem;
}

.vel-help-pop__body :deep(p:last-child) {
  margin-bottom: 0;
}

.vel-help-pop__body :deep(strong) {
  color: var(--color-fg);
  font-weight: 700;
}
</style>
