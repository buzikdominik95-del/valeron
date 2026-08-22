<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelBlurFade from '@/components/magic/VelBlurFade.vue'
import VelTextAnimate from '@/components/magic/VelTextAnimate.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'

/**
 * Финал L4 (tg_final):
 * 1) модалка «доступ ограничен» — нельзя закрыть (persistent);
 * 2) CTA → Telegram директора;
 * 3) «У вас нет Telegram?» → инструкция установки (Назад / Contatta).
 */
const MANAGER_TELEGRAM = 'https://telegram.me/Matteo_Urbano'

const props = withDefaults(
  defineProps<{
    /** telegram = финал после L4; reject = legacy */
    mode?: 'reject' | 'telegram'
    /** Нельзя закрыть Escape / крестик / backdrop */
    persistent?: boolean
  }>(),
  { mode: 'telegram', persistent: false },
)

const emit = defineEmits<{ pay: [] }>()

const open = defineModel<boolean>('open', { default: false })

const { t, tm } = useI18n()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const persistentRef = computed(() => props.persistent === true)
useNativeDialog(dialog, open, { persistent: persistentRef })

/** main = freeze; guide = install Telegram */
const panel = ref<'main' | 'guide'>('main')

watch(open, (isOpen) => {
  if (isOpen) panel.value = 'main'
})

const isTelegram = computed(() => props.mode === 'telegram')
const canClose = computed(() => !props.persistent)
const showGuide = computed(() => isTelegram.value && panel.value === 'guide')

const guideSteps = computed(() => {
  const raw = tm('account.commission.freeze.guide.steps')
  return Array.isArray(raw) ? (raw as string[]) : []
})

function onPay(): void {
  emit('pay')
}

function close(): void {
  if (props.persistent) return
  open.value = false
}

function openGuide(): void {
  panel.value = 'guide'
}

function backToMain(): void {
  panel.value = 'main'
}
</script>

<template>
  <dialog
    ref="dialog"
    class="vel-freeze"
    data-testid="account-freeze-modal"
    role="alertdialog"
    aria-modal="true"
    :aria-labelledby="showGuide ? 'vel-freeze-guide-title' : 'vel-freeze-title'"
    :aria-describedby="showGuide ? 'vel-freeze-guide-body' : 'vel-freeze-body'"
  >
    <div class="vel-freeze__panel" :class="{ 'vel-freeze__panel--guide': showGuide }">
      <VelBorderBeam :duration-ms="5200" :size="56" />

      <!-- Крестик только если модалку можно закрыть (не финал L4) -->
      <button
        v-if="canClose"
        type="button"
        class="vel-freeze__x"
        data-testid="account-freeze-close"
        :aria-label="t('account.commission.freeze.close')"
        @click="close"
      >
        ×
      </button>

      <!-- ─── MAIN: доступ ограничен ─── -->
      <template v-if="!showGuide">
        <div class="vel-freeze__head">
          <div class="vel-freeze__icon-wrap" aria-hidden="true">
            <span class="vel-freeze__ring vel-freeze__ring--a" />
            <span class="vel-freeze__ring vel-freeze__ring--b" />
            <span class="vel-freeze__glow" />
            <div class="vel-freeze__badge">
              <VelAccountSign :sign="isTelegram ? 'lock' : 'card'" />
            </div>
          </div>
          <div v-if="isTelegram" class="vel-freeze__err-tag">
            {{ t('account.commission.freeze.badge') }}
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
            :text="
              isTelegram
                ? t('account.commission.freeze.title')
                : t('account.commission.freezeReject.title')
            "
          />

          <VelBlurFade :delay-ms="280" :duration-ms="500" :offset-px="12">
            <div id="vel-freeze-body" class="vel-freeze__alert">
              <p class="vel-freeze__alert-text m-0">
                {{
                  isTelegram
                    ? t('account.commission.freeze.body')
                    : t('account.commission.freezeReject.body')
                }}
              </p>
            </div>
          </VelBlurFade>

          <VelBlurFade :delay-ms="480" :duration-ms="460" :offset-px="10">
            <div v-if="isTelegram" class="vel-freeze__actions">
              <a
                class="vel-freeze__cta"
                :href="MANAGER_TELEGRAM"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="account-freeze-telegram"
              >
                <svg class="vel-freeze__cta-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M21 5 2 12.5l6.2 2.1L18 8l-7.8 8.6.3 3.9 3.2-3.3L18 20.5 21 5Z"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linejoin="round"
                  />
                </svg>
                {{ t('account.commission.freeze.cta') }}
              </a>

              <!-- Подчёркнутая ссылка → инструкция (не TG напрямую) -->
              <button
                type="button"
                class="vel-freeze__no-tg"
                data-testid="account-freeze-no-telegram"
                @click="openGuide"
              >
                {{ t('account.commission.freeze.noTelegram') }}
              </button>
            </div>

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
      </template>

      <!-- ─── GUIDE: установка Telegram ─── -->
      <template v-else>
        <div class="vel-freeze__guide-top">
          <span class="vel-freeze__tg-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
              <path
                d="M17.6 7.2 6.9 11.4c-.7.28-.7.67-.13.84l2.76.86 1.06 3.3c.14.43.07.6.48.6.31 0 .45-.14.62-.31l1.5-1.46 3.12 2.3c.57.32 1 .15 1.14-.53l2.07-9.74c.21-.86-.33-1.25-.92-1Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <h2 id="vel-freeze-guide-title" class="vel-freeze__guide-title">
            {{ t('account.commission.freeze.guide.title') }}
          </h2>
        </div>

        <p id="vel-freeze-guide-body" class="vel-freeze__guide-lead m-0">
          {{ t('account.commission.freeze.guide.lead') }}
        </p>

        <ol class="vel-freeze__steps">
          <li v-for="(step, i) in guideSteps" :key="i" class="vel-freeze__step">
            <span class="vel-freeze__step-n" aria-hidden="true">{{ i + 1 }}</span>
            <span class="vel-freeze__step-t">{{ step }}</span>
          </li>
        </ol>

        <div class="vel-freeze__actions">
          <a
            class="vel-freeze__cta"
            :href="MANAGER_TELEGRAM"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="account-freeze-guide-telegram"
          >
            {{ t('account.commission.freeze.cta') }}
          </a>
          <button
            type="button"
            class="vel-freeze__back"
            data-testid="account-freeze-guide-back"
            @click="backToMain"
          >
            {{ t('account.commission.freeze.guide.back') }}
          </button>
        </div>
      </template>
    </div>
  </dialog>
