<script setup lang="ts">
import { computed, inject, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { cn } from '@/lib/cn'
import { useControlAttrs } from '@/composables/useControlAttrs'
import { useSelectDrop } from '@/composables/useSelectDrop'
import { useSelectListbox } from '@/composables/useSelectListbox'
import { VEL_FIELD_KEY } from '@/components/ui/vel-field'
import { selectOptionId } from '@/components/ui/vel-select'
import VelSelectList from '@/components/ui/VelSelectList.vue'
import type { VelSelectOption } from '@/types/velora'

/**
 * Свой выпадающий список вместо нативного <select>.
 *
 * Нативный список рисует операционная система: своя типографика, свои цвета,
 * свои радиусы — на странице он выпадал чужеродным белым прямоугольником, и
 * ни один токен Velora до него не дотягивался. Стилизовать его нечем: option
 * не принимает разметку и оформляется браузером как хочет.
 *
 * Взамен — кнопка role="combobox" и всплывающий role="listbox". Публичный API
 * компонента не изменился: v-model, options, placeholder, disabled, id и связка
 * с подписью из VelField.
 *
 * Триггер и список — один контрол, и то, что делает их одним, живёт здесь:
 * общие id (aria-controls, aria-activedescendant), корень для клика-вне и фокус,
 * который обязан оставаться на кнопке. Список ничего этого не решает сам —
 * получает готовое пропами и отвечает двумя событиями, — поэтому его разметку
 * и стили удалось унести в VelSelectList.vue, не разорвав связку: единственную
 * общую строку, id пункта, обе стороны берут из vel-select.ts.
 *
 * Остальное вынесено целиком: раскрытие и клавиатура — useSelectListbox.ts,
 * измерения окна под список — useSelectDrop.ts, оба в @/composables.
 */
interface Props {
  options: VelSelectOption[]
  /** Подпись кнопки, пока ничего не выбрано. Без неё берётся общая из локали. */
  placeholder?: string
  disabled?: boolean
}

const props = defineProps<Props>()

defineOptions({ inheritAttrs: false })

const model = defineModel<string>({ default: '' })

const { t } = useI18n()
const field = inject(VEL_FIELD_KEY, null)
const { externalClass, passThrough } = useControlAttrs()

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLElement | null>(null)

const { expanded, activeIndex, toggle, activate, choose, onTriggerKeydown } = useSelectListbox({
  options: () => props.options,
  model,
  disabled: () => props.disabled === true,
  root,
  trigger,
})

const { dropUp } = useSelectDrop({ root, trigger })

/**
 * Обычно id приходит от VelField — на него смотрит <label for>. Тот же приём,
 * что в VelInput: биндинг field?.controlId вне поля дал бы undefined и затёр бы
 * id, переданный снаружи атрибутом. Свой запасной нужен всё равно: на него
 * ссылаются aria-controls и aria-activedescendant.
 */
const fallbackId = `vel-select-${useId()}`
const triggerId = computed(
  () => field?.controlId ?? (passThrough.value['id'] as string | undefined) ?? fallbackId,
)
const listId = computed(() => `${triggerId.value}-list`)
const valueId = computed(() => `${triggerId.value}-value`)

/**
 * Имя кнопки собирается из подписи поля и выбранного значения —
 * «На что нужен кредит? Ремонт». Без второй ссылки скринридер объявил бы
 * только подпись и умолчал бы выбранное.
 *
 * Ссылка идёт на span со значением, а не на саму кнопку, как в примере APG:
 * по спецификации имени результат тот же, но самоссылка — особый случай
 * алгоритма (обход обязан оборвать рекурсию), а обычная ссылка на потомка
 * считается везде одинаково.
 */
const labelledBy = computed(() =>
  field ? `${field.labelId} ${valueId.value}` : valueId.value,
)

const activeDescendant = computed(() =>
  expanded.value && activeIndex.value >= 0
    ? selectOptionId(triggerId.value, activeIndex.value)
    : undefined,
)

const selectedOption = computed(() => props.options.find((option) => option.value === model.value))
const displayText = computed(
  () => selectedOption.value?.label ?? props.placeholder ?? t('common.selectEmpty'),
)

const triggerClass = computed(() =>
  cn(
    'flex h-13 w-full items-center gap-2 rounded-control border bg-ground',
    'px-3.5 text-sm transition-colors duration-150',
    // Кольцо фокуса задаётся утилитами намеренно — см. комментарий в VelButton.
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    // cursor-pointer обязателен: preflight Tailwind v4 отдал кнопкам браузерное
    // `default`, и триггер списка стоял со стрелкой — замерено на месте.
    // Вариант disabled ниже специфичнее и по-прежнему даёт `not-allowed`.
    'cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
    // Нажатие: у кнопки были покой, наведение, фокус и блокировка, отклика
    // на палец не было. Подложка, а не рамка: рамку уже занял hover.
    // Отдельной защиты от disabled не нужно — заблокированная кнопка
    // состояние :active не получает.
    'active:bg-raised',
    field?.invalid === true ? 'border-danger' : 'border-line-strong hover:border-accent',
    selectedOption.value ? 'text-fg' : 'text-muted',
    externalClass.value,
  ),
)
</script>

<template>
  <div ref="root" class="vel-select">
    <button
      v-bind="passThrough"
      :id="triggerId"
      ref="trigger"
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :class="triggerClass"
      :disabled="disabled"
      :aria-expanded="expanded"
      :aria-controls="listId"
      :aria-labelledby="labelledBy"
      :aria-activedescendant="activeDescendant"
      :aria-describedby="field?.describedBy"
      :aria-invalid="field?.invalid === true || undefined"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span :id="valueId" class="flex-1 truncate text-left">{{ displayText }}</span>

      <svg
        class="vel-select__chevron size-4 shrink-0 text-muted"
        :class="{ 'vel-select__chevron--open': expanded }"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path
          d="M3.5 6 8 10.5 12.5 6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="square"
        />
      </svg>
    </button>

    <VelSelectList
      :list-id="listId"
      :trigger-id="triggerId"
      :options="options"
      :selected="model"
      :expanded="expanded"
      :active-index="activeIndex"
      :drop-up="dropUp"
      :labelled-by="field?.labelId"
      @activate="activate"
      @choose="choose"
    />
  </div>
</template>

<style scoped>
.vel-select {
  /* Запасное значение на случай, если эффект ещё не отработал */
  --vel-select-max: 15rem;

  position: relative;
}

.vel-select__chevron {
  transition: transform 150ms ease;
}

.vel-select__chevron--open {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  /* Сброс из main.css правит только длительность: переход всё равно
     проигрался бы, просто мгновенно. Здесь снимаем его целиком. */
  .vel-select__chevron {
    transition: none;
  }
}
</style>
