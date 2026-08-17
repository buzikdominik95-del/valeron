<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAccountStore } from '@/stores/account.store'
import { useSupportModal } from '@/composables/useSupportModal'

const account = useAccountStore()
const { supportUnreadCount } = storeToRefs(account)
const supportModal = useSupportModal()

const hasUnread = computed(() => supportUnreadCount.value > 0)
const badgeText = computed(() => (supportUnreadCount.value > 9 ? '9+' : String(supportUnreadCount.value)))

const supportImageBroken = ref(false)
const supportImageSrc = computed(() => `${import.meta.env.BASE_URL}img/supp/support.png?v=20260817-1801`)

function onSupportImageError(): void {
  supportImageBroken.value = true
}

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
      <img
        v-if="!supportImageBroken"
        class="vel-support-fab__image"
        :src="supportImageSrc"
        alt=""
        @error="onSupportImageError"
      />
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
  inset-block-end: calc(var(--vel-tabbar-h, 4rem) + var(--vel-tabbar-gap, 0.4rem) + env(safe-area-inset-bottom) + 1.42rem);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 4.02rem;
  block-size: 4.02rem;
  border: 0;
  border-radius: 999px;
  overflow: visible;
  background: transparent;
  color: var(--color-accent-ink);
  box-shadow:
    0 0.75rem 1.45rem color-mix(in oklab, var(--color-fg) 28%, transparent),
    0 0 0.85rem color-mix(in oklab, var(--color-accent) 38%, transparent),
    0 0 1.7rem color-mix(in oklab, var(--color-accent-deep) 30%, transparent);
  animation: vel-support-fab-float 3.2s ease-in-out infinite;
}

.vel-support-fab::before {
  content: '';
  position: absolute;
  inset: -35%;
  background: linear-gradient(
    120deg,
    transparent 35%,
    color-mix(in oklab, #fff 82%, transparent) 50%,
    transparent 65%
  );
  opacity: 0;
  transform: translateX(-135%) rotate(18deg);
  animation: vel-support-fab-shine 4.8s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

.vel-support-fab::after {
  content: '';
  position: absolute;
  inset: -24%;
  border-radius: 999px;
  background:
    radial-gradient(35% 28% at 26% 58%, color-mix(in oklab, #fff 52%, transparent), transparent 72%),
    radial-gradient(40% 30% at 52% 46%, color-mix(in oklab, #fff 44%, transparent), transparent 74%),
    radial-gradient(33% 26% at 74% 62%, color-mix(in oklab, #fff 38%, transparent), transparent 72%);
  filter: blur(5px);
  opacity: 0.5;
  transform: translate3d(0, 0, 0) scale(1);
  animation: vel-support-fab-cloud 4.2s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

.vel-support-fab__icon {
  position: absolute;
  inset: 0;
  display: block;
  border-radius: inherit;
  border: 1.5px solid #166534;
  box-shadow: 0 0 0 1px color-mix(in oklab, #22c55e 35%, transparent);
  overflow: hidden;
  z-index: 1;
}

.vel-support-fab__image {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  border-radius: inherit;
  border: 1.5px solid #166534;
  box-shadow: 0 0 0 1px color-mix(in oklab, #22c55e 35%, transparent);
}

.vel-support-fab__icon svg {
  inline-size: 100%;
  block-size: 100%;
  padding: 0.8rem;
}

.vel-support-fab__badge {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  transform: translate(42%, -42%);
  z-index: 3;
  min-inline-size: 1.22rem;
  padding: 0.08rem 0.34rem;
  border-radius: 999px;
  background-color: #16a34a;
  color: var(--color-accent-ink);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.15;
  box-shadow: 0 0 0 2px #166534;
}

.vel-support-fab--alert {
  animation:
    vel-support-fab-float 3.2s ease-in-out infinite,
    vel-support-fab-pulse 0.95s ease-in-out infinite;
}

@keyframes vel-support-fab-float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }

  25%,
  35% {
    transform: translateY(-0.34rem) rotate(1.2deg);
  }

  75% {
    transform: translateY(-0.14rem) rotate(-1.2deg);
  }
}

@keyframes vel-support-fab-shine {
  0%,
  72%,
  100% {
    opacity: 0;
    transform: translateX(-135%) rotate(18deg);
  }

  78% {
    opacity: 0.38;
  }

  88% {
    opacity: 0.6;
    transform: translateX(135%) rotate(18deg);
  }
}

@keyframes vel-support-fab-pulse {
  0%,
  100% {
    box-shadow:
      0 0.7rem 1.35rem color-mix(in oklab, var(--color-fg) 26%, transparent),
      0 0 0 0 color-mix(in oklab, #22c55e 58%, transparent);
  }

  50% {
    box-shadow:
      0 0.8rem 1.5rem color-mix(in oklab, var(--color-fg) 30%, transparent),
      0 0 0 0.85rem color-mix(in oklab, #22c55e 0%, transparent);
  }
}

@keyframes vel-support-fab-cloud {
  0%,
  100% {
    opacity: 0.24;
    transform: translate3d(-3%, 2%, 0) scale(0.98);
  }

  35% {
    opacity: 0.38;
    transform: translate3d(2%, -3%, 0) scale(1.03);
  }

  68% {
    opacity: 0.3;
    transform: translate3d(4%, 1%, 0) scale(1.01);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-support-fab {
    animation: none;
  }

  .vel-support-fab::before {
    animation: none;
  }

  .vel-support-fab::after {
    animation: none;
  }

  .vel-support-fab--alert {
    animation: none;
  }
}
</style>
