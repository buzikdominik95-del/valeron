<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMaskedInput } from '@/composables/useMaskedInput'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { useAccountStore } from '@/stores/account.store'
import { ibanExpectedLength, ibanShapeProblem } from '@/lib/iban'
import { PAYOUT_ACCOUNT_RULES } from '@/features/account/payout-fields'
import VelButton from '@/components/ui/VelButton.vue'
import VelField from '@/components/ui/VelField.vue'
import VelInput from '@/components/ui/VelInput.vue'

/**
 * Окно «IBAN per l’accredito» — счёт, на который банк зачислит кредит.
 *
 * ПОЧЕМУ ОТДЕЛЬНО ОТ ОКНА ВЫВОДА. VelPayoutDialog спрашивает реквизиты для
 * ВЫВОДА, и отправка там заперта условием canWithdraw — пройдены все пять
 * шагов. На шаге подписи пятый шаг ещё открыт, то есть окно вывода в этот
 * момент показало бы форму, которую нельзя отправить: тупик вместо действия.
 * Здесь спрашивается ровно одно поле и ровно для одного — подставить счёт
 * в лист договора.
 *
 * ПОЛНЫЙ НОМЕР НИГДЕ НЕ ОСЕДАЕТ. Он живёт только в поле, пока окно открыто;
 * в стор уходит уже маска (см. maskIban и комментарий у ibanMasked в
 * account.store), а после отправки поле чистится. Лишняя копия номера счёта
 * в памяти вкладки — ровно то, чего быть не должно.
 *
 * ГОДНОСТЬ ЗДЕСЬ — ЭТО ДЛИНА, И БОЛЬШЕ НИЧЕГО. Контрольная сумма ISO 7064
 * MOD 97-10 из условия отправки снята сознательно, по просьбе владельца продукта: её
 * отказ звучал как «IBAN non valido» и не объяснял ничего — mod-97 отвечает
 * только «да» или «нет» и не показывает, где ошибка. Сама функция жива в
 * @/lib/iban, там же расписана цена решения (испорченную цифру теперь ловит
 * банк, а не поле) и как вернуть её обратно одной строкой.
 *
 * Вместо отказа — счётчик. Пока знаков меньше, чем предписано стране реестром
 * ISO 13616, под полем стоит «сколько осталось», а не «неверно»; красная
 * строка приберегается для заведомо негодного (ibanShapeProblem). Как только
 * знаков ровно столько, сколько надо, поле перестаёт печатать: лишний знак
 * просто не входит, и отказывать не за что.
 *
 * Нативный <dialog> с showModal() даёт ловушку фокуса, Escape, инертность фона
 * и возврат фокуса на кнопку; замок прокрутки добирает useNativeDialog.
 */
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n()
const accountStore = useAccountStore()

const uid = useId()
const titleId = `vel-contract-iban-title-${uid}`
const leadId = `vel-contract-iban-lead-${uid}`

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
useNativeDialog(dialog, open)

/* Правила поля берутся из общей таблицы: своя пара чисел здесь однажды
   разошлась бы с проверкой из @/lib/iban. */
const rule = PAYOUT_ACCOUNT_RULES.iban

const value = ref('')
const input = useTemplateRef<ComponentPublicInstance>('input')

/**
 * Сколько знаков ждёт реестр ISO 13616 от страны, код которой уже набран.
 * Италия — 27. Страну, которой в реестре нет, поле не выдумывает: для неё
 * остаются общие границы 15…34 из таблицы правил.
 */
const expected = computed(() => ibanExpectedLength(value.value))

/** Предел ввода: набрали столько — дальше поле не печатает. */
const limit = computed(() => expected.value ?? rule.max)

/** Сколько знаков должно набраться, чтобы номер считался набранным. */
const required = computed(() => expected.value ?? rule.min)

const { raw } = useMaskedInput(() => input.value, {
  model: value,
  /*
   * Предел считается по ЧИСТЫМ знакам, а не по длине видимой строки: номер
   * показан четвёрками через пробел, и в полном итальянском IBAN это 27 знаков
   * плюс 6 пробелов — голый maxlength="27" оборвал бы ввод на шесть знаков
   * раньше срока. Маска пробелы не считает: они не проходят её фильтр allow,
   * см. significant() в useMaskedInput. Геттером, а не числом, — код страны
   * можно переписать посреди набора, и предел обязан переехать вместе с ним.
   */
  maxLength: () => limit.value,
  allow: rule.allow,
  upper: rule.upper,
})

