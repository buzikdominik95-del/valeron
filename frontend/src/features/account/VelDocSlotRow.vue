<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { DOC_ACCEPT } from '@/features/account/doc-kinds'
import VelDocIcon from '@/features/account/VelDocIcon.vue'

/**
 * Одна строка слота под снимок: знак, подпись, справа кнопка выбора файла.
 *
 * НАСТОЯЩИЙ input[type=file] В РАЗМЕТКЕ, а не диалог из скрипта. Поле лежит
 * внутри <label>, оформленного кнопкой, и скрыто .sr-only — значит остаётся в
 * порядке табуляции и открывается с клавиатуры. Скриптовый диалог (useFileDialog)
 * держит своё поле вне документа: клавиатуре оно недоступно, а автотесты не
 * могут положить в него файл через setInputFiles.
 *
 * КНОПКА НЕ ДВИГАЕТСЯ при смене «Scegli foto» → «Sostituisci»: у неё задан
 * минимум ширины, и обе подписи ложатся в один и тот же бокс. Иначе кнопка
 * прыгала бы под пальцем ровно в тот момент, когда по ней хотят попасть
 * второй раз.
 *
 * Превью показываем только для картинок: адрес приходит готовым из
 * useDocumentUpload, он же его и отзывает — строка про время жизни ничего
 * не знает и знать не должна.
 */
interface Props {
  /** Готовая подпись слота: «Foto del documento» / «Lato frontale» / «Lato posteriore». */
  label: string
  file: File | null
  /** object URL превью или null (PDF, либо файла ещё нет). */
  preview: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{ pick: [File | null] }>()

const { t } = useI18n()

function onChange(event: Event): void {
  const input = event.target as HTMLInputElement
  emit('pick', input.files?.[0] ?? null)
  /* Значение поля сбрасываем сразу: браузер не шлёт change, если выбрали ТОТ ЖЕ
     файл повторно, и пересъёмка тем же именем молча ничего бы не поменяла.
     Ссылка на File к этому моменту уже уехала наверх. */
  input.value = ''
}
</script>

<template>
  <li class="vel-docslot" data-testid="doc-slot">
    <span
      class="vel-docslot__mark"
      :class="{ 'vel-docslot__mark--done': props.file !== null }"
      aria-hidden="true"
    >
      <VelDocIcon :sign="props.file === null ? 'camera' : 'check'" />
    </span>

    <span class="vel-docslot__text">
      <span class="vel-docslot__label">{{ props.label }}</span>

      <span v-if="props.file !== null" class="vel-docslot__file">
        <img v-if="props.preview !== null" class="vel-docslot__thumb" :src="props.preview" alt="" />
        <span class="vel-docslot__name">{{ props.file.name }}</span>
      </span>

      <span v-else class="vel-docslot__hint">{{ t('account.docs.slotEmpty') }}</span>
    </span>

    <!-- Пульс «Scegli foto», пока снимок не выбран (бриф, фотка 1). -->
    <label
      class="vel-docslot__pick"
      :class="{ 'vel-docslot__pick--pulse': props.file === null }"
    >
      <input
        class="sr-only"
        type="file"
        :accept="DOC_ACCEPT"
        :aria-label="
          props.file === null
            ? t('account.docs.chooseFor', { label: props.label })
            : t('account.docs.replaceFor', { label: props.label })
        "
        @change="onChange"
      />
      <span>{{ props.file === null ? t('account.docs.choose') : t('account.docs.replace') }}</span>
    </label>
  </li>
</template>

<style scoped>
/*
  Перенос вместо точки останова. Строка живёт и на 320px, и в широкой колонке,
  и ловить её медиазапросом по ширине ОКНА неверно: карточка стоит в колонке
  переменной ширины, и окно про эту ширину ничего не знает. Здесь порог задан
  самим содержимым — базис текстовой колонки (6.5rem). Не хватило места на
  подпись, имя файла и кнопку в один ряд — кнопка честно уезжает на второй,
  оставаясь прижатой к тому же краю.
*/
.vel-docslot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.625rem;
  padding-inline: 0.75rem;
  padding-block: 0.625rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background-color: var(--color-surface);
}

