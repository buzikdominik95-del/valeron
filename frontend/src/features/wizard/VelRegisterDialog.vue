<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { isApiEnabled } from '@/api/account.api'
import { login as apiLogin, register as apiRegister } from '@/api/auth.api'
import { ApiError } from '@/api/http'
import { restoreApiSession } from '@/api/session'
import { useAccountStore } from '@/stores/account.store'
import { useSimulatorStore } from '@/stores/simulator.store'
import VelField from '@/components/ui/VelField.vue'
import VelInput from '@/components/ui/VelInput.vue'
import VelButton from '@/components/ui/VelButton.vue'
import VelLogo from '@/components/ui/VelLogo.vue'

/**
 * Создание / вход в личный кабинет.
 *
 * API (бек Modules/Users): Bearer token после login/register.
 * Register: name + email + password + password_confirmation (min 8).
 * Login: email + password (min 8). Пароль не в localStorage.
 *
 * Offline-стенд: пароль только в account store для локального «Cambia password».
 */
const open = defineModel<boolean>('open', { required: true })

const props = withDefaults(
  defineProps<{
    /** Стартовый режим вкладок (лендинг Accedi → login). */
    startMode?: 'create' | 'login'
    /**
     * Только «Accedi» (без Crea account) — вход с лендинга.
     * Create остаётся в конце мастера.
     */
    loginOnly?: boolean
    /**
     * Email, под которым уже создали кабинет (simulator.email).
     * Login сверяет ввод с ним; без совпадения в кабинет не пускаем.
     */
    knownEmail?: string
  }>(),
  { startMode: 'create', loginOnly: false, knownEmail: '' },
)

const emit = defineEmits<{
  /** Пользователь завершил регистрацию / успешный вход: наружу только email. */
  (event: 'registered', email: string): void
  /** Успешный вход (режим Accedi). */
  (event: 'login', email: string): void
}>()

const { t } = useI18n()
const account = useAccountStore()
const simulator = useSimulatorStore()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const formEl = useTemplateRef<HTMLFormElement>('formEl')

/* Запирает прокрутку под окном и держит open в согласии с DOM — того и другого
   нативный <dialog> сам не делает. Подробности в композабле. */
useNativeDialog(dialog, open)

type Mode = 'create' | 'login'

const mode = ref<Mode>(props.startMode)
const isCreate = computed(() => mode.value === 'create' && !props.loginOnly)

const email = ref('')
const password = ref('')
const confirm = ref('')
/* Показывать ошибки начинаем только после первой попытки отправки: подсвечивать
   пустое поле, к которому человек ещё не притронулся, — это ругань авансом. */
const tried = ref(false)
/** Ошибка входа (нет аккаунта / неверная почта) — не поле, а форма целиком. */
const authError = ref('')
const submitting = ref(false)

const uid = useId()
const tabsId = `vel-reg-tabs-${uid}`

/** Backend main AuthController: password min 6. */
const MIN_PASSWORD = 6

/*
 * Проверка адреса нарочно грубая: «что-то, собака, что-то, точка, что-то».
 * Точные правила почтовых адресов сложнее, чем кажется, и строгое регулярное
 * выражение чаще отвергает живой адрес, чем ловит опечатку. Настоящая проверка
 * — письмо, которое придёт следующим экраном.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emailError = computed(() => {
  if (!tried.value) return ''
  if (email.value.trim() === '') return t('wizard.register.errors.emailRequired')
  return EMAIL_SHAPE.test(email.value.trim()) ? '' : t('wizard.register.errors.emailShape')
})

const passwordError = computed(() => {
  if (!tried.value) return ''
  if (password.value === '') return t('wizard.register.errors.passwordRequired')
  /* Backend LoginRequest + RegisterRequest: min 8 */
  if (password.value.length < MIN_PASSWORD) {
    return t('wizard.register.errors.passwordShort', { min: MIN_PASSWORD })
  }
  return ''
})

const confirmError = computed(() => {
  if (!tried.value || !isCreate.value) return ''
  if (confirm.value === '') return t('wizard.register.errors.confirmRequired')
  return confirm.value === password.value ? '' : t('wizard.register.errors.confirmMismatch')
})

const isValid = computed(
  () => emailError.value === '' && passwordError.value === '' && confirmError.value === '',
)

/** Смена режима сбрасывает разбор ошибок: поля у режимов разные. */
watch(mode, () => {
  tried.value = false
  confirm.value = ''
  authError.value = ''
})

/* Открыли — выставляем стартовый режим (лендинг: Accedi). */
watch(open, (isOpen) => {
  if (isOpen) {
    mode.value = props.loginOnly ? 'login' : props.startMode
    authError.value = ''
    return
  }
  /* Закрыли окно — стираем пароль немедленно, не дожидаясь размонтирования. */
  password.value = ''
  confirm.value = ''
  tried.value = false
  authError.value = ''
  submitting.value = false
})

