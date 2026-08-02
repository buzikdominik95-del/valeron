<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useTimeoutFn } from '@vueuse/core'
import { ApiError } from '@/api/http'
import { sendEmailVerificationCode, verifyEmailVerificationCode } from '@/api/auth.api'
import { useAccountStore } from '@/stores/account.store'
import { OTP_LENGTH } from '@/composables/useOtpInput'
import VelBadge from '@/components/ui/VelBadge.vue'
import VelButton from '@/components/ui/VelButton.vue'
import VelSecurityRow from '@/features/account/VelSecurityRow.vue'
import VelOtpField from '@/features/account/VelOtpField.vue'

/**
 * Sicurezza: password / email / verify.
 * Верификация email: checking → ok/fail анимация поверх блока (66.txt §13).
 */
const emit = defineEmits<{
  changePassword: []
  changeEmail: []
  sendCode: []
  verify: [code: string]
}>()

const { t } = useI18n()
const accountStore = useAccountStore()
const { emailVerified } = storeToRefs(accountStore)

const titleId = `vel-security-${useId()}`

const codeRequested = ref(false)
const code = ref('')
const sendCount = ref(0)
const confirming = ref(false)
const sendBusy = ref(false)

/** idle | checking | ok | fail — анимация результата на месте */
const verifyAnim = ref<'idle' | 'checking' | 'ok' | 'fail'>('idle')

const isCodeComplete = computed(() => code.value.length === OTP_LENGTH)

const announced = ref(false)
const announcement = computed(() => (announced.value ? t('account.security.verify.sent') : ''))

const { start: announceSent } = useTimeoutFn(
  () => {
    announced.value = true
  },
  120,
  { immediate: false },
)

async function requestCode(): Promise<void> {
  if (confirming.value || sendBusy.value) return

  sendBusy.value = true
  try {
    const response = await sendEmailVerificationCode()
    if (response.already_verified) {
      accountStore.markEmailVerified()
      codeRequested.value = false
      code.value = ''
      verifyAnim.value = 'idle'
      return
    }

    code.value = ''
    codeRequested.value = true
    sendCount.value += 1
    announced.value = false
    verifyAnim.value = 'idle'
    announceSent()
    emit('sendCode')
  } catch (error) {
    verifyAnim.value = 'fail'
    window.setTimeout(() => {
      verifyAnim.value = 'idle'
    }, 1200)
    console.warn('[email-verify] send code failed', error)
  } finally {
    sendBusy.value = false
  }
}

async function confirmCode(): Promise<void> {
  if (!isCodeComplete.value || confirming.value) return

  confirming.value = true
  verifyAnim.value = 'checking'

  const digits = code.value.trim()

  try {
    const response = await verifyEmailVerificationCode(digits)
    const ok = response.ok === true
    verifyAnim.value = ok ? 'ok' : 'fail'

    if (ok) {
      emit('verify', digits)
      window.setTimeout(() => {
        accountStore.markEmailVerified()
        codeRequested.value = false
        code.value = ''
        confirming.value = false
        verifyAnim.value = 'idle'
      }, 1200)
      return
    }
  } catch (error) {
    verifyAnim.value = 'fail'
    if (error instanceof ApiError && error.status === 401) {
      console.warn('[email-verify] unauthenticated while verify code')
    }
  }

  window.setTimeout(() => {
    confirming.value = false
    verifyAnim.value = 'idle'
    code.value = ''
    sendCount.value += 1
  }, 1200)
}
</script>

