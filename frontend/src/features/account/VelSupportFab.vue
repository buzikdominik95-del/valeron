<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAccountStore } from '@/stores/account.store'
import { useSupportModal } from '@/composables/useSupportModal'

const account = useAccountStore()
const { supportUnreadCount } = storeToRefs(account)
const supportModal = useSupportModal()

const hasUnread = computed(() => supportUnreadCount.value > 0)
const badgeText = computed(() => (supportUnreadCount.value > 9 ? '9+' : String(supportUnreadCount.value)))

function openSupport(): void {
  supportModal.show()
}
</script>

<template>
  <button
    v-if="!supportModal.open.value"
    type="button"
    class="vel-support-fab"
    :class="{ 'vel-support-fab--alert': hasUnread }"
    aria-label="Apri chat assistenza"
    @click="openSupport"
  >
    <span class="vel-support-fab__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3.5 5.5h12v8h-7l-5 3.5z" />
        <path d="M8.5 16.5v1h6l4 2.5v-3.5h2v-7h-2" />
      </svg>
    </span>

    <span v-if="hasUnread" class="vel-support-fab__badge vel-num" aria-hidden="true">{{ badgeText }}</span>
  </button>
</template>

<style scoped>
.vel-support-fab {
  position: fixed;
  z-index: 55;
  inset-inline-end: max(0.9rem, env(safe-area-inset-right));
  inset-block-end: calc(var(--vel-tabbar-h, 4rem) + var(--vel-tabbar-gap, 0.4rem) + env(safe-area-inset-bottom) + 0.75rem);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 3.35rem;
  block-size: 3.35rem;
  border: 0;
  border-radius: 999px;
  background: var(--color-accent-deep);
  color: var(--color-accent-ink);
  box-shadow: 0 0.7rem 1.35rem color-mix(in oklab, var(--color-fg) 26%, transparent);
}

.vel-support-fab__icon {
  display: inline-flex;
}

.vel-support-fab__icon svg {
  width: 1.32rem;
  height: 1.32rem;
}

.vel-support-fab__badge {
  position: absolute;
  inset-block-start: 0.16rem;
  inset-inline-end: 0.12rem;
  min-inline-size: 1.22rem;
  padding: 0.08rem 0.34rem;
  border-radius: 999px;
  background-color: var(--color-danger);
  color: var(--color-accent-ink);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.15;
  box-shadow: 0 0 0 2px var(--color-accent-deep);
}

.vel-support-fab--alert {
  animation: vel-support-fab-pulse 0.95s ease-in-out infinite;
}

@keyframes vel-support-fab-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0.7rem 1.35rem color-mix(in oklab, var(--color-fg) 26%, transparent),
      0 0 0 0 color-mix(in oklab, var(--color-danger) 45%, transparent);
  }

  50% {
    transform: scale(1.06);
    box-shadow:
      0 0.8rem 1.5rem color-mix(in oklab, var(--color-fg) 30%, transparent),
      0 0 0 0.55rem color-mix(in oklab, var(--color-danger) 0%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-support-fab--alert {
    animation: none;
  }
}
</style>
