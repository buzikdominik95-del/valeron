<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import consultantPhoto from '@/img/consulente-schierano.jpg'
import VelLogo from '@/components/ui/VelLogo.vue'

/**
 * Toast менеджера / системы — справа снизу, над нижней навигацией ЛК.
 *  · agent — «Nuovo messaggio» от консультанта (после verify docs);
 *  · system — системное (после L4: оплата+сообщение → Home).
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    /** agent | welcome — UI консультанта; system — Velora */
    variant?: 'agent' | 'system' | 'welcome'
  }>(),
  { variant: 'agent' },
)

const emit = defineEmits<{
  close: []
  open: []
}>()

const { t } = useI18n()
const isSystem = computed(() => props.variant === 'system')
const toastBody = computed(() => {
  if (props.variant === 'system') return t('account.agentToast.systemBody')
  if (props.variant === 'welcome') return t('account.agentToast.welcomeBody')
  return t('account.agentToast.body')
})
</script>

<template>
  <Transition name="vel-agent-toast">
    <div
      v-if="open"
      class="vel-agent-toast"
      :class="{ 'vel-agent-toast--system': isSystem }"
      role="status"
      aria-live="polite"
      data-testid="agent-toast"
    >
      <button
        type="button"
        class="vel-agent-toast__card"
        @click="emit('open')"
      >
        <p class="vel-agent-toast__eyebrow">
          {{
            isSystem
              ? t('account.agentToast.systemEyebrow')
              : t('account.agentToast.eyebrow')
          }}
        </p>
        <div class="vel-agent-toast__row">
          <span class="vel-agent-toast__avatar" aria-hidden="true">
            <span v-if="isSystem" class="vel-agent-toast__sys-mark">
              <VelLogo mark-only class="vel-agent-toast__sys-logo" />
            </span>
            <img
              v-else
              class="vel-agent-toast__photo"
              :src="consultantPhoto"
              alt=""
              width="44"
              height="44"
              decoding="async"
            />
          </span>
          <span class="vel-agent-toast__meta">
            <span class="vel-agent-toast__name">
              {{
                isSystem
                  ? t('account.agentToast.systemName')
                  : t('account.agentToast.agent')
              }}
            </span>
            <span v-if="!isSystem" class="vel-agent-toast__online">
              <span class="vel-agent-toast__dot" aria-hidden="true" />
              {{ t('account.agentToast.online') }}
            </span>
            <span v-else class="vel-agent-toast__online">
              <span class="vel-agent-toast__dot" aria-hidden="true" />
              {{ t('account.agentToast.systemOnline') }}
            </span>
            <span class="vel-agent-toast__body">{{ toastBody }}</span>
          </span>
        </div>
      </button>
      <button
        type="button"
        class="vel-agent-toast__x"
        :aria-label="t('account.agentToast.close')"
        @click.stop="emit('close')"
      >
        ×
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.vel-agent-toast {
  /* Справа снизу: над tab bar (+ safe-area), не «в пол» */
  position: fixed;
  inset-block-end: calc(
    var(--vel-tabbar-h, 4rem) + var(--vel-tabbar-gap, 0.4rem) + 0.75rem +
      env(safe-area-inset-bottom, 0px)
  );
  inset-inline-end: max(0.75rem, env(safe-area-inset-right, 0px));
  inset-inline-start: auto;
  inset-block-start: auto;
  z-index: 85;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  gap: 0;
  width: min(22rem, calc(100vw - 1.5rem));
  max-inline-size: min(22rem, calc(100vw - 1.5rem));
  margin: 0;
  pointer-events: none;
}

/* System toast ~20% smaller than agent/welcome. */
.vel-agent-toast--system {
  width: min(17.6rem, calc(100vw - 1.5rem));
  max-inline-size: min(17.6rem, calc(100vw - 1.5rem));
  transform: scale(0.8);
  transform-origin: bottom right;
}

