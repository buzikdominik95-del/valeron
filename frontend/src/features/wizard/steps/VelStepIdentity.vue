<script setup lang="ts">
import { computed, useId, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useWizard } from '@/composables/useWizard'
import { useSimulatorStore } from '@/stores/simulator.store'
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
 */
const { t } = useI18n()
const { next } = useWizard()

const store = useSimulatorStore()
const { surname, firstName: givenName, docType, docNumber } = storeToRefs(store)

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

const docTypeOptions = computed<VelSelectOption[]>(() =>
  DOC_TYPES.map((value) => ({
    value,
    label: t(`wizard.identity.docTypes.${value}`),
  })),
)

const hasDocType = computed(() => docType.value !== '')

// Сменили тип документа — прежний номер к нему уже не относится.
watch(docType, () => {
  docNumber.value = ''
})

/** Валидация шага: все поля обязательны, пробелы за значение не считаются. */
const isValid = computed(() =>
  [surname, givenName, docType, docNumber].every((field) => field.value.trim() !== ''),
)

function onSubmit(): void {
  if (!isValid.value) return
  next()
}
</script>

<template>
  <form :id="formId" class="flex flex-col gap-6" @submit.prevent="onSubmit">
    <div class="flex flex-col gap-3">
      <p class="vel-label">{{ t('wizard.identity.lead') }}</p>
      <h1 class="vel-identity__title text-3xl sm:text-4xl">{{ t('wizard.identity.title') }}</h1>
    </div>

    <div class="grid gap-5 sm:grid-cols-2">
      <VelField :label="t('wizard.identity.surname')">
        <VelInput v-model="surname" autocomplete="family-name" spellcheck="false" />
      </VelField>

      <VelField :label="t('wizard.identity.name')">
        <VelInput v-model="givenName" autocomplete="given-name" spellcheck="false" />
      </VelField>
    </div>

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

    <VelField :label="t('wizard.identity.docNumber')">
      <VelInput
        v-model="docNumber"
        :disabled="!hasDocType"
        :placeholder="t('wizard.identity.docNumberPlaceholder')"
        autocomplete="off"
        spellcheck="false"
      />
    </VelField>

    <p class="vel-measure text-xs text-faint">{{ t('wizard.identity.privacy') }}</p>
  </form>

  <!-- Кнопка живёт в панели навигации оболочки, а форма — в области содержимого,
       поэтому связь только через атрибут form. -->
  <Teleport to="#vel-wizard-actions" defer>
    <VelButton type="submit" :form="formId" :disabled="!isValid">
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
</style>