/* Круглая подложка знака — по прямой просьбе владельца продукта; значение радиуса
   берём из токена, чтобы «круглое» не расползалось произвольными числами. */
.vel-docslot__mark {
  --vel-icon-size: 1.05rem;

  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  inline-size: 2rem;
  block-size: 2rem;
  border-radius: var(--radius-round);
  background-color: var(--color-raised);
  color: var(--color-muted);
}

/* Снимок выбран. Цвет здесь не единственный признак: знак меняет и форму —
   камера уступает место галочке, а это видно и при дальтонизме. */
.vel-docslot__mark--done {
  background-color: color-mix(in oklab, var(--color-success) 14%, var(--color-surface));
  color: var(--color-success);
}

.vel-docslot__text {
  display: flex;
  min-inline-size: 0;
  flex: 1 1 6.5rem;
  flex-direction: column;
  gap: 0.125rem;
}

.vel-docslot__label {
  color: var(--color-fg);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25;
}

.vel-docslot__hint {
  color: var(--color-faint);
  font-size: 0.75rem;
  line-height: 1.3;
}

.vel-docslot__file {
  display: flex;
  min-inline-size: 0;
  align-items: center;
  gap: 0.375rem;
}

/* Превью маленькое намеренно: строка обязана остаться строкой. Обрезка по
   центру — snapshot документа почти всегда шире, чем выше. */
.vel-docslot__thumb {
  flex: 0 0 auto;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  border: 1px solid var(--color-line);
  border-radius: 2px;
  object-fit: cover;
}

/* Имя файла НЕ переносится: длинное «IMG_20240712_113455_documento.jpeg»
   раздуло бы строку на три ряда. Обрезаем многоточием. */
.vel-docslot__name {
  overflow: hidden;
  color: var(--color-muted);
  font-size: 0.75rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/*
  Кнопка выбора файла — <label> вокруг скрытого поля. Оформлена как outline-кнопка
  проекта; минимум ширины держит её на месте при смене подписи.
*/
.vel-docslot__pick {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-inline-size: 6.75rem;
  min-block-size: 2.75rem;
  margin-inline-start: auto;
  padding-inline: 0.75rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background-color: var(--color-surface);
  color: var(--color-fg);
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  text-align: center;
  transition:
    border-color 150ms ease,
    color 150ms ease;
}

.vel-docslot__pick:hover {
  border-color: var(--color-accent);
  color: var(--color-accent-deep);
}

/* Кольцо фокуса рисуем на видимой части: само поле скрыто под .sr-only,
   и браузеру нечего обводить. */
.vel-docslot__pick:has(input:focus-visible) {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Пустой слот: сильный пульс + мигание — следующий шаг онбординга. */
.vel-docslot__pick--pulse {
  border-color: var(--color-accent);
  border-width: 2px;
  color: var(--color-accent-deep);
  background: color-mix(in oklab, var(--color-accent) 10%, var(--color-surface));
  animation: vel-docslot-call 1.15s ease-in-out infinite;
}

@keyframes vel-docslot-call {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
    box-shadow:
      0 0 0 0 color-mix(in oklab, var(--color-accent) 55%, transparent),
      0 0 0 0 transparent;
    filter: brightness(1);
  }

  50% {
    transform: scale(1.08);
    opacity: 0.72;
    box-shadow:
      0 0 0 10px color-mix(in oklab, var(--color-accent) 0%, transparent),
      0 0 16px 3px color-mix(in oklab, var(--color-accent) 42%, transparent);
    filter: brightness(1.1);
  }
}

@media (prefers-reduced-motion: reduce) {
  /* Сброс из main.css правит только длительность — переход всё равно
     проигрался бы, просто мгновенно. Снимаем его целиком. */
  .vel-docslot__pick {
    transition: none;
  }

  .vel-docslot__pick--pulse {
    animation: none;
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-accent) 35%, transparent);
  }
}
</style>