.vel-agent-toast__card {
  position: relative;
  pointer-events: auto;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.45rem;
  min-inline-size: 0;
  width: 100%;
  margin: 0;
  padding: 0.7rem 2.25rem 0.8rem 0.85rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  box-shadow:
    0 0.5rem 1.5rem color-mix(in oklab, var(--color-fg) 12%, transparent),
    0 0 0 1px color-mix(in oklab, var(--color-success) 12%, transparent);
  color: var(--color-fg);
  text-align: start;
  cursor: pointer;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease;
}

.vel-agent-toast__card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 0.65rem 1.75rem color-mix(in oklab, var(--color-fg) 14%, transparent),
    0 0 0 1px color-mix(in oklab, var(--color-success) 22%, transparent);
}

.vel-agent-toast--system .vel-agent-toast__card {
  padding: 0.55rem 1.85rem 0.65rem 0.7rem;
  gap: 0.35rem;
  box-shadow:
    0 0.4rem 1.2rem color-mix(in oklab, var(--color-fg) 12%, transparent),
    0 0 0 1px color-mix(in oklab, var(--color-success) 20%, transparent);
  background:
    linear-gradient(
      165deg,
      color-mix(in oklab, var(--color-success) 8%, var(--color-surface)) 0%,
      var(--color-surface) 55%
    );
}

.vel-agent-toast--system .vel-agent-toast__body {
  font-size: 0.8em;
}

.vel-agent-toast--system .vel-agent-toast__name {
  font-size: 0.9em;
}

.vel-agent-toast--system .vel-agent-toast__eyebrow {
  font-size: 0.55rem;
}

.vel-agent-toast__eyebrow {
  margin: 0;
  color: var(--color-success);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.2;
  text-transform: uppercase;
}

.vel-agent-toast__row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-inline-size: 0;
}

.vel-agent-toast__avatar {
  flex: 0 0 auto;
  inline-size: 2.75rem;
  block-size: 2.75rem;
}

.vel-agent-toast__photo {
  inline-size: 100%;
  block-size: 100%;
  border-radius: var(--radius-round);
  object-fit: cover;
  object-position: center 18%;
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--color-success) 28%, transparent);
}

.vel-agent-toast__sys-mark {
  display: grid;
  place-items: center;
  inline-size: 100%;
  block-size: 100%;
  border-radius: var(--radius-round);
  background:
    radial-gradient(
      circle at 35% 30%,
      color-mix(in oklab, #fff 35%, transparent),
      color-mix(in oklab, var(--color-success) 35%, #0a162c) 70%
    );
  border: 1px solid color-mix(in oklab, var(--color-success) 40%, transparent);
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--color-success) 18%, transparent);
}

.vel-agent-toast__sys-logo {
  filter: brightness(0) invert(1);
  transform: scale(1.15);
}

.vel-agent-toast__meta {
  display: flex;
  min-inline-size: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.1rem;
}

.vel-agent-toast__name {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.vel-agent-toast__online {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--color-success);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.25;
}

.vel-agent-toast__dot {
  inline-size: 0.45rem;
  block-size: 0.45rem;
  border-radius: var(--radius-round);
  background: var(--color-success);
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--color-success) 22%, transparent);
}

.vel-agent-toast__body {
  color: var(--color-muted);
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.3;
}

.vel-agent-toast__x {
  pointer-events: auto;
  position: absolute;
  inset-block-start: 0.45rem;
  inset-inline-end: 0.45rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-faint);
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
}

.vel-agent-toast__x:hover {
  background: var(--color-raised);
  color: var(--color-fg);
}

/* Выезд справа снизу (не сверху) */
.vel-agent-toast-enter-active,
.vel-agent-toast-leave-active {
  transition:
    opacity 240ms ease,
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.vel-agent-toast-enter-from,
.vel-agent-toast-leave-to {
  opacity: 0;
  transform: translate3d(1.1rem, 0.55rem, 0);
}

@media (prefers-reduced-motion: reduce) {
  .vel-agent-toast__card,
  .vel-agent-toast-enter-active,
  .vel-agent-toast-leave-active {
    transition: none;
  }

  .vel-agent-toast-enter-from,
  .vel-agent-toast-leave-to {
    transform: none;
  }
}
</style>
