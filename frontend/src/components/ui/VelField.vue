<script setup lang="ts">
import { computed, provide, reactive, useId, useTemplateRef } from 'vue'
import { useAutoAnimate } from '@/composables/useAutoAnimate'
import { VEL_FIELD_KEY } from '@/components/ui/vel-field'

/**
 * Обёртка поля: подпись сверху, подсказка или ошибка снизу, связка через aria.
 *
 * Подпись отдаётся двумя способами, потому что в поле может лежать как один
 * контрол, так и группа. <label for> работает только с labelable-элементами
 * (input, select, textarea) — для группы из кнопок нужен aria-labelledby,
 * иначе подпись не связана ни с чем.
 */
interface Props {
  label?: string
  hint?: string
  error?: string
}

const props = defineProps<Props>()

const uid = useId()
const controlId = `vel-${uid}`
const labelId = `${controlId}-label`
const hintId = `${controlId}-hint`
const errorId = `${controlId}-error`

const invalid = computed(() => Boolean(props.error))

const describedBy = computed(() => {
  if (props.error) return errorId
  if (props.hint) return hintId
  return undefined
})

provide(VEL_FIELD_KEY, reactive({ controlId, labelId, describedBy, invalid }))

/*
 * Строка под контролом живёт добавлением и удалением узлов: подсказка уходит,
 * ошибка приходит, и наоборот. Без перехода она возникает рывком под уже
 * заполненным полем — ровно тот случай, ради которого auto-animate и взят.
 *
 * Контейнер — flex-колонка, и это условие: у inline- и table-раскладок FLIP
 * считает координаты не по тем боксам. Дописанный библиотекой position:
 * relative потомкам не мешает — единственный контрол с абсолютным
 * позиционированием, VelSelect, держит свой список внутри собственного
 * относительного корня.
 */
const fieldBody = useTemplateRef<HTMLElement>('fieldBody')
useAutoAnimate(fieldBody)
</script>

<template>
  <div ref="fieldBody" class="flex flex-col gap-2">
    <label v-if="label" :id="labelId" :for="controlId" class="vel-label">{{ label }}</label>

    <slot />

    <p v-if="error" :id="errorId" class="vel-field__msg vel-field__msg--error" role="alert">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="hintId" class="vel-field__msg vel-field__msg--hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
/* Подсказки форм: нейтральный slate, не «нежно-голубой» bleached text. */
.vel-field__msg {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  letter-spacing: -0.005em;
}

.vel-field__msg--hint {
  color: var(--color-muted);
}

.vel-field__msg--error {
  color: var(--color-danger);
  font-weight: 500;
}
</style>
