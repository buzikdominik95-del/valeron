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

const MIN_PASSWORD = 8
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const title = computed(() => t(`account.profileEdit.${props.kind}.title`))
const lead = computed(() => t(`account.profileEdit.${props.kind}.lead`))

const hasStoredPassword = computed(() => account.hasAccountPassword())

function resetForm(): void {
  tried.value = false
  formError.value = ''
  formFirst.value = firstName.value
  formLast.value = surname.value
  formEmail.value = email.value
  currentPass.value = ''
  newPass.value = ''
  confirmPass.value = ''
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
  if (fieldError.value) return

  if (props.kind === 'name') {
    firstName.value = formFirst.value.trim()
    surname.value = formLast.value.trim()
    close()
    return
  }

  if (props.kind === 'email') {
    const next = formEmail.value.trim()
    const changed = next.toLowerCase() !== email.value.trim().toLowerCase()
    email.value = next
    if (changed) account.clearEmailVerified()
    close()
    return
  }

  if (props.kind === 'password') {
    account.setAccountPassword(newPass.value)
    close()
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