/** Сколько знаков ещё дописать. Ноль — номер набран целиком. */
const remaining = computed(() => Math.max(required.value - raw.value.length, 0))

/**
 * Ошибка красным — только про заведомо негодное: посторонний знак или цифра
 * на месте кода страны. Недобор длины сюда не попадает: человек ещё печатает,
 * и про остаток говорит подсказка. Ветку 'chars' набором не вызвать — маска
 * посторонние знаки в поле не пускает; она про значение, положенное в модель
 * мимо поля, и стоит здесь ровно поэтому.
 */
const error = computed(() => {
  if (raw.value === '') return null

  const problem = ibanShapeProblem(raw.value)
  if (problem === null) return null

  return problem === 'chars' ? t('contract.iban.badChars') : t('contract.iban.country')
})

/** Подсказка: пока недобор — счётчик остатка, иначе общее правило поля. */
const hint = computed(() =>
  raw.value !== '' && remaining.value > 0
    ? t('contract.iban.remaining', { count: remaining.value })
    : t('contract.iban.hint'),
)

/**
 * Готовность = длина сошлась. Заведомо негодное всё-таки не пускаем: живая
 * кнопка под красной строкой — это окно, спорящее само с собой.
 */
const ready = computed(() => remaining.value === 0 && error.value === null)

/**
 * ТРИ ШАГА ОКНА.
 *
 * 'entry'   — набрать или поменять номер;
 * 'confirm' — прочитать набранное и подтвердить;
 * 'done'    — счёт сохранён.
 *
 * ЗАЧЕМ ШАГ ПОДТВЕРЖДЕНИЯ, А НЕ СРАЗУ СОХРАНЕНИЕ. Контрольная сумма ISO 7064
 * MOD 97-10 из условия отправки снята сознательно (см. шапку файла): её отказ
 * ничего не объяснял. Но вместе с ней ушла и единственная проверка, ловившая
 * ОПЕЧАТКУ В ЦИФРЕ — длина сходится и у номера с переставленными знаками.
 * Значит последней преградой перед банком остаётся сам человек, и ему нужно
 * дать номер перечитать: на шаге 'confirm' он показан крупно и четвёрками,
 * рядом кнопка вернуться и поправить.
 *
 * Цена ошибки здесь несимметрична: лишние две секунды на читку против кредита,
 * ушедшего на чужой счёт.
 */
type Step = 'entry' | 'confirm' | 'done'

const step = ref<Step>('entry')

/** Порядок шагов для указателя вверху окна. */
const STEPS: readonly Step[] = ['entry', 'confirm', 'done']

const stepIndex = computed(() => STEPS.indexOf(step.value))

/**
 * Номер для читки — теми же четвёрками, что и в поле. Берётся из raw, а не из
 * стора: в сторе лежит уже маска, по ней проверять нечего.
 */
const grouped = computed(() => raw.value.replace(/(.{4})/g, '$1 ').trim())

/** Сохранённая маска — её показываем на последнем шаге. */
const savedMask = computed(() => accountStore.ibanMasked)

function toConfirm(): void {
  // Кнопка заперта, но submit мог прийти по Enter до перерисовки.
  if (!ready.value) return
  step.value = 'confirm'
}

/** Вернуться и поправить номер: поле сохраняет набранное. */
function backToEntry(): void {
  step.value = 'entry'
}

function confirmSave(): void {
  if (!ready.value) return

  /* Полный IBAN + маска: иначе Preleva не сможет автозаполнить поле.
     setIbanFromRaw сразу ставит ibanProvided=true → Firma разблокируется. */
  accountStore.setIbanFromRaw(raw.value)
  /* Полный номер стираем СРАЗУ после сохранения: на последнем шаге показывается
     маска из стора, и держать полную копию в памяти вкладки больше незачем. */
  value.value = ''
  step.value = 'done'
  emit('saved')
  /* После «Fatto» сразу закрываем — человек видит активную Firma на карточке. */
  open.value = false
}

function close(): void {
  open.value = false
}

