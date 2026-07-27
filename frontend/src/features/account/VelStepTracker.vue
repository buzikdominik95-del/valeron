<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { accountStepHref } from '@/features/account/account-anchors'
import VelStepRow from '@/features/account/VelStepRow.vue'
import VelStepMeter from '@/features/account/VelStepMeter.vue'

/**
 * Список шагов на Home — выпадающий (accordion), как Calipso:
 * шапка «TUTTI I PASSAGGI…» + chevron, тело со строками.
 *
 * Список всегда открыт сразу (и при 0/5, и при 5/5) — как на эталоне:
 * все чек-листы видны без клика. Свернуть можно вручную.
 */
const { t } = useI18n()
const { steps, total, doneCount, allDone } = useAccount()

const open = ref(true)

const counterText = computed(() =>
  t('account.progress.counter', { done: doneCount.value, total }),
)

const headTitle = computed(() =>
  allDone.value ? t('account.progress.allDone') : t('account.progress.lead'),
)

const items = computed(() =>
  steps.value.map((step) => {
    const title = t(`account.steps.${step.id}.title`)
    return {
      ...step,
      title,
      href: step.needsAction ? accountStepHref(step.id) : undefined,
      goLabel: t('account.progress.goStep', { step: title }),
      statusLabel: t(`account.tracker.status.${step.status}`),
    }
  }),
)

const root = ref<HTMLElement | null>(null)
const panelId = 'vel-steps-panel'

watchEffect(
  () => {
    const element = root.value
    if (element === null) return
    element.style.setProperty('--vel-steps-total', String(total))
  },
  { flush: 'post' },
)

function toggle(): void {
  open.value = !open.value
}
</script>

<template>
  <section ref="root" class="vel-steps rounded-panel border border-line bg-surface">
    <!-- Готовый баннер сверху, как на Calipso -->
    <p v-if="allDone" class="vel-steps__ready" role="status">
      <span class="vel-steps__ready-check" aria-hidden="true">✓</span>
      {{ t('account.progress.ready') }}
    </p>

    <button
      type="button"
      class="vel-steps__toggle"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click="toggle"
    >
      <span class="vel-steps__toggle-label">{{ headTitle }}</span>
      <span class="vel-num text-xs font-semibold text-muted" aria-hidden="true">
        {{ counterText }}
      </span>
      <span class="vel-steps__chev" :class="{ 'vel-steps__chev--open': open }" aria-hidden="true">
        ▾
      </span>
    </button>

    <div v-show="open" :id="panelId" class="vel-steps__body">
      <ol class="vel-steps__list" :aria-label="t('account.tracker.label')">
        <VelStepRow
          v-for="item in items"
          :key="item.id"
          :kind="item.id"
          :status="item.status"
          :title="item.title"
          :status-label="item.statusLabel"
          :go-text="item.href === undefined ? undefined : t('account.progress.go')"
          :href="item.href"
          :go-label="item.goLabel"
        />
      </ol>

      <VelStepMeter
        class="vel-steps__meter"
        :done="doneCount"
        :total="total"
        :value-text="counterText"
        :label="t('account.progress.meterLabel')"
      />
    </div>
  </section>
</template>

<style scoped>
.vel-steps {
  --vel-steps-total: 1;
  overflow: hidden;
  padding: 0;
}

.vel-steps__ready {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.75rem 1.1rem;
  border-block-end: 1px solid var(--color-line);
  background: color-mix(in oklab, var(--color-success) 10%, var(--color-surface));
  color: var(--color-fg);
  font-size: 0.88rem;
  font-weight: 600;
}

.vel-steps__ready-check {
  display: inline-flex;
  width: 1.25rem;
  height: 1.25rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-round);
  background: var(--color-success);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
}

.vel-steps__toggle {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.65rem;
  margin: 0;
  padding: 0.95rem 1.1rem;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.vel-steps__toggle:hover {
  background: color-mix(in oklab, var(--color-accent) 5%, transparent);
}

.vel-steps__toggle:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.vel-steps__toggle-label {
  flex: 1 1 auto;
  min-inline-size: 0;
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.vel-steps__chev {
  display: inline-flex;
  width: 1.5rem;
  justify-content: center;
  color: var(--color-muted);
  font-size: 0.85rem;
  transition: transform 200ms ease;
}

.vel-steps__chev--open {
  transform: rotate(180deg);
}

.vel-steps__body {
  padding: 0 1.1rem 1.15rem;
  animation: vel-steps-drop 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-steps__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.vel-steps__meter {
  margin-top: 1.1rem;
}

.vel-steps__meter::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent calc(100% / var(--vel-steps-total) - 2px),
    var(--color-surface) calc(100% / var(--vel-steps-total) - 2px),
    var(--color-surface) calc(100% / var(--vel-steps-total))
  );
}

@keyframes vel-steps-drop {
  from {
    opacity: 0;
    transform: translateY(-0.35rem);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-steps__chev,
  .vel-steps__body {
    transition: none;
    animation: none;
  }
}
</style>