function clearSecrets(): void {
  password.value = ''
  confirm.value = ''
}

function finishSuccess(address: string, kind: 'login' | 'registered'): void {
  clearSecrets()
  /*
   * Для level switcher сохраняем email в simulator/localStorage-цепочке,
   * иначе /commission/advance может получить пустой/stub email.
   */
  simulator.email = address
  if (kind === 'login') emit('login', address)
  else emit('registered', address)
}

/** Offline: без захардкоженного password на бек. */
const NAME_DIGITS_RE = /\d+/g

function stripNameDigits(value: string): string {
  return value.replace(NAME_DIGITS_RE, '')
}

function submitOffline(address: string, pwd: string): void {
  if (!isCreate.value) {
    const known = (props.knownEmail ?? '').trim().toLowerCase()
    if (known === '' || address.toLowerCase() !== known) {
      authError.value = t('wizard.register.errors.noAccount')
      return
    }
    if (account.hasAccountPassword() && !account.checkAccountPassword(pwd)) {
      authError.value = t('wizard.register.errors.credentials')
      return
    }
    finishSuccess(address, 'login')
    return
  }

  account.setAccountPassword(pwd)
  finishSuccess(address, 'registered')
}

async function submitOnline(address: string, pwd: string): Promise<void> {
  restoreApiSession()
  /*
   * main AuthController::register — name, email, password(+confirm),
   * surname, requested_amount, document_* из мастера.
   */
  const first = stripNameDigits(simulator.firstName).trim()
  const last = stripNameDigits(simulator.surname).trim()
  const name = first || last || address.split('@')[0] || 'Cliente'

  try {
    if (isCreate.value) {
      const session = await apiRegister({
        email: address,
        password: pwd,
        passwordConfirmation: confirm.value,
        name,
        surname: last || undefined,
        requestedAmount: Number(simulator.amount) || undefined,
        loanTermMonths: Number(simulator.termMonths) || undefined,
        documentType: simulator.docType.trim() || undefined,
        documentNumber: simulator.docNumber.trim() || undefined,
      })
      if (session.user.email_verified_at) account.markEmailVerified()
      else account.clearEmailVerified()
      simulator.email = address
      if (first) simulator.firstName = first
      if (last) simulator.surname = last
      finishSuccess(address, 'registered')
      return
    }
    const session = await apiLogin({ email: address, password: pwd })
    if (session.user.email_verified_at) account.markEmailVerified()
    else account.clearEmailVerified()

    simulator.email = address

    const loginName = String(session.user.name ?? '').trim()
    const loginSurname = String(session.user.surname ?? '').trim()

    if (loginName) simulator.firstName = stripNameDigits(loginName).trim() || loginName
    if (loginSurname) simulator.surname = stripNameDigits(loginSurname).trim() || loginSurname

    finishSuccess(address, 'login')
  } catch (e: unknown) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 422)) {
      authError.value = e.message || t('wizard.register.errors.credentials')
      return
    }
    authError.value = t('wizard.register.errors.server')
  }
}


function syncModelFromDomAutofill(): void {
  const form = formEl.value
  if (!form) return

  const fd = new FormData(form)
  const domEmail = String(fd.get('email') ?? '').trim()
  const domPassword = String(fd.get('password') ?? '')
  const domConfirm = String(fd.get('password_confirmation') ?? '')

  if (domEmail && domEmail !== email.value) email.value = domEmail
  if (domPassword && domPassword !== password.value) password.value = domPassword
  if (domConfirm && domConfirm !== confirm.value) confirm.value = domConfirm
}

async function onSubmit(): Promise<void> {
  syncModelFromDomAutofill()
  tried.value = true
  authError.value = ''
  if (!isValid.value || submitting.value) return

  const address = email.value.trim()
  const pwd = password.value
  submitting.value = true
  try {
    restoreApiSession()
    if (isApiEnabled()) await submitOnline(address, pwd)
    else submitOffline(address, pwd)
  } finally {
    submitting.value = false
  }
}

function close(): void {
  open.value = false
}
</script>

