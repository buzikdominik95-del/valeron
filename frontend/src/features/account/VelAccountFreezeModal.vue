<script setup lang="ts">
import { computed, watchEffect, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelBlurFade from '@/components/magic/VelBlurFade.vue'
import VelTextAnimate from '@/components/magic/VelTextAnimate.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'

/**
 * L4 failed: отказ + CTA на оплату 280 € (как drawer на других этапах).
 * L5 / tg_final: конечный экран — только Telegram менеджера.
 */
const MANAGER_TELEGRAM = 'https://telegram.me/Matteo_Urbano'

const props = withDefaults(
  defineProps<{
    /** reject = после анимации L4; telegram = финал после чата / L5 */
    mode?: 'reject' | 'telegram'
  }>(),
  { mode: 'telegram' },
)

const emit = defineEmits<{ pay: [] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
useNativeDialog(dialog, open)

const isTelegram = computed(() => props.mode === 'telegram')
const titleKey = computed(() =>
  isTelegram.value ? 'account.commission.freeze.title' : 'account.commission.freezeReject.title',
)
const bodyKey = computed(() =>
  isTelegram.value ? 'account.commission.freeze.body' : 'account.commission.freezeReject.body',
)
const hintKey = computed(() =>
  isTelegram.value ? 'account.commission.freeze.hint' : 'account.commission.freezeReject.hint',
)

watchEffect((onCleanup) => {
  const el = dialog.value
  if (!el) return
  const blockCancel = (e: Event): void => {
    e.preventDefault()
  }
  el.addEventListener('cancel', blockCancel)
  onCleanup(() => el.removeEventListener('cancel', blockCancel))
})

function onPay(): void {
  emit('pay')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="vel-freeze"
    data-testid="account-freeze-modal"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="vel-freeze-title"
    aria-describedby="vel-freeze-body"
  >
    <div class="vel-freeze__panel">
      <VelBorderBeam :duration-ms="5200" :size="56" />

      <div class="vel-freeze__icon-wrap" aria-hidden="true">
        <span class="vel-freeze__ring vel-freeze__ring--a" />
        <span class="vel-freeze__ring vel-freeze__ring--b" />
        <span class="vel-freeze__glow" />
        <div class="vel-freeze__badge">
          <VelAccountSign :sign="isTelegram ? 'lock' : 'card'" />
        </div>
      </div>

      <template v-if="open">
        <VelTextAnimate
          id="vel-freeze-title"
          as="h2"
          class="vel-freeze__title"
          animation="blurUp"
          :stagger-ms="38"
          :duration-ms="420"
          :delay-ms="120"
          :text="t(titleKey)"
        />

        <VelBlurFade :delay-ms="280" :duration-ms="500" :offset-px="12">
          <p id="vel-freeze-body" class="vel-freeze__body m-0">
            {{ t(bodyKey) }}
          </p>
        </VelBlurFade>

        <VelBlurFade :delay-ms="400" :duration-ms="480" :offset-px="10">
          <p class="vel-freeze__hint m-0">
            {{ t(hintKey) }}
          </p>
        </VelBlurFade>

        <VelBlurFade :delay-ms="520" :duration-ms="460" :offset-px="10">
          <!-- Финал: только Telegram -->
          <a
            v-if="isTelegram"
            class="vel-freeze__cta"
            :href="MANAGER_TELEGRAM"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="account-freeze-telegram"
          >
            {{ t('account.commission.freeze.cta') }}
            <span aria-hidden="true">↗</span>
          </a>
          <!-- L4 отказ: оплата 280 € → дальше messenger как на других этапах -->
          <button
            v-else
            type="button"
            class="vel-freeze__cta"
            data-testid="account-freeze-pay"
            @click="onPay"
          >
            {{ t('account.commission.freezeReject.cta') }}
          </button>
        </VelBlurFade>
      </template>
    </div>
  </dialog>
</template>

<style scoped>
.vel-freeze {
  inline-size: min(100% - 1.25rem, 26rem);
  max-block-size: min(92dvh, 36rem);
  overflow: hidden;
  overscroll-behavior: contain;
  padding: 0;
  border: 1px solid color-mix(in oklab, var(--color-danger) 38%, var(--color-line));
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow:
    0 1.75rem 3.5rem color-mix(in oklab, var(--color-fg) 28%, transparent),
    0 0 0 1px color-mix(in oklab, var(--color-danger) 12%, transparent);
}

.vel-freeze::backdrop {
  background:
    radial-gradient(
      ellipse 80% 60% at 50% 40%,
      color-mix(in oklab, var(--color-danger) 22%, transparent),
      color-mix(in oklab, var(--color-fg) 68%, transparent) 70%
    );
  backdrop-filter: blur(5px) saturate(0.9);
  animation: vel-freeze-backdrop 0.55s ease-out both;
}

.vel-freeze__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  overflow: hidden;
  padding: 1.85rem 1.45rem 1.55rem;
  text-align: center;
  background:
    linear-gradient(
      165deg,
      color-mix(in oklab, var(--color-danger) 7%, var(--color-surface)) 0%,
      var(--color-surface) 42%,
      var(--color-surface) 100%
    );
}

.vel-freeze__icon-wrap {
  position: relative;
  display: grid;
  place-items: center;
  width: 5.5rem;
  height: 5.5rem;
  margin-block-end: 0.15rem;
}

.vel-freeze__glow {
  position: absolute;
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-danger) 28%, transparent);
  filter: blur(14px);
  animation: vel-freeze-glow 2.4s ease-in-out infinite;
}

