<script setup lang="ts">
import { computed, inject } from 'vue'
import { cn } from '@/lib/cn'
import { useControlAttrs } from '@/composables/useControlAttrs'
import { VEL_FIELD_KEY } from '@/components/ui/vel-field'

interface Props {
  /** Только текстовые типы: суммы вводятся маской, а не через type="number". */
  /**
   * Список закрытый намеренно: сюда попадают только те типы, которые поле
   * действительно умеет оформлять. 'password' добавлен вместе с окном создания
   * кабинета — без него браузер не скрывал бы набранное и не предлагал бы
   * менеджеру паролей сохранить пару.
   */
  type?: 'text' | 'email' | 'tel' | 'password'
  placeholder?: string
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  type: 'text',
})

defineOptions({ inheritAttrs: false })

const model = defineModel<string>({ default: '' })

const field = inject(VEL_FIELD_KEY, null)
const { externalClass, passThrough } = useControlAttrs()

/**
 * Обычно id приходит от VelField. Но биндинг :id="field?.controlId" вне поля
 * дал бы undefined и затёр бы id, переданный снаружи через атрибуты
 * (mergeProps перезаписывает более поздним значением), разорвав связь с <label for>.
 */
const controlId = computed(
  () => field?.controlId ?? (passThrough.value['id'] as string | undefined),
)

const inputClass = computed(() =>
  cn(
    'h-13 w-full rounded-control border bg-ground',
    // iOS Safari автоматически увеличивает viewport при фокусе на поле с
    // шрифтом меньше 16px. На входе в кабинет native <dialog> отдаёт фокус
    // первому полю, поэтому zoom возникал ещё до действий пользователя и
    // затем смещал fixed-модалки. На телефоне держим 16px; с sm возвращаем
    // компактную desktop-типографику.
    'px-3.5 text-base sm:text-sm transition-colors duration-150 placeholder:text-muted',
    // Кольцо фокуса задаётся утилитами намеренно — см. комментарий в VelButton.
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:cursor-not-allowed disabled:opacity-40',
    field?.invalid === true ? 'border-danger' : 'border-line-strong hover:border-accent',
    externalClass.value,
  ),
)
</script>

<template>
  <input
    v-bind="passThrough"
    :id="controlId"
    v-model="model"
    :type="type"
    :class="inputClass"
    :placeholder="placeholder"
    :disabled="disabled"
    :aria-describedby="field?.describedBy"
    :aria-invalid="field?.invalid === true || undefined"
  />
</template>
