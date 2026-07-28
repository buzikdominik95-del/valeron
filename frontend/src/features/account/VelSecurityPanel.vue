<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useTimeoutFn } from '@vueuse/core'
import { useAccountStore } from '@/stores/account.store'
import { OTP_LENGTH } from '@/composables/useOtpInput'
import VelBadge from '@/components/ui/VelBadge.vue'
import VelButton from '@/components/ui/VelButton.vue'
import VelSecurityRow from '@/features/account/VelSecurityRow.vue'
import VelOtpField from '@/features/account/VelOtpField.vue'

/**
 * Раздел «Sicurezza»: пароль, почта и её подтверждение.
 *
 * ЧТО ПАНЕЛЬ РЕШАЕТ САМА — ничего. Пароль и адрес меняются на своих экранах,
 * код проверяет сервер. Отсюда уходят четыре события, и к ним подключится
 * слой API: changePassword, changeEmail, sendCode и verify с набранным кодом.
 * Набор шести цифр в поле сам по себе ничего не подтверждает, поэтому пометку
 * «подтверждена» панель себе не ставит — её переводит account.store
 * (markEmailVerified) и только по положительному ответу сервера.
 *
 * Поле кода показывается не сразу: сначала «Invia codice». Шесть пустых ячеек
 * до того, как код отправлен, вводить нечего и предлагать незачем.
 *
 * Разметку одной строки держит VelSecurityRow — строк три, и выглядеть они
 * обязаны одинаково. Поведение ввода кода — VelOtpField и useOtpInput.
 */
const emit = defineEmits<{
  changePassword: []
  changeEmail: []
  /** Просьба выслать код: и первая отправка, и «Invia di nuovo». */
  sendCode: []
  verify: [code: string]
}>()

const { t } = useI18n()

const { emailVerified } = storeToRefs(useAccountStore())

const titleId = `vel-security-${useId()}`

/** Код уже запрошен — показываем поле ввода. Состояние экрана, не сервера. */
const codeRequested = ref(false)
const code = ref('')

/**
 * Счётчик отправок. Он же ключ поля: «Invia di nuovo» очищает ячейки, и после
 * этого курсор обязан вернуться в первую — набирать код с середины человек
 * не станет. Смена ключа пересоздаёт поле, а новое само уводит фокус в первую
 * ячейку (проп autofocus). Дёргать чужой компонент за выставленный наружу
 * метод ради одной строки не пришлось.
 */
const sendCount = ref(0)

const isCodeComplete = computed(() => code.value.length === OTP_LENGTH)

/**
 * Живая область. Глазами появление поля видно сразу, а для скринридера нажатие
 * «отправить код» иначе не даёт ровно ничего.
 *
 * Хранится ФЛАГ, а не готовая строка: сохранённый текст остался бы на языке,
 * который был в момент отправки, и после переключения локали в области висела
 * бы фраза из другого языка. Проверено на живой странице — так и было.
 *
 * Область сначала гасится и лишь потом заполняется: повторная отправка кладёт
 * в неё ту же фразу, а неизменившееся содержимое живой области не читается.
 * Пауза нужна не «на всякий случай» — за это время проходит отрисовка с пустой
 * областью, и следующая правка снова становится изменением.
 */
const announced = ref(false)
const announcement = computed(() => (announced.value ? t('account.security.verify.sent') : ''))

const { start: announceSent } = useTimeoutFn(
  () => {
    announced.value = true
  },
  120,
  { immediate: false },
)

function requestCode(): void {
  code.value = ''
  codeRequested.value = true
  sendCount.value += 1
  announced.value = false
  announceSent()
  emit('sendCode')
}

function confirmCode(): void {
  // Кнопка заблокирована до шестой цифры, но событие могло прийти с клавиатуры
  // раньше перерисовки — проверяем ещё раз здесь.
  if (!isCodeComplete.value) return
  emit('verify', code.value)
}
</script>

