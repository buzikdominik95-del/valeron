<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import VelField from '@/components/ui/VelField.vue'
import VelInput from '@/components/ui/VelInput.vue'
import VelButton from '@/components/ui/VelButton.vue'
import VelLogo from '@/components/ui/VelLogo.vue'

/**
 * Создание личного кабинета в конце расчёта.
 *
 * Этого шага не хватало: кнопка «Registrazione» на экране результата вела сразу
 * к письму, а между ними на эталоне стоит окно с почтой и паролем.
 *
 * ПАРОЛЬ НИКУДА НЕ СОХРАНЯЕТСЯ И НЕ ВЫХОДИТ ИЗ ЭТОГО ФАЙЛА. Он живёт в
 * локальных ref, которые умирают вместе с окном; ни в стор, ни в localStorage,
 * ни в адресную строку не попадает — там он пережил бы вкладку и достался бы
 * любому, кто откроет тот же браузер. Наружу компонент отдаёт СОБЫТИЕ и почту,
 * а отправлять пару на сервер будет слой api, когда тот появится.
 *
 * ДВА РЕЖИМА В ОДНОМ ОКНЕ — как на эталоне: создать кабинет или войти в
 * существующий. Разница между ними ровно в одном поле (повтор пароля) и в
 * подписи кнопки, поэтому это переключатель внутри окна, а не два окна.
 */
const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  /** Пользователь завершил регистрацию: наружу уходит только адрес почты. */
  (event: 'registered', email: string): void
}>()

const { t } = useI18n()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')

/* Запирает прокрутку под окном и держит open в согласии с DOM — того и другого
   нативный <dialog> сам не делает. Подробности в композабле. */
useNativeDialog(dialog, open)

type Mode = 'create' | 'login'

const mode = ref<Mode>('create')
const isCreate = computed(() => mode.value === 'create')

const email = ref('')
const password = ref('')
const confirm = ref('')
/* Показывать ошибки начинаем только после первой попытки отправки: подсвечивать
   пустое поле, к которому человек ещё не притронулся, — это ругань авансом. */
const tried = ref(false)

const uid = useId()
const tabsId = `vel-reg-tabs-${uid}`

/** Минимальная длина пароля. Ниже восьми — не пароль, а формальность. */
const MIN_PASSWORD = 8

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
  if (isCreate.value && password.value.length < MIN_PASSWORD) {
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
})

/* Закрыли окно — стираем пароль немедленно, не дожидаясь размонтирования.
   Окно живёт в разметке мастера и при закрытии остаётся в памяти. */
watch(open, (isOpen) => {
  if (isOpen) return
  password.value = ''
  confirm.value = ''
  tried.value = false
})

function onSubmit(): void {
  tried.value = true
  if (!isValid.value) return

  const address = email.value.trim()
  // Пароль наружу не отдаём — см. шапку файла.
  password.value = ''
  confirm.value = ''
  emit('registered', address)
}

function close(): void {
  open.value = false
}
</script>

<template>
  <!-- role="dialog" и aria-modal не нужны: у <dialog>, открытого через
       showModal(), они есть по умолчанию. -->
  <dialog ref="dialog" class="vel-reg" :aria-label="t('wizard.register.title')">
    <form class="vel-reg__form" @submit.prevent="onSubmit">
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
      -->
      <div :id="tabsId" class="vel-reg__tabs" role="tablist" :aria-label="t('wizard.register.title')">
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

      <VelField :label="t('wizard.register.email')" :error="emailError">
        <VelInput
          v-model="email"
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
          type="password"
          :autocomplete="isCreate ? 'new-password' : 'current-password'"
        />
      </VelField>

      <VelField v-if="isCreate" :label="t('wizard.register.confirm')" :error="confirmError">
        <VelInput v-model="confirm" type="password" autocomplete="new-password" />
      </VelField>

      <VelButton type="submit" block>
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
</style>