<template>
  <section
    class="vel-security rounded-panel border border-line bg-surface p-5 sm:p-6"
    :aria-labelledby="titleId"
  >
    <div class="flex items-center gap-2.5">
      <svg class="vel-security__sign" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 19.5 6v5.5c0 4-3.1 7.1-7.5 8.5-4.4-1.4-7.5-4.5-7.5-8.5V6z" />
        <path d="M9 12.5 11.5 15 15.5 10" />
      </svg>

      <h2 :id="titleId" class="text-lg sm:text-xl">{{ t('account.security.title') }}</h2>
    </div>

    <div class="mt-2">
      <VelSecurityRow :text="t('account.security.password.text')">
        <template #action>
          <VelButton variant="outline" @click="emit('changePassword')">
            {{ t('account.security.password.action') }}
          </VelButton>
        </template>
      </VelSecurityRow>

      <VelSecurityRow :text="t('account.security.email.text')">
        <template #action>
          <VelButton variant="outline" @click="emit('changeEmail')">
            {{ t('account.security.email.action') }}
          </VelButton>
        </template>
      </VelSecurityRow>

      <div
        id="vel-security-verify"
        data-testid="security-verify"
        class="vel-security__verify-wrap"
        :class="{
          'vel-security__verify--pending': !emailVerified && verifyAnim === 'idle',
          'vel-security__verify--checking': verifyAnim === 'checking',
          'vel-security__verify--ok': verifyAnim === 'ok',
          'vel-security__verify--fail': verifyAnim === 'fail',
        }"
      >
        <!-- Полноблочная анимация результата -->
        <div
          v-if="verifyAnim !== 'idle'"
          class="vel-security__anim"
          :class="`vel-security__anim--${verifyAnim}`"
          role="status"
          data-testid="email-verify-anim"
        >
          <div class="vel-security__anim-ring" aria-hidden="true" />
          <div class="vel-security__anim-core" aria-hidden="true">
            <!-- checking spinner -->
            <span v-if="verifyAnim === 'checking'" class="vel-security__anim-spin" />
            <!-- success check -->
            <svg
              v-else-if="verifyAnim === 'ok'"
              class="vel-security__anim-svg"
              viewBox="0 0 64 64"
              fill="none"
            >
              <circle class="vel-security__anim-circle" cx="32" cy="32" r="28" />
              <path class="vel-security__anim-check" d="M18 33.5 27.5 43 46 22" />
            </svg>
            <!-- fail X -->
            <svg
              v-else
              class="vel-security__anim-svg"
              viewBox="0 0 64 64"
              fill="none"
            >
              <circle class="vel-security__anim-circle vel-security__anim-circle--fail" cx="32" cy="32" r="28" />
              <path class="vel-security__anim-x" d="M22 22 42 42M42 22 22 42" />
            </svg>
          </div>
          <p class="vel-security__anim-title m-0">
            {{
              verifyAnim === 'checking'
                ? t('account.security.verify.checking')
                : verifyAnim === 'ok'
                  ? t('account.security.verify.successFlash')
                  : t('account.security.verify.failFlash')
            }}
          </p>
          <p v-if="verifyAnim === 'ok'" class="vel-security__anim-sub m-0">
            {{ t('account.security.verify.successSub') }}
          </p>
        </div>

        <VelSecurityRow
          :title="t('account.security.verify.title')"
          :text="emailVerified ? undefined : t('account.security.verify.text')"
        >
          <template #status>
            <span
              v-if="!emailVerified"
              class="vel-security__q"
              :title="t('account.security.verify.unverified')"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                />
                <circle cx="12" cy="18" r="1.15" fill="currentColor" />
              </svg>
            </span>
            <VelBadge
              :class="{
                'vel-security__badge-pending': !emailVerified,
                'vel-security__badge-ok': emailVerified,
              }"
            >
              {{
                emailVerified
                  ? t('account.security.verify.verified')
                  : t('account.security.verify.unverified')
              }}
            </VelBadge>
          </template>

          <template #action>
            <VelButton
              v-if="!emailVerified && !codeRequested"
              class="vel-security__verify-btn"
              :disabled="confirming || sendBusy"
              data-testid="email-verify-send"
              @click="requestCode"
            >
              {{ t('account.security.verify.send') }}
            </VelButton>
          </template>

          <div
            v-if="!emailVerified && codeRequested && verifyAnim === 'idle'"
            class="flex flex-col gap-4 pt-1"
          >
            <VelOtpField
              :key="sendCount"
              v-model="code"
              :label="t('account.security.verify.codeLabel')"
              autofocus
            />

            <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
              <VelButton
                :disabled="!isCodeComplete || confirming"
                data-testid="email-verify-confirm"
                @click="confirmCode"
              >
                {{ t('account.security.verify.confirm') }}
              </VelButton>

              <p class="text-sm text-muted">
                {{ t('account.security.verify.resendQuestion') }}
                <button
                  type="button"
                  class="vel-link vel-security__resend"
                  :disabled="confirming || sendBusy"
                  @click="requestCode"
                >
                  {{ t('account.security.verify.resend') }}
                </button>
              </p>
            </div>
          </div>
        </VelSecurityRow>
      </div>
    </div>

    <p class="sr-only" role="status">{{ announcement }}</p>
  </section>
</template>

<style scoped>
.vel-security {
  container: vel-security / inline-size;
}

.vel-security__sign {
  inline-size: 1.375rem;
  block-size: 1.375rem;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: butt;
  stroke-linejoin: miter;
  color: var(--color-accent-deep);
}

.vel-security__verify-wrap {
  position: relative;
  border-radius: var(--radius-control);
  transition:
    outline-color 200ms ease,
    background-color 200ms ease;
}

