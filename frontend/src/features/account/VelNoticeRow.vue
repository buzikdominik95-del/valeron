<script setup lang="ts">
import type { NoticeTone } from '@/features/account/notice-kinds'

/**
 * Строка уведомления: клик ведёт в нужный раздел (Documenti / Assistenza).
 */
defineProps<{
  tone: NoticeTone
  title: string
  body: string
  /** ISO-8601 — для атрибута datetime. */
  at: string
  /** Короткое время на экран. */
  time: string
  /** Полная отметка — голосом. */
  stamp: string
  /** Непрочитанное — чуть сильнее фон. */
  unread?: boolean
}>()

const emit = defineEmits<{
  open: []
}>()
</script>

<template>
  <li class="vel-notices__item" :class="[`vel-notices__item--${tone}`, { 'vel-notices__item--unread': unread }]">
    <button type="button" class="vel-notices__hit" @click="emit('open')">
      <span class="vel-notices__dot" aria-hidden="true"></span>

      <span class="vel-notices__text">
        <span class="vel-notices__name">{{ title }}</span>
        <span class="vel-notices__body">{{ body }}</span>
        <time :datetime="at" class="vel-notices__time vel-num">
          {{ time }}
          <span class="sr-only">{{ stamp }}</span>
        </time>
      </span>
    </button>
  </li>
</template>

<style scoped>
.vel-notices__item {
  list-style: none;
  margin: 0;
  padding: 0;
  border-radius: var(--radius-control);
}

.vel-notices__item + .vel-notices__item {
  border-block-start: 1px solid var(--color-line);
}

.vel-notices__hit {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 0.6rem;
  margin: 0;
  padding: 0.55rem 0.6rem;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: background-color 140ms ease;
}

.vel-notices__hit:hover {
  background-color: var(--color-raised);
}

.vel-notices__hit:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.vel-notices__item--unread .vel-notices__hit {
  background-color: color-mix(in oklab, var(--color-accent) 6%, transparent);
}

.vel-notices__dot {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  flex: 0 0 auto;
  margin-block-start: 0.4rem;
  border-radius: var(--radius-round);
  background-color: var(--color-accent);
}

.vel-notices__item--done .vel-notices__dot {
  background-color: var(--color-success);
}

.vel-notices__text {
  display: flex;
  min-inline-size: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.1rem;
}

.vel-notices__name {
  color: var(--color-fg);
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.25;
}

.vel-notices__body {
  color: var(--color-muted);
  font-size: 0.78rem;
  line-height: 1.4;
}

.vel-notices__time {
  color: var(--color-faint);
  font-size: 0.7rem;
}
</style>