<template>
  <section
    class="vel-security rounded-panel border border-line bg-surface p-5 sm:p-6"
    :aria-labelledby="titleId"
  >
    <div class="flex items-center gap-2.5">
      <!-- Щит нарисован линией, как остальные знаки системы: эмодзи, которым
           раздел отмечен в оригинале, в интерфейс не переносим. Декор:
           рядом стоит заголовок, и знак ничего к нему не добавляет. -->
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

      <!-- id/testid: якорь для скролла к подтверждению email -->
      <div
        id="vel-security-verify"
        data-testid="security-verify"
        :class="{ 'vel-security__verify--pending': !emailVerified }"
      >
        <VelSecurityRow
          :title="t('account.security.verify.title')"
          :text="emailVerified ? undefined : t('account.security.verify.text')"
        >
          <template #status>
            <!-- Неподтверждённая почта: оранжевый «?» (как на Calipso) -->
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
            <VelBadge :class="{ 'vel-security__badge-pending': !emailVerified }">
              {{
                emailVerified
                  ? t('account.security.verify.verified')
                  : t('account.security.verify.unverified')
              }}
            </VelBadge>
          </template>

          <template #action>
            <VelButton v-if="!emailVerified && !codeRequested" @click="requestCode">
              {{ t('account.security.verify.send') }}
            </VelButton>
          </template>

          <div v-if="!emailVerified && codeRequested" class="flex flex-col gap-4 pt-1">
            <!-- Поле появилось в ответ на нажатие «отправить код»: фокус идёт
                 туда, куда человек только что попросил. -->
            <VelOtpField
              :key="sendCount"
              v-model="code"
              :label="t('account.security.verify.codeLabel')"
              autofocus
            />

            <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
              <VelButton :disabled="!isCodeComplete" @click="confirmCode">
                {{ t('account.security.verify.confirm') }}
              </VelButton>

              <p class="text-sm text-muted">
                {{ t('account.security.verify.resendQuestion') }}
                <!-- Именно кнопка, а не ссылка: перехода никуда не происходит,
                     она просит выслать код заново. -->
                <button type="button" class="vel-link vel-security__resend" @click="requestCode">
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
/*
  Панель объявлена контейнером: по её ширине строки решают, ставить кнопку
  рядом с текстом или под ним (см. VelSecurityRow). Имя обязательно —
  безымянный контейнер строка нашла бы и снаружи панели.
*/
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

/* Неподтверждённый email — мягкая оранжевая подсветка + «?» */
.vel-security__verify--pending {
  border-radius: var(--radius-control);
  outline: 1px solid color-mix(in oklab, #f59e0b 35%, transparent);
  background: color-mix(in oklab, #f59e0b 6%, transparent);
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
  animation: vel-security-q-pulse 1.8s ease-in-out infinite;
}

.vel-security__q svg {
  width: 0.78rem;
  height: 0.78rem;
}

.vel-security__badge-pending {
  border-color: color-mix(in oklab, #f59e0b 40%, var(--color-line)) !important;
  background: color-mix(in oklab, #fbbf24 14%, #fff) !important;
  color: #9a6410 !important;
}

@keyframes vel-security-q-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 3px color-mix(in oklab, #f59e0b 12%, transparent),
      0 0.35rem 0.75rem color-mix(in oklab, #f59e0b 14%, transparent);
  }

  50% {
    transform: scale(1.06);
    box-shadow:
      0 0 0 5px color-mix(in oklab, #f59e0b 22%, transparent),
      0 0.45rem 1rem color-mix(in oklab, #f59e0b 24%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-security__q {
    animation: none;
  }
}

/*
  Кнопка-ссылка: цвет, подчёркивание и высоту цели даёт .vel-link из @layer
  components, здесь снимаются только собственные украшения кнопки. Шрифт
  наследуем явно — иначе внутри абзаца она встанет системным лицом.
*/
.vel-security__resend {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  cursor: pointer;
}
</style>
