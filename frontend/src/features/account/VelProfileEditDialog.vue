<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useSimulatorStore } from '@/stores/simulator.store'
import { useAccountStore } from '@/stores/account.store'
import VelButton from '@/components/ui/VelButton.vue'
import VelField from '@/components/ui/VelField.vue'
import VelInput from '@/components/ui/VelInput.vue'

/**
 * Модалка правки профиля: nome/cognome · email · password.
 * Пишет в simulator (имя/почта) и account.store (пароль, emailVerified).
 */
export type ProfileEditKind = 'name' | 'email' | 'password'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ kind: ProfileEditKind }>()

const { t } = useI18n()
const simulator = useSimulatorStore()
const { firstName, surname, email } = storeToRefs(simulator)
const account = useAccountStore()

const tried = ref(false)
const formFirst = ref('')
const formLast = ref('')
const formEmail = ref('')
const currentPass = ref('')
const newPass = ref('')
const confirmPass = ref('')
const formError = ref('')
/** success | fail overlay after submit (66.txt §12) */
const result = ref<'idle' | 'success' | 'fail'>('idle')
const resultMsg = ref('')

const MIN_PASSWORD = 8
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const title = computed(() => t(`account.profileEdit.${props.kind}.title`))
const lead = computed(() => t(`account.profileEdit.${props.kind}.lead`))

const hasStoredPassword = computed(() => account.hasAccountPassword())

function resetForm(): void {
  tried.value = false
  formError.value = ''
  result.value = 'idle'
  resultMsg.value = ''
  formFirst.value = firstName.value
  formLast.value = surname.value
  formEmail.value = email.value
  currentPass.value = ''
  newPass.value = ''
  confirmPass.value = ''
}

function showResult(ok: boolean, message: string): void {
  result.value = ok ? 'success' : 'fail'
  resultMsg.value = message
  window.setTimeout(() => {
    if (ok) close()
    else {
      result.value = 'idle'
      resultMsg.value = ''
    }
  }, ok ? 1400 : 1800)
}

watch(open, (v) => {
  if (v) resetForm()
  else {
    currentPass.value = ''
    newPass.value = ''
    confirmPass.value = ''
  }
})

watch(
  () => props.kind,
  () => {
    if (open.value) resetForm()
  },
)

const nameError = computed(() => {
  if (!tried.value || props.kind !== 'name') return ''
  if (formFirst.value.trim() === '' && formLast.value.trim() === '') {
    return t('account.profileEdit.name.errorEmpty')
  }
  return ''
})

const emailError = computed(() => {
  if (!tried.value || props.kind !== 'email') return ''
  const v = formEmail.value.trim()
  if (v === '') return t('account.profileEdit.email.errorRequired')
  if (!EMAIL_SHAPE.test(v)) return t('account.profileEdit.email.errorShape')
  return ''
})

const passwordError = computed(() => {
  if (!tried.value || props.kind !== 'password') return ''
  if (hasStoredPassword.value && currentPass.value === '') {
    return t('account.profileEdit.password.errorCurrent')
  }
  if (hasStoredPassword.value && !account.checkAccountPassword(currentPass.value)) {
    return t('account.profileEdit.password.errorWrong')
  }
  if (newPass.value.length < MIN_PASSWORD) {
    return t('account.profileEdit.password.errorShort', { min: MIN_PASSWORD })
  }
  if (confirmPass.value !== newPass.value) {
    return t('account.profileEdit.password.errorMismatch')
  }
  return ''
})

const fieldError = computed(
  () => nameError.value || emailError.value || passwordError.value || formError.value,
)

function close(): void {
  open.value = false
}

