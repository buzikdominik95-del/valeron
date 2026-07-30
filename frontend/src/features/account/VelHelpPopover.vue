<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'
import { useTemplateRef } from 'vue'

/**
 * Мини-сообщение у «?» — fixed + Teleport, чтобы не клипалось
 * overflow dialog/drawer на мобилке.
 */
const open = defineModel<boolean>('open', { default: false })

defineProps<{
  bodyHtml: string
}>()

const panel = useTemplateRef<HTMLElement>('panel')
const pos = ref<Record<string, string>>({})

function close(): void {
  open.value = false
}

function place(): void {
  const el = panel.value
  if (!el) return

  /* якорь: span.vel-cdraw__help-anchor / method-wrap — parent пока popover был inline;
     после Teleport parent = body, поэтому ищем [data-help-anchor] near last focus
     или element with data-vel-help-open */
  const anchor =
    document.querySelector<HTMLElement>('[data-vel-help-anchor="open"]') ??
    document.querySelector<HTMLElement>('[data-vel-help-anchor]')

  const margin = 12
  const width = Math.min(300, window.innerWidth - margin * 2)
  let left = (window.innerWidth - width) / 2
  let top = margin + 48

  if (anchor) {
    const r = anchor.getBoundingClientRect()
    left = r.left + r.width / 2 - width / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin))
    top = r.bottom + 8
    const h = el.offsetHeight || 180
    if (top + h > window.innerHeight - margin) {
      top = Math.max(margin, r.top - h - 8)
    }
  } else {
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin))
  }

  pos.value = {
    position: 'fixed',
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${Math.round(width)}px`,
    zIndex: '10050',
    transform: 'none',
  }
}

watch(open, async (isOpen) => {
  if (!isOpen) {
    pos.value = {}
    return
  }
  await nextTick()
  place()
  /* второй кадр — после layout body height */
  requestAnimationFrame(() => place())
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

onClickOutside(panel, () => {
  if (open.value) open.value = false
})

onUnmounted(() => {
  pos.value = {}
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="panel"
      class="vel-help-pop"
      role="dialog"
      aria-modal="false"
      :style="pos"
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
