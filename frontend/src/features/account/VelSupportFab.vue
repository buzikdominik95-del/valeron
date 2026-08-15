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
      <span v-if="hasUnread" class="vel-support-fab__badge vel-num" aria-hidden="true">{{ badgeText }}</span>
    </span>
    <span class="vel-support-fab__label">Assistenza</span>
  </button>
</template>

<style scoped>
.vel-support-fab {
  position: fixed;
  z-index: 1200;
  inset-inline-end: max(0.7rem, env(safe-area-inset-right));
  inset-block-end: calc(max(5.1rem, env(safe-area-inset-bottom) + 4.55rem));
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-block-size: 2.45rem;
  padding: 0.45rem 0.8rem;
  border: 0;
  border-radius: 999px;
  background: var(--color-accent-deep);
  color: var(--color-accent-ink);
  box-shadow: 0 0.5rem 1rem color-mix(in oklab, var(--color-fg) 20%, transparent);
}

.vel-support-fab__icon {
  position: relative;
  display: inline-flex;
}

.vel-support-fab__icon svg {
  width: 1rem;
  height: 1rem;
}

.vel-support-fab__label {
  font-size: 0.82rem;
  font-weight: 700;
}

.vel-support-fab__badge {
  position: absolute;
  inset-block-start: -0.42rem;
  inset-inline-end: -0.5rem;
  min-inline-size: 1.05rem;
  padding: 0.05rem 0.28rem;
  border-radius: 999px;
  background-color: var(--color-danger);
  color: var(--color-accent-ink);
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.2;
  box-shadow: 0 0 0 1.5px var(--color-accent-deep);
  animation: vel-support-fab-badge 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
}

.vel-support-fab--alert {
  animation: vel-support-fab-pulse 1.15s ease-in-out infinite;
}

@keyframes vel-support-fab-badge {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  35% {
    transform: translateY(-0.3rem) scale(1.2);
  }
  55% {
    transform: translateY(0.05rem) scale(0.95);
  }
}

@keyframes vel-support-fab-pulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-support-fab__badge,
  .vel-support-fab--alert {
    animation: none;
  }
}
</style>
