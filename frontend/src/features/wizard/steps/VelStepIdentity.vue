<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useWizard } from '@/composables/useWizard'
import { useStaggerReveal } from '@/composables/useStaggerReveal'
import { useAutoAnimate } from '@/composables/useAutoAnimate'
import { useSimulatorStore } from '@/stores/simulator.store'
import {
  docNumberExample,
  docNumberProblem,
  isDocNumberValid,
  normalizeDocNumber,
} from '@/features/wizard/doc-number'
import VelField from '@/components/ui/VelField.vue'
import VelInput from '@/components/ui/VelInput.vue'
import VelSelect from '@/components/ui/VelSelect.vue'
import VelButton from '@/components/ui/VelButton.vue'
import type { VelSelectOption } from '@/types/velora'

/**
 * Шаг мастера: личные данные.
 * Значения живут в сторе, а не в локальных ref: возврат на предыдущий шаг
 * размонтирует форму, и с локальным состоянием всё введённое стиралось бы.
 * Отправку пока заменяет переход дальше — вызов API встанет в onSubmit
 * без правки разметки.
 *
 * Появление: заголовок и поля выезжают очередью (useStaggerReveal).
 * Номер документа — отдельный «новый» инпут: в DOM только после выбора
 * типа, и контейнер плавно раздвигает соседей (useAutoAnimate).
 */
const { t } = useI18n()
const { next } = useWizard()

const store = useSimulatorStore()
const { surname, firstName: givenName, gender, docType, docNumber } = storeToRefs(store)

const GENDERS = ['male', 'female'] as const

/**
 * Значения совпадают с ключами переводов wizard.identity.docTypes.*,
 * а порядок — с порядком пунктов на экране.
 */
const DOC_TYPES = ['passport', 'idCard', 'licence', 'residence', 'other'] as const

/**
 * Переименованные ключи: старое значение → новое. Тип документа лежит в
 * localStorage и переживает выкладку, поэтому 'id' ещё вернётся из браузеров,
 * где форму заполняли до переименования в 'idCard'. Документ тот же — переносим
 * выбор, а не сбрасываем.
 */
const LEGACY_DOC_TYPES: Record<string, string> = { id: 'idCard' }

/**
 * Приводит сохранённое значение к одному из существующих пунктов. Без этого
 * пользователь со старым ключом получил бы выбранный, но отсутствующий в списке
 * тип: кнопка показывала бы заглушку, а isValid считала бы поле заполненным.
 */
function restoreDocType(saved: string): string {
  const migrated = LEGACY_DOC_TYPES[saved] ?? saved
  return (DOC_TYPES as readonly string[]).includes(migrated) ? migrated : ''
}

// Чиним сохранённое состояние один раз при инициализации — до watch ниже,
// иначе перенос выбора тут же стёр бы относящийся к нему номер.
const restoredDocType = restoreDocType(docType.value)
if (restoredDocType !== docType.value) {
  docType.value = restoredDocType
}

const formId = `vel-identity-form-${useId()}`
const formRoot = useTemplateRef<HTMLElement>('formRoot')
const fieldsRoot = useTemplateRef<HTMLElement>('fieldsRoot')

useStaggerReveal(formRoot, { y: 18, stagger: 0.085, duration: 0.44, delay: 0.06 })
/* childList: номер документа появляется/исчезает — соседи плавно разъезжаются */
useAutoAnimate(fieldsRoot, { duration: 280 })

const docTypeOptions = computed<VelSelectOption[]>(() =>
  DOC_TYPES.map((value) => ({
    value,
    label: t(`wizard.identity.docTypes.${value}`),
  })),
)

const hasDocType = computed(() => docType.value !== '')

const NAME_DIGITS_RE = /\d+/g

function stripNameDigits(value: string): string {
  return value.replace(NAME_DIGITS_RE, '')
}

watch(surname, (value) => {
  const cleaned = stripNameDigits(value)
  if (cleaned !== value) surname.value = cleaned
})

watch(givenName, (value) => {
  const cleaned = stripNameDigits(value)
  if (cleaned !== value) givenName.value = cleaned
})

// Сменили тип документа — прежний номер к нему уже не относится.
watch(docType, () => {
  docNumber.value = ''
  docTouched.value = false
})

/** Показать ошибку номера только после blur / submit — не кричать на каждом символе. */
const docTouched = ref(false)

const docError = computed(() => {
  if (!hasDocType.value || !docTouched.value) return null
  const problem = docNumberProblem(docType.value, docNumber.value)
  if (problem === null) return null
  return t(`wizard.identity.docErrors.${problem}`, {
    example: docNumberExample(docType.value),
  })
})

const docPlaceholder = computed(() =>
  hasDocType.value
    ? t('wizard.identity.docNumberHint', { example: docNumberExample(docType.value) })
    : t('wizard.identity.docNumberPlaceholder'),
)

/** Валидация: обязательные поля + форма номера документа по типу. */
const isValid = computed(
  () =>
    surname.value.trim() !== '' &&
    givenName.value.trim() !== '' &&
    (GENDERS as readonly string[]).includes(gender.value) &&
    docType.value.trim() !== '' &&
    isDocNumberValid(docType.value, docNumber.value),
)