/*
 * Открытие всегда начинает с первого шага и с чистого поля.
 * Окно живёт в разметке кабинета и при закрытии остаётся в памяти: без сброса
 * человек, открывший его второй раз, попал бы на экран «сохранено» от прошлого
 * раза, а в поле лежал бы чужой набор.
 */
watch(open, (isOpen) => {
  if (!isOpen) return
  step.value = 'entry'
  value.value = ''
})
</script>

<template>
  <!-- role="dialog" и aria-modal не пишем: у <dialog>, открытого через
       showModal(), они уже есть. Дублировать их значит спорить с браузером. -->
  <dialog ref="dialog" class="vel-ciban" :aria-labelledby="titleId" :aria-describedby="leadId">
    <form class="vel-ciban__form" @submit.prevent="step === 'entry' ? toConfirm() : confirmSave()">
      <button type="button" class="vel-ciban__close" :aria-label="t('contract.iban.close')" @click="close">
        <svg class="vel-ciban__close-icon" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 4 12 12M12 4 4 12" fill="none" stroke="currentColor" stroke-width="1.5" />
        </svg>
      </button>

      <div class="vel-ciban__head">
        <h2 :id="titleId" class="vel-ciban__title">{{ t('contract.iban.title') }}</h2>
        <p :id="leadId" class="vel-ciban__lead">{{ t('contract.iban.lead') }}</p>
      </div>

      <!--
        Указатель шагов, а НЕ вкладки: перескочить на «сохранено», не набрав
        номер, нельзя, а role="tab" обещал бы именно это. Обычный список с
        aria-current="step" говорит правду: вот где мы сейчас.
      -->
      <ol class="vel-ciban__steps">
        <li
          v-for="(name, index) in STEPS"
          :key="name"
          class="vel-ciban__step"
          :class="{
            'vel-ciban__step--on': index === stepIndex,
            'vel-ciban__step--done': index < stepIndex,
          }"
          :aria-current="index === stepIndex ? 'step' : undefined"
        >
          <span class="vel-ciban__step-num" aria-hidden="true">{{ index + 1 }}</span>
          {{ t(`contract.iban.steps.${name}`) }}
        </li>
      </ol>

      <!-- ШАГ 1: набрать номер -->
      <template v-if="step === 'entry'">
        <VelField
          :label="t('contract.iban.label')"
          :hint="hint"
          :error="error ?? undefined"
        >
          <VelInput
            ref="input"
            v-model="value"
            :placeholder="t('contract.iban.placeholder')"
            :inputmode="rule.inputMode"
            :autocomplete="rule.autocomplete"
            spellcheck="false"
          />
        </VelField>

        <p class="vel-ciban__privacy">{{ t('contract.iban.privacy') }}</p>

        <VelButton type="submit" size="lg" block :disabled="!ready">
          {{ t('contract.iban.next') }}
        </VelButton>
      </template>

      <!-- ШАГ 2: перечитать и подтвердить -->
      <template v-else-if="step === 'confirm'">
        <div class="vel-ciban__check">
          <p class="vel-label">{{ t('contract.iban.checkLabel') }}</p>
          <!-- lang="en" и разрядка по четвёркам: скринридер обязан прочитать
               номер знаками, а не пытаться выговорить его как слово. -->
          <p class="vel-ciban__number vel-num" lang="en">{{ grouped }}</p>
        </div>

        <p class="vel-ciban__warn">{{ t('contract.iban.checkWarn') }}</p>

        <div class="vel-ciban__actions">
          <VelButton type="button" variant="ghost" size="lg" @click="backToEntry">
            {{ t('contract.iban.back') }}
          </VelButton>
          <VelButton type="submit" size="lg">
            {{ t('contract.iban.submit') }}
          </VelButton>
        </div>
      </template>

      <!-- ШАГ 3: сохранено -->
      <template v-else>
        <p class="vel-ciban__saved">{{ t('contract.iban.savedLead') }}</p>
        <p class="vel-ciban__number vel-num" lang="en">{{ savedMask }}</p>

        <VelButton type="button" size="lg" block @click="close">
          {{ t('contract.iban.done') }}
        </VelButton>
      </template>
    </form>
  </dialog>
</template>