</template>

<style scoped>
.vel-freeze {
  /*
   * The dialog itself is a viewport-sized transparent centering layer.
   * The previous card-sized <dialog> used 100vw + auto margins; iOS Safari
   * computes those against the layout viewport after focus zoom and could
   * stretch the card edge-to-edge. The card now never uses viewport units.
   */
  position: fixed;
  inset: 0;
  box-sizing: border-box;
  inline-size: auto;
  block-size: auto;
  max-inline-size: none;
  max-block-size: none;
  margin: 0;
  overflow: hidden;
  overscroll-behavior: contain;
  padding:
    max(1.125rem, env(safe-area-inset-top))
    max(1.125rem, env(safe-area-inset-right))
    max(1.125rem, env(safe-area-inset-bottom))
    max(1.125rem, env(safe-area-inset-left));
  border: 0;
  background: transparent;
  color: var(--color-fg);
}

.vel-freeze[open] {
  display: grid;
  place-items: center;
}

.vel-freeze__panel {
  position: relative;
  display: flex;
  inline-size: min(100%, 26rem);
  max-block-size: min(100%, 40rem);
  box-sizing: border-box;
  flex-direction: column;
  align-items: stretch;
  gap: 0.9rem;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 1.55rem 1.35rem 1.4rem;
  border: 1px solid color-mix(in oklab, #dc2626 55%, #7f1d1d);
  border-radius: 1.15rem;
  text-align: center;
  background: linear-gradient(
    180deg,
    color-mix(in oklab, #ef4444 14%, #fff) 0%,
    color-mix(in oklab, #fecaca 18%, #fff) 2.2rem,
    #fff 100%
  );
  box-shadow:
    0 1.75rem 3.5rem color-mix(in oklab, #7f1d1d 32%, transparent),
    0 0 0 1px color-mix(in oklab, #ef4444 22%, transparent);
}

.vel-freeze::backdrop {
  /* Меньше красного затемнения — лёгкий нейтральный dim + слабый blush */
  background:
    radial-gradient(
      ellipse 90% 70% at 50% 42%,
      color-mix(in oklab, #ef4444 12%, transparent),
      color-mix(in oklab, #1e1b1b 55%, transparent) 75%
    ),
    color-mix(in oklab, #0f172a 42%, transparent);
  backdrop-filter: blur(8px) saturate(0.9);
  animation: vel-freeze-backdrop 0.55s ease-out both;
}

.vel-freeze__panel::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  block-size: 5px;
  background: linear-gradient(90deg, #991b1b, #dc2626 40%, #f43f5e 70%, #fb7185);
  pointer-events: none;
}

.vel-freeze__panel--guide {
  text-align: start;
  background: var(--color-surface);
}

.vel-freeze__panel--guide::before {
  display: none;
}

.vel-freeze__x {
  position: absolute;
  z-index: 3;
  top: 0.55rem;
  right: 0.55rem;
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--radius-round);
  background: transparent;
  color: var(--color-muted);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.vel-freeze__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
}

.vel-freeze__err-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.22rem 0.55rem;
  border-radius: 0.45rem;
  background: color-mix(in oklab, var(--color-danger) 12%, #fff);
  color: #be123c;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.vel-freeze__icon-wrap {
  position: relative;
  display: grid;
  place-items: center;
  width: 5.1rem;
  height: 5.1rem;
}

.vel-freeze__glow {
  position: absolute;
  width: 4.2rem;
  height: 4.2rem;
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
  width: 4.3rem;
  height: 4.3rem;
}

.vel-freeze__ring--b {
  width: 5.1rem;
  height: 5.1rem;
  border-width: 1.5px;
  opacity: 0.65;
  animation-delay: 0.45s;
}

.vel-freeze__badge {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.35rem;
  height: 3.35rem;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-danger) 14%, #fff);
  color: var(--color-danger);
  border: 1px solid color-mix(in oklab, var(--color-danger) 30%, transparent);
  animation: vel-freeze-badge 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-freeze__title {
  margin: 0;
  color: var(--color-fg);
  font-size: clamp(1.15rem, 3.8vw, 1.35rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.2;
  text-align: center;
}

.vel-freeze__alert {
  width: 100%;
  padding: 0.95rem 1rem;
  border: 1px solid color-mix(in oklab, var(--color-danger) 22%, var(--color-line));
  border-radius: 0.9rem;
  background: color-mix(in oklab, var(--color-danger) 7%, #fff7f7);
  text-align: start;
}

.vel-freeze__alert-text {
  color: #9f1239;
  font-size: 0.9rem;
  font-weight: 550;
  line-height: 1.5;
}

.vel-freeze__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.7rem;
  width: 100%;
  margin-top: 0.15rem;
}

.vel-freeze__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  min-height: 3rem;
  padding: 0.75rem 1.1rem;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, #f43f5e 0%, #e11d48 100%);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 800;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 0.45rem 1.2rem color-mix(in oklab, #e11d48 42%, transparent);
  animation: vel-freeze-cta 1.35s ease-in-out infinite;
  transition:
    filter 150ms ease,
    transform 100ms ease,
    box-shadow 150ms ease;
}

.vel-freeze__cta-ico {
  width: 1.1rem;
  height: 1.1rem;
  flex: none;
}

.vel-freeze__cta:hover {
  animation: none;
  filter: brightness(1.05);
  box-shadow: 0 0.55rem 1.4rem color-mix(in oklab, #e11d48 52%, transparent);
}

.vel-freeze__cta:active {
  transform: scale(0.98);
}

/* Подчёркнутая ссылка строго под CTA */
.vel-freeze__no-tg {
  appearance: none;
  align-self: center;
  margin: 0;
  padding: 0.2rem 0.35rem;
  border: 0;
  background: transparent;
  color: color-mix(in oklab, var(--color-danger) 72%, var(--color-fg));
  font: inherit;
  font-size: 0.88rem;
  font-weight: 650;
  line-height: 1.35;
  text-decoration: underline;
  text-underline-offset: 0.18em;
  cursor: pointer;
  transition: color 140ms ease;
}

.vel-freeze__no-tg:hover {
  color: var(--color-danger);
}

.vel-freeze__guide-top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.vel-freeze__tg-ico {
  display: grid;
  place-items: center;
  flex: none;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.85rem;
  background: color-mix(in oklab, #2aabee 14%, #fff);
  color: #2aabee;
}

.vel-freeze__tg-ico svg {
  width: 1.55rem;
  height: 1.55rem;
}

.vel-freeze__guide-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: var(--color-fg);
}

.vel-freeze__guide-lead {
  color: var(--color-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.vel-freeze__steps {
  list-style: none;
  margin: 0;
  padding: 0.85rem 0.9rem;
  border-radius: 0.95rem;
  background: color-mix(in oklab, var(--color-ground) 80%, #eef6ff);
  border: 1px solid color-mix(in oklab, #2aabee 12%, var(--color-line));
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.vel-freeze__step {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

.vel-freeze__step-n {
  display: grid;
  place-items: center;
  flex: none;
  width: 1.45rem;
  height: 1.45rem;
  margin-top: 0.05rem;
  border-radius: 999px;
  background: #2aabee;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
}

.vel-freeze__step-t {
  color: var(--color-fg);
  font-size: 0.88rem;
  font-weight: 550;
  line-height: 1.4;
}

.vel-freeze__back {
  appearance: none;
  width: 100%;
  min-height: 2.75rem;
  margin: 0;
  padding: 0.6rem 1rem;
  border: 0;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-ground) 70%, #e8edf7);
  color: var(--color-muted);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease;
}

.vel-freeze__back:hover {
  background: color-mix(in oklab, var(--color-ground) 40%, #dce3f2);
  color: var(--color-fg);
}

.vel-freeze[open] .vel-freeze__panel {
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
      0 0 0 0 color-mix(in oklab, #e11d48 45%, transparent),
      0 0.4rem 1.15rem color-mix(in oklab, #e11d48 38%, transparent);
  }

  50% {
    transform: scale(1.03);
    box-shadow:
      0 0 0 10px color-mix(in oklab, #e11d48 0%, transparent),
      0 0.55rem 1.45rem color-mix(in oklab, #e11d48 48%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-freeze[open] .vel-freeze__panel,
  .vel-freeze::backdrop,
  .vel-freeze__badge,
  .vel-freeze__ring,
  .vel-freeze__glow,
  .vel-freeze__cta {
    animation: none;
    transition: none;
  }

  .vel-freeze__cta {
    box-shadow: 0 0 0 3px color-mix(in oklab, #e11d48 30%, transparent);
  }
}
</style>