function onDocBlur(): void {
  docTouched.value = true
  const cleaned = normalizeDocNumber(docNumber.value)
  if (cleaned !== docNumber.value) docNumber.value = cleaned
}

function onSubmit(): void {
  docTouched.value = true
  if (!isValid.value) return
  docNumber.value = normalizeDocNumber(docNumber.value)
  next()
}
</script>

<template>
  <form
    :id="formId"
    ref="formRoot"
    class="flex flex-col gap-6"
    @submit.prevent="onSubmit"
  >
    <div data-reveal class="flex flex-col gap-3">
      <p class="vel-label">{{ t('wizard.identity.lead') }}</p>
      <h1 class="vel-identity__title text-3xl sm:text-4xl">{{ t('wizard.identity.title') }}</h1>
    </div>

    <div ref="fieldsRoot" class="flex flex-col gap-5">
      <div data-reveal class="grid gap-5 sm:grid-cols-2">
        <VelField :label="t('wizard.identity.surname')">
          <VelInput v-model="surname" autocomplete="family-name" spellcheck="false" />
        </VelField>

        <VelField :label="t('wizard.identity.name')">
          <VelInput v-model="givenName" autocomplete="given-name" spellcheck="false" />
        </VelField>
      </div>

      <div data-reveal class="flex flex-col gap-2">
        <p class="vel-label m-0">{{ t('wizard.identity.gender') }}</p>
        <p class="m-0 text-xs text-muted">{{ t('wizard.identity.genderHint') }}</p>
        <div
          class="grid grid-cols-2 gap-2"
          role="radiogroup"
          :aria-label="t('wizard.identity.gender')"
        >
          <label
            v-for="g in GENDERS"
            :key="g"
            class="vel-gender"
            :class="{ 'vel-gender--on': gender === g }"
          >
            <input v-model="gender" class="sr-only" type="radio" name="vel-gender" :value="g" />
            <span class="vel-gender__icon" aria-hidden="true">{{ g === 'male' ? '♂' : '♀' }}</span>
            <span class="font-semibold">
              {{ g === 'male' ? t('wizard.identity.genderMale') : t('wizard.identity.genderFemale') }}
            </span>
          </label>
        </div>
      </div>

      <div data-reveal>
        <VelField :label="t('wizard.identity.docType')">
          <!-- Заглушка своим ключом, а не подписью поля: до выбора подпись и
               закрытый селект стоят друг под другом в 41 пикселе, и один и тот же
               текст дважды читался как задвоенный узел, а не как поле. Пустой
               вариант при этом остаётся: без него селект молча предвыбрал бы
               первый документ. -->
          <VelSelect
            v-model="docType"
            :options="docTypeOptions"
            :placeholder="t('wizard.identity.docTypePlaceholder')"
          />
        </VelField>
      </div>

      <!-- Новый инпут: появляется только после выбора типа; форма по типу документа. -->
      <div v-if="hasDocType" key="doc-number" data-reveal class="vel-identity__doc-num">
        <VelField
          :label="t('wizard.identity.docNumber')"
          :error="docError ?? undefined"
        >
          <VelInput
            v-model="docNumber"
            :placeholder="docPlaceholder"
            autocomplete="off"
            spellcheck="false"
            @blur="onDocBlur"
          />
        </VelField>
      </div>
    </div>

    <p data-reveal class="vel-measure text-xs text-faint">{{ t('wizard.identity.privacy') }}</p>
  </form>

  <!-- Кнопка живёт в панели навигации оболочки, а форма — в области содержимого,
       поэтому связь только через атрибут form. -->
  <Teleport to="#vel-wizard-actions" defer>
    <VelButton
        type="submit"
        :form="formId"
        :disabled="!isValid"
        onclick="trackMetaOnce('loan_step_4', 'CustomizeProduct', { content_name: 'PersonalDataCompleted', step: 4 });"
      >
      {{ t('wizard.identity.submit') }}
      <span aria-hidden="true">→</span>
    </VelButton>
  </Teleport>
</template>

<style scoped>
/* Узкая колонка держит заголовок в две строки и не даёт ему разъехаться. */
.vel-identity__title {
  max-width: 18ch;
  white-space: pre-line;
}

.vel-gender {
  display: flex;
  min-height: 2.75rem;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background: var(--color-ground);
  color: var(--color-muted);
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    color 150ms ease;
}

.vel-gender:hover {
  border-color: var(--color-accent);
}

.vel-gender--on {
  border-color: var(--color-accent);
  background: color-mix(in oklab, var(--color-accent) 10%, var(--color-surface));
  color: var(--color-accent-deep);
}

.vel-gender__icon {
  font-size: 1.15rem;
  line-height: 1;
}

/* Акцент на «новом» поле: мягкая подсветка края, пока пользователь его видит. */
.vel-identity__doc-num {
  border-radius: var(--radius-control);
  animation: vel-identity-pop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes vel-identity-pop {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-identity__doc-num {
    animation: none;
  }
}
</style>
