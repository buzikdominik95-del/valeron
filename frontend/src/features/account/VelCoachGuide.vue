<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { accountStepHref } from '@/features/account/account-anchors'
import type { AccountStep } from '@/stores/account.store'

/**
 * Стрелки-инструкция при первом заходе, пока сетап-шаги не закрыты.
 * Подсказывает куда: документы → подпись (IBAN+firma).
 */
const { t } = useI18n()
const { steps, allDone } = useAccount()
const account = useAccountStore()
const { select: selectTab } = useCabinetTab()

const visible = ref(false)

onMounted(() => {
  if (allDone.value || account.coachSeen) return
  visible.value = true
})

const nextAction = computed(() => {
  const pending = steps.value.find((s) => s.status !== 'done' && s.needsAction)
  if (!pending) return null
  return pending.id as AccountStep
})

const tip = computed(() => {
  const id = nextAction.value
  if (!id) return t('account.coach.done')
  return t(`account.coach.tips.${id}`)
})

const tipTitle = computed(() => t('account.coach.title'))

function go(): void {
  const id = nextAction.value
  account.markCoachSeen()
  visible.value = false
  if (id === 'documents') {
    selectTab('documents')
    return
  }
  if (id === 'signature') {
    selectTab('documents')
    const href = accountStepHref('signature')
    if (href?.startsWith('#')) {
      requestAnimationFrame(() => document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }))
    }
    return
  }
  if (id === 'approval' || id === 'simulation' || id === 'account') {
    selectTab('home')
  }
}

function dismiss(): void {
  account.markCoachSeen()
  visible.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="vel-coach">
      <div
        v-if="visible && !allDone"
        class="vel-coach"
        role="dialog"
        aria-modal="false"
        :aria-label="tipTitle"
      >
        <div class="vel-coach__card">
          <div class="vel-coach__arrow" aria-hidden="true">↓</div>
          <p class="vel-coach__eyebrow">{{ tipTitle }}</p>
          <p class="vel-coach__text">{{ tip }}</p>
          <div class="vel-coach__actions">
            <button type="button" class="vel-coach__cta" @click="go">
              {{ t('account.coach.go') }}
              <span aria-hidden="true">→</span>
            </button>
            <button type="button" class="vel-coach__skip" @click="dismiss">
              {{ t('account.coach.skip') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.vel-coach {
  position: fixed;
  z-index: 55;
  inset-inline: 0.75rem;
  inset-block-end: calc(var(--vel-tabbar-h, 4rem) + var(--vel-tabbar-gap, 0.5rem) * 2 + 0.75rem);
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.vel-coach__card {
  pointer-events: auto;
  display: flex;
  max-inline-size: 24rem;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1rem 1.1rem 1.05rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 40%, var(--color-line));
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--color-accent) 12%, transparent),
    0 1rem 2.5rem color-mix(in oklab, var(--color-fg) 18%, transparent);
  animation: vel-coach-bob 2.4s ease-in-out infinite;
}

.vel-coach__arrow {
  align-self: center;
  color: var(--color-accent-deep);
  font-size: 1.4rem;
  font-weight: 800;
  line-height: 1;
  animation: vel-coach-point 1.1s ease-in-out infinite;
}

.vel-coach__eyebrow {
  margin: 0;
  color: var(--color-accent-deep);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.vel-coach__text {
  margin: 0;
  color: var(--color-fg);
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.35;
}

.vel-coach__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

.vel-coach__cta {
  display: inline-flex;
  min-height: 2.75rem;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0 1rem;
  border: none;
  border-radius: var(--radius-control);
  background: var(--color-accent);
  color: var(--color-accent-ink);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
}

.vel-coach__skip {
  min-height: 2.75rem;
  padding: 0 0.85rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

@keyframes vel-coach-bob {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-4px);
  }
}

@keyframes vel-coach-point {
  0%,
  100% {
    transform: translateY(0);
    opacity: 1;
  }

  50% {
    transform: translateY(5px);
    opacity: 0.65;
  }
}

.vel-coach-enter-active,
.vel-coach-leave-active {
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}

.vel-coach-enter-from,
.vel-coach-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (prefers-reduced-motion: reduce) {
  .vel-coach__card,
  .vel-coach__arrow {
    animation: none;
  }
}
</style>