<template>
  <!-- role="dialog" и aria-modal не нужны: у <dialog>, открытого через
       showModal(), они есть по умолчанию. -->
  <dialog ref="dialog" class="vel-reg" :aria-label="t('wizard.register.title')">
    <form ref="formEl" class="vel-reg__form" @submit.prevent="onSubmit">
      <button type="button" class="vel-reg__close" :aria-label="t('common.close')" @click="close">
        <svg class="size-4" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M3 3l10 10M13 3L3 13"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <div class="vel-reg__brand">
        <VelLogo />
        <p class="vel-reg__secure">
          <svg class="size-3.5" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 1.5l5 2v4.2c0 3.2-2.1 6-5 6.8-2.9-.8-5-3.6-5-6.8V3.5l5-2z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linejoin="round"
            />
          </svg>
          {{ t('wizard.register.secure') }}
        </p>
      </div>

      <!--
        Настоящие вкладки, а не пара кнопок: под ними меняется состав формы,
        и скринридер обязан понимать, что это выбор между двумя панелями.
        loginOnly (лендинг): только Accedi — создать кабинет можно после мастера.
      -->
      <div
        v-if="!props.loginOnly"
        :id="tabsId"
        class="vel-reg__tabs"
        role="tablist"
        :aria-label="t('wizard.register.title')"
      >
        <button
          type="button"
          role="tab"
          class="vel-reg__tab"
          :class="{ 'vel-reg__tab--on': isCreate }"
          :aria-selected="isCreate"
          @click="mode = 'create'"
        >
          {{ t('wizard.register.tabCreate') }}
        </button>
        <button
          type="button"
          role="tab"
          class="vel-reg__tab"
          :class="{ 'vel-reg__tab--on': !isCreate }"
          :aria-selected="!isCreate"
          @click="mode = 'login'"
        >
          {{ t('wizard.register.tabLogin') }}
        </button>
      </div>

      <p class="vel-reg__lead">
        {{ isCreate ? t('wizard.register.leadCreate') : t('wizard.register.leadLogin') }}
      </p>

      <p v-if="authError" class="vel-reg__auth-error" role="alert">{{ authError }}</p>

      <VelField :label="t('wizard.register.email')" :error="emailError">
        <VelInput
          v-model="email"
          name="email"
          type="email"
          autocomplete="email"
          spellcheck="false"
          inputmode="email"
        />
      </VelField>

      <VelField :label="t('wizard.register.password')" :error="passwordError">
        <!-- autocomplete подсказан менеджеру паролей честно: при создании
             кабинета он предложит новый пароль, при входе — сохранённый. -->
        <VelInput
          v-model="password"
          name="password"
          type="password"
          :autocomplete="isCreate ? 'new-password' : 'current-password'"
        />
      </VelField>

      <VelField v-if="isCreate" :label="t('wizard.register.confirm')" :error="confirmError">
        <VelInput
          v-model="confirm"
          name="password_confirmation"
          type="password"
          autocomplete="new-password"
        />
      </VelField>

      <VelButton
          type="submit"
          block
          :disabled="submitting"
        >
        {{ isCreate ? t('wizard.register.submitCreate') : t('wizard.register.submitLogin') }}
        <span aria-hidden="true">›</span>
      </VelButton>

      <p class="vel-reg__note">
        <svg class="size-3.5" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M4 7V5a4 4 0 018 0v2M3.5 7h9v6.5h-9z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linejoin="round"
          />
        </svg>
        {{ t('wizard.register.encrypted') }}
      </p>
    </form>
  </dialog>
</template>

<style scoped>
.vel-reg {
  inline-size: min(24rem, calc(100vw - 2rem));
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  color: var(--color-fg);
}

.vel-reg::backdrop {
  background-color: color-mix(in oklab, var(--color-accent-deep) 46%, transparent);
}

.vel-reg__form {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.75rem 1.5rem 1.5rem;
}

.vel-reg__close {
  position: absolute;
  inset-block-start: 0.35rem;
  inset-inline-end: 0.35rem;
  /* Цель нажатия 44: крестик маленький, но попадать в него пальцем. */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 2.75rem;
  min-block-size: 2.75rem;
  border: 0;
  border-radius: var(--radius-control);
  background: none;
  color: var(--color-muted);
  cursor: pointer;
}

.vel-reg__close:hover {
  color: var(--color-fg);
}

.vel-reg__brand {
  display: grid;
  justify-items: center;
  gap: 0.4rem;
}

.vel-reg__secure,
.vel-reg__note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0;
  color: var(--color-muted);
  font-size: 0.78rem;
}

/* Переключатель режимов: рамка общая, активная половина залита акцентом */
.vel-reg__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background-color: var(--color-raised);
}

.vel-reg__tab {
  min-block-size: 2.75rem;
  border: 0;
  background: none;
  color: var(--color-muted);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.vel-reg__tab--on {
  background-color: var(--color-accent);
  color: var(--color-accent-ink);
}

.vel-reg__lead {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.85rem;
  text-align: center;
}

.vel-reg__auth-error {
  margin: 0;
  padding: 0.65rem 0.75rem;
  border: 1px solid color-mix(in oklab, var(--color-danger) 40%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-danger) 8%, var(--color-surface));
  color: var(--color-danger);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
}
</style>
