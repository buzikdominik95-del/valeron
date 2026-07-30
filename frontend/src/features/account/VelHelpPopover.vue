<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'
import { useTemplateRef } from 'vue'

/**
 * Мини-сообщение рядом с «?» (не modal).
 * bodyHtml — 1–2 абзаца; закрытие: × / outside / Escape.
 */
const open = defineModel<boolean>('open', { default: false })

defineProps<{
  bodyHtml: string
}>()

const root = useTemplateRef<HTMLElement>('root')

onClickOutside(root, () => {
  if (open.value) open.value = false
})

useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && open.value) open.value = false
})

function close(): void {
  open.value = false
}

let scrollParent: Element | null = null
function onScroll(): void {
  if (open.value) open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    scrollParent = root.value?.closest('.vel-cdraw, dialog') ?? null
    scrollParent?.addEventListener('scroll', onScroll, { passive: true })
  } else {
    scrollParent?.removeEventListener('scroll', onScroll)
    scrollParent = null
  }
})

onUnmounted(() => {
  scrollParent?.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div v-if="open" ref="root" class="vel-help-pop" role="dialog" aria-modal="false">
    <button type="button" class="vel-help-pop__x" aria-label="Close" @click="close">
      ×
    </button>
    <div class="vel-help-pop__body" v-html="bodyHtml" />
  </div>
</template>

<style scoped>
.vel-help-pop {
  position: absolute;
  z-index: 40;
  top: calc(100% + 0.4rem);
  left: 50%;
  transform: translateX(-50%);
  width: min(18.5rem, calc(100vw - 2.5rem));
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