.vel-security__verify--pending {
  outline: 1px solid color-mix(in oklab, #f59e0b 35%, transparent);
  background: color-mix(in oklab, #f59e0b 6%, transparent);
}

/* Место под overlay (absolute не раздувает родителя сам) */
.vel-security__verify--checking,
.vel-security__verify--ok,
.vel-security__verify--fail {
  min-block-size: 12.5rem;
}

.vel-security__q {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 999px;
  border: 1.75px solid color-mix(in oklab, #f59e0b 55%, #e8a317);
  background: color-mix(in oklab, #fbbf24 22%, #fff);
  color: #b45309;
  box-shadow:
    0 0 0 3px color-mix(in oklab, #f59e0b 16%, transparent),
    0 0.35rem 0.75rem color-mix(in oklab, #f59e0b 18%, transparent);
}

.vel-security__q svg {
  width: 0.78rem;
  height: 0.78rem;
}

.vel-security__badge-pending {
  border-color: color-mix(in oklab, #f59e0b 45%, var(--color-line)) !important;
  background: color-mix(in oklab, #fbbf24 18%, #fff) !important;
  color: #9a3412 !important;
}

.vel-security__badge-ok {
  border-color: color-mix(in oklab, var(--color-success) 40%, var(--color-line)) !important;
  background: color-mix(in oklab, var(--color-success) 14%, #fff) !important;
  color: #0b7d4e !important;
}

/* Кнопка «Verifica» — оранжевая + мигание, пока email не подтверждён */
.vel-security__verify-btn {
  border-color: transparent !important;
  background: linear-gradient(145deg, #fb923c 0%, #ea580c 55%, #c2410c 100%) !important;
  color: #fff !important;
  box-shadow:
    0 0 0 0 color-mix(in oklab, #f97316 45%, transparent),
    0 0.35rem 0.9rem color-mix(in oklab, #ea580c 35%, transparent) !important;
}

.vel-security__verify-btn:hover:not(:disabled) {
  filter: brightness(1.06);
}

.vel-security__verify-btn:disabled {
  animation: none;
  opacity: 0.65;
}

/* ─── Result animation overlay ─── */
.vel-security__anim {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  min-block-size: 11rem;
  padding: 1.25rem 1rem;
  border-radius: inherit;
  background: color-mix(in oklab, var(--color-surface) 94%, transparent);
  backdrop-filter: blur(8px);
  animation: vel-sec-anim-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-security__anim--ok {
  background: color-mix(in oklab, #ecfdf5 92%, transparent);
}

.vel-security__anim--fail {
  background: color-mix(in oklab, #fef2f2 92%, transparent);
  animation:
    vel-sec-anim-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both,
    vel-sec-shake 0.45s 0.2s ease both;
}

.vel-security__anim-ring {
  position: absolute;
  width: 7.5rem;
  height: 7.5rem;
  border-radius: 999px;
  pointer-events: none;
}

.vel-security__anim--checking .vel-security__anim-ring {
  border: 2px solid color-mix(in oklab, var(--color-accent) 35%, transparent);
  animation: vel-sec-ring 1.1s ease-out infinite;
}

.vel-security__anim--ok .vel-security__anim-ring {
  background: radial-gradient(
    circle,
    color-mix(in oklab, var(--color-success) 28%, transparent) 0%,
    transparent 70%
  );
  animation: vel-sec-glow 0.9s ease-out both;
}

.vel-security__anim--fail .vel-security__anim-ring {
  background: radial-gradient(
    circle,
    color-mix(in oklab, var(--color-danger) 22%, transparent) 0%,
    transparent 70%
  );
}

.vel-security__anim-core {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 4.5rem;
  height: 4.5rem;
}

.vel-security__anim-spin {
  width: 2.6rem;
  height: 2.6rem;
  border: 3px solid color-mix(in oklab, var(--color-accent) 25%, transparent);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: vel-sec-spin 0.75s linear infinite;
}

.vel-security__anim-svg {
  width: 4.25rem;
  height: 4.25rem;
}

.vel-security__anim-circle {
  fill: color-mix(in oklab, var(--color-success) 12%, #fff);
  stroke: var(--color-success);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-dasharray: 176;
  stroke-dashoffset: 176;
  animation: vel-sec-draw 0.55s 0.08s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.vel-security__anim-circle--fail {
  fill: color-mix(in oklab, var(--color-danger) 10%, #fff);
  stroke: var(--color-danger);
}

.vel-security__anim-check {
  fill: none;
  stroke: var(--color-success);
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: vel-sec-draw 0.4s 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.vel-security__anim-x {
  fill: none;
  stroke: var(--color-danger);
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: vel-sec-draw 0.35s 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.vel-security__anim-title {
  position: relative;
  z-index: 1;
  text-align: center;
  font-size: 1rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--color-fg);
  animation: vel-sec-fade 0.35s 0.15s both;
}

.vel-security__anim--ok .vel-security__anim-title {
  color: #0b7d4e;
}

.vel-security__anim--fail .vel-security__anim-title {
  color: var(--color-danger);
}

.vel-security__anim-sub {
  position: relative;
  z-index: 1;
  text-align: center;
  font-size: 0.82rem;
  color: var(--color-muted);
  animation: vel-sec-fade 0.35s 0.28s both;
}

.vel-security__resend {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
}

@keyframes vel-sec-anim-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes vel-sec-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes vel-sec-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes vel-sec-fade {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes vel-sec-ring {
  0% {
    transform: scale(0.75);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

@keyframes vel-sec-glow {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes vel-sec-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-6px);
  }
  40% {
    transform: translateX(6px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-security__q,
  .vel-security__verify-btn,
  .vel-security__badge-pending,
  .vel-security__anim,
  .vel-security__anim-spin,
  .vel-security__anim-circle,
  .vel-security__anim-check,
  .vel-security__anim-x,
  .vel-security__anim-ring {
    animation: none !important;
  }

  .vel-security__anim-circle,
  .vel-security__anim-check,
  .vel-security__anim-x {
    stroke-dashoffset: 0;
  }
}
</style>