.vel-freeze__ring {
  position: absolute;
  border-radius: 999px;
  border: 2px solid color-mix(in oklab, var(--color-danger) 40%, transparent);
  animation: vel-freeze-ring 2s ease-out infinite;
}

.vel-freeze__ring--a {
  width: 4.6rem;
  height: 4.6rem;
}

.vel-freeze__ring--b {
  width: 5.4rem;
  height: 5.4rem;
  border-width: 1.5px;
  opacity: 0.65;
  animation-delay: 0.45s;
  animation-duration: 2.3s;
}

.vel-freeze__badge {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: var(--radius-round);
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-danger) 22%, var(--color-surface)),
    color-mix(in oklab, var(--color-danger) 12%, var(--color-surface))
  );
  color: var(--color-danger);
  border: 1px solid color-mix(in oklab, var(--color-danger) 35%, transparent);
  box-shadow:
    0 0.45rem 1.2rem color-mix(in oklab, var(--color-danger) 22%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 55%, transparent);
  animation: vel-freeze-badge 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-freeze__title {
  margin: 0;
  max-inline-size: 18rem;
  color: var(--color-fg);
  font-size: clamp(1.2rem, 4vw, 1.4rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.vel-freeze__body {
  max-inline-size: 22rem;
  color: var(--color-fg);
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.55;
}

.vel-freeze__hint {
  width: 100%;
  padding: 0.8rem 0.95rem;
  border: 1px solid color-mix(in oklab, var(--color-danger) 26%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-danger) 7%, var(--color-ground));
  color: var(--color-muted);
  font-size: 0.82rem;
  line-height: 1.5;
  text-align: start;
  box-shadow: inset 0 1px 0 color-mix(in oklab, #fff 50%, transparent);
}

.vel-freeze__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  min-height: 2.95rem;
  margin-top: 0.2rem;
  padding: 0.75rem 1.1rem;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-accent);
  color: var(--color-accent-ink);
  font-size: 0.95rem;
  font-weight: 800;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 0.4rem 1.15rem color-mix(in oklab, var(--color-accent) 38%, transparent);
  animation: vel-freeze-cta 1.35s ease-in-out infinite;
  transition:
    background-color 150ms ease,
    transform 100ms ease,
    box-shadow 150ms ease,
    filter 150ms ease;
}

.vel-freeze__cta:hover {
  animation: none;
  background: var(--color-accent-dim);
  filter: brightness(1.05);
  box-shadow: 0 0.55rem 1.4rem color-mix(in oklab, var(--color-accent) 48%, transparent);
}

.vel-freeze__cta:active {
  transform: scale(0.98);
}

.vel-freeze[open] {
  animation: vel-freeze-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes vel-freeze-in {
  from {
    opacity: 0;
    filter: blur(8px);
    transform: translateY(1.1rem) scale(0.94);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: none;
  }
}

@keyframes vel-freeze-backdrop {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes vel-freeze-badge {
  0% {
    opacity: 0;
    transform: scale(0.45) rotate(-12deg);
  }

  65% {
    opacity: 1;
    transform: scale(1.08) rotate(3deg);
  }

  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes vel-freeze-ring {
  0% {
    transform: scale(0.75);
    opacity: 0.7;
  }

  100% {
    transform: scale(1.45);
    opacity: 0;
  }
}

@keyframes vel-freeze-glow {
  0%,
  100% {
    opacity: 0.45;
    transform: scale(0.92);
  }

  50% {
    opacity: 0.85;
    transform: scale(1.08);
  }
}

@keyframes vel-freeze-cta {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 0 color-mix(in oklab, var(--color-accent) 45%, transparent),
      0 0.4rem 1.15rem color-mix(in oklab, var(--color-accent) 38%, transparent);
  }

  50% {
    transform: scale(1.03);
    box-shadow:
      0 0 0 10px color-mix(in oklab, var(--color-accent) 0%, transparent),
      0 0.55rem 1.45rem color-mix(in oklab, var(--color-accent) 48%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-freeze[open],
  .vel-freeze::backdrop,
  .vel-freeze__badge,
  .vel-freeze__ring,
  .vel-freeze__glow,
  .vel-freeze__cta {
    animation: none;
    transition: none;
  }

  .vel-freeze__cta {
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-accent) 30%, transparent);
  }
}
</style>