<style scoped>
.vel-ciban {
  inline-size: min(100% - 2rem, 30rem);
  /* Низкое окно (ландшафт на телефоне) прокручивается само, а не вылезает. */
  max-block-size: min(90dvh, 40rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  /* Нативные рамка и отступ у <dialog> свои — отступ несёт форма. */
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 24%, transparent);
}

/* ::backdrop наследует свойства элемента только в свежих движках; там, где
   наследования нет, объявление тихо отбрасывается — окно останется белой
   панелью с тенью, а инертность фона даёт сам showModal(). */
.vel-ciban::backdrop {
  background-color: color-mix(in oklab, var(--color-fg) 55%, transparent);
}

.vel-ciban__form {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
}

.vel-ciban__close {
  position: absolute;
  inset-block-start: 0.5rem;
  inset-inline-end: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 2.75rem — норма WCAG 2.5.8: растёт зона, а не рисунок. */
  inline-size: 2.75rem;
  block-size: 2.75rem;
  border-radius: var(--radius-control);
  color: var(--color-muted);
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.vel-ciban__close:hover,
.vel-ciban__close:active {
  background-color: var(--color-raised);
  color: var(--color-fg);
}

.vel-ciban__close-icon {
  inline-size: 1rem;
  block-size: 1rem;
}

.vel-ciban__head {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-inline-end: 2.5rem;
}

.vel-ciban__title {
  margin: 0;
  font-size: 1.35rem;
}

.vel-ciban__lead {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.85rem;
  line-height: 1.45;
}

.vel-ciban__privacy {
  margin: 0;
  color: var(--color-faint);
  font-size: 0.72rem;
  line-height: 1.45;
}

/* ── Указатель трёх шагов ─────────────────────────────────────────────── */

.vel-ciban__steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.vel-ciban__step {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.35rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  color: var(--color-muted);
  font-size: 0.74rem;
  font-weight: 600;
  /* Подпись шага на узком экране не должна ломать ряд переносом */
  white-space: nowrap;
}

/* Пройденный и текущий шаги различаются НЕ ТОЛЬКО цветом: у текущего залитый
   номер, у пройденного — рамка акцентом. Плюс aria-current в разметке. */
.vel-ciban__step--done {
  border-color: var(--color-accent);
  color: var(--color-accent-deep);
}

.vel-ciban__step--on {
  border-color: var(--color-accent);
  background-color: var(--color-raised);
  color: var(--color-accent-deep);
}

.vel-ciban__step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.15rem;
  block-size: 1.15rem;
  border: 1px solid currentColor;
  border-radius: var(--radius-round);
  font-size: 0.66rem;
}

.vel-ciban__step--on .vel-ciban__step-num {
  border-color: transparent;
  background-color: var(--color-accent);
  color: var(--color-accent-ink);
}

/* ── Шаг читки и шаг «сохранено» ──────────────────────────────────────── */

.vel-ciban__check {
  display: grid;
  gap: 0.4rem;
  padding: 0.85rem 0.9rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background-color: var(--color-raised);
}

/* Номер — крупно и с разрядкой: его читают знак за знаком, а не пробегают. */
.vel-ciban__number {
  margin: 0;
  color: var(--color-fg);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  /* Длинный номер обязан переноситься, а не расширять окно */
  overflow-wrap: anywhere;
}

.vel-ciban__warn {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.vel-ciban__saved {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.85rem;
}

/* Две кнопки в ряд, но на узком экране — друг под другом: рядом они дают
   цель нажатия уже 44px на телефоне. */
.vel-ciban__actions {
  display: grid;
  gap: 0.5rem;
}

@media (min-width: 26rem) {
  .vel-ciban__actions {
    grid-template-columns: auto 1fr;
  }
}

/* Появление: окно приподнимается. Анимация, а не переход: элемент приходит
   из display: none, и переходу не с чего стартовать. */
.vel-ciban[open] {
  animation: vel-ciban-in 200ms ease-out;
}

@keyframes vel-ciban-in {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  /* Сброс в main.css правит только длительность — анимация всё равно
     проигралась бы, просто мгновенно. Снимаем её целиком. */
  .vel-ciban[open] {
    animation: none;
  }

  .vel-ciban__close {
    transition: none;
  }
}
</style>