function onSubmit(): void {
  tried.value = true
  formError.value = ''
  if (fieldError.value) {
    showResult(false, fieldError.value || t('account.profileEdit.failGeneric'))
    return
  }

  try {
    if (props.kind === 'name') {
      firstName.value = formFirst.value.trim()
      surname.value = formLast.value.trim()
      showResult(true, t('account.profileEdit.successName'))
      return
    }

    if (props.kind === 'email') {
      const next = formEmail.value.trim()
      const changed = next.toLowerCase() !== email.value.trim().toLowerCase()
      email.value = next
      if (changed) account.clearEmailVerified()
      showResult(true, t('account.profileEdit.successEmail'))
      return
    }

    if (props.kind === 'password') {
      account.setAccountPassword(newPass.value)
      showResult(true, t('account.profileEdit.successPassword'))
    }
  } catch {
    showResult(false, t('account.profileEdit.failGeneric'))
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="vel-pedit"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="'vel-pedit-title'"
      data-testid="profile-edit-dialog"
      @keydown.esc.prevent="close"
    >
      <button
        type="button"
        class="vel-pedit__scrim"
        tabindex="-1"
        :aria-label="t('account.profileEdit.close')"
        @click="close"
      />

      <div class="vel-pedit__panel">
        <!-- Success / fail overlay (66.txt §12) -->
        <div
          v-if="result !== 'idle'"
          class="vel-pedit__result"
          :class="result === 'success' ? 'vel-pedit__result--ok' : 'vel-pedit__result--fail'"
          role="status"
          data-testid="profile-edit-result"
        >
          <span class="vel-pedit__result-ico" aria-hidden="true">
            <svg v-if="result === 'success'" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8" />
              <path d="m8 12.2 2.8 2.7 5.2-5.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8" />
              <path d="m9 9 6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </span>
          <p class="vel-pedit__result-msg m-0">{{ resultMsg }}</p>
        </div>

        <header class="vel-pedit__head">
          <div class="min-w-0">
            <h2 id="vel-pedit-title" class="vel-pedit__title m-0">{{ title }}</h2>
            <p class="vel-pedit__lead m-0">{{ lead }}</p>
          </div>
          <button
            type="button"
            class="vel-pedit__x"
            :aria-label="t('account.profileEdit.close')"
            @click="close"
          >
            ×
          </button>
        </header>

        <form class="vel-pedit__form" @submit.prevent="onSubmit">
          <template v-if="kind === 'name'">
            <VelField :label="t('account.personalData.surname')" :error="nameError || undefined">
              <VelInput
                v-model="formLast"
                autocomplete="family-name"
                data-testid="profile-edit-surname"
              />
            </VelField>
            <VelField :label="t('account.personalData.name')">
              <VelInput
                v-model="formFirst"
                autocomplete="given-name"
                data-testid="profile-edit-firstname"
              />
            </VelField>
          </template>

          <template v-else-if="kind === 'email'">
            <VelField
              :label="t('account.personalData.email')"
              :hint="t('account.profileEdit.email.hint')"
              :error="emailError || undefined"
            >
              <VelInput
                v-model="formEmail"
                type="email"
                autocomplete="email"
                data-testid="profile-edit-email"
              />
            </VelField>
          </template>

          <template v-else>
            <VelField
              v-if="hasStoredPassword"
              :label="t('account.profileEdit.password.current')"
              :error="passwordError || undefined"
            >
              <VelInput
                v-model="currentPass"
                type="password"
                autocomplete="current-password"
                data-testid="profile-edit-pass-current"
              />
            </VelField>
            <VelField
              :label="t('account.profileEdit.password.next')"
              :hint="t('account.profileEdit.password.hint', { min: MIN_PASSWORD })"
              :error="!hasStoredPassword ? passwordError || undefined : undefined"
            >
              <VelInput
                v-model="newPass"
                type="password"
                autocomplete="new-password"
                data-testid="profile-edit-pass-new"
              />
            </VelField>
            <VelField :label="t('account.profileEdit.password.confirm')">
              <VelInput
                v-model="confirmPass"
                type="password"
                autocomplete="new-password"
                data-testid="profile-edit-pass-confirm"
              />
            </VelField>
            <p v-if="hasStoredPassword && passwordError" class="vel-pedit__err m-0" role="alert">
              {{ passwordError }}
            </p>
          </template>

          <div class="vel-pedit__actions">
            <VelButton type="button" variant="outline" @click="close">
              {{ t('account.profileEdit.cancel') }}
            </VelButton>
            <VelButton type="submit" data-testid="profile-edit-save">
              {{ t('account.profileEdit.save') }}
            </VelButton>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.vel-pedit {
  position: fixed;
  inset: 0;
  z-index: 85;
  display: grid;
  place-items: center;
  padding: 0.75rem;
}

.vel-pedit__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: color-mix(in oklab, var(--color-fg) 48%, transparent);
  backdrop-filter: blur(4px);
  cursor: pointer;
}

.vel-pedit__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 24rem);
  max-height: min(92dvh, 36rem);
  overflow: auto;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 22%, transparent);
}

.vel-pedit__result {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: color-mix(in oklab, var(--color-surface) 92%, transparent);
  backdrop-filter: blur(6px);
  animation: vel-pedit-result-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-pedit__result--ok {
  color: #0b7d4e;
}

.vel-pedit__result--fail {
  color: var(--color-danger);
}

.vel-pedit__result-ico {
  display: grid;
  place-items: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 999px;
  background: color-mix(in oklab, currentColor 12%, #fff);
  border: 1.5px solid color-mix(in oklab, currentColor 35%, transparent);
  animation: vel-pedit-pop 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

.vel-pedit__result-ico svg {
  width: 1.75rem;
  height: 1.75rem;
}

.vel-pedit__result-msg {
  text-align: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-fg);
}

@keyframes vel-pedit-result-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes vel-pedit-pop {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.vel-pedit__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.15rem 1.15rem 0.85rem;
  border-bottom: 1px solid var(--color-line);
}

.vel-pedit__title {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-fg);
}

.vel-pedit__lead {
  margin-top: 0.3rem;
  font-size: 0.84rem;
  line-height: 1.45;
  color: var(--color-muted);
}

.vel-pedit__x {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-round);
  background: transparent;
  color: var(--color-muted);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.vel-pedit__x:hover {
  color: var(--color-fg);
  background: color-mix(in oklab, var(--color-fg) 6%, transparent);
}

.vel-pedit__form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.1rem 1.15rem 1.2rem;
}

.vel-pedit__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.25rem;
}

.vel-pedit__err {
  font-size: 0.82rem;
  color: var(--color-danger);
}
</style>
