<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SignatureMode } from '@/composables/useSignaturePad'

/**
 * Переключатель способа подписи: нарисовать росчерк или набрать имя.
 *
 * Клавиатурная альтернатива обязательна: мышью рисуют не все, а без второго
 * способа шаг подписи становится непроходимым. Переключатель собран на
 * нативных радиокнопках — стрелки, группировка и объявление «1 из 2» достаются
 * даром, роль radiogroup только даёт группе имя.
 *
 * Классы остались от блока vel-signature, хотя разметка переехала в свой файл:
 * на экране это по-прежнему часть панели подписи, и переименование поменяло бы
 * вёрстку, ничего не дав взамен. Файл отделён ради размера панели, не ради
 * нового блока.
 */
const model = defineModel<SignatureMode>({ default: 'draw' })

const { t } = useI18n()

/** Общее имя группы радиокнопок: без него на странице с двумя панелями
    переключатели склеились бы в одну группу. */
const groupName = `vel-signature-mode-${useId()}`

const MODE_OPTIONS: readonly SignatureMode[] = ['draw', 'type']
</script>

<template>
  <div
    class="vel-signature__modes"
    role="radiogroup"
    :aria-label="t('account.signature.modeLabel')"
  >
    <label v-for="option in MODE_OPTIONS" :key="option" class="vel-signature__mode">
      <input v-model="model" class="sr-only" type="radio" :name="groupName" :value="option" />
      <span>{{ t(`account.signature.modes.${option}`) }}</span>
    </label>
  </div>
</template>

<style scoped>
/* Сегментный переключатель на нативных радиокнопках: сам input лежит под
   .sr-only, видимую часть рисует соседний span. */
.vel-signature__modes {
  display: flex;
  width: fit-content;
  overflow: hidden;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
}

.vel-signature__mode {
  cursor: pointer;
}

.vel-signature__mode + .vel-signature__mode {
  border-left: 1px solid var(--color-line-strong);
}

.vel-signature__mode span {
  display: block;
  padding: 0.5rem 1.1rem;
  color: var(--color-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  transition: color 150ms, background-color 150ms;
}

.vel-signature__mode input:checked + span {
  background-color: var(--color-accent);
  color: var(--color-accent-ink);
}

/* Кольцо фокуса обязано остаться видимым: сам input скрыт, значит рисуем
   его на видимой части. Внутрь, чтобы не срезалось overflow контейнера. */
.vel-signature__mode input:focus-visible + span {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  /* Сброс из main.css правит только длительность: переход всё равно
     проигрался бы, просто мгновенно. Здесь снимаем его целиком. */
  .vel-signature__mode span {
    transition: none;
  }
}
</style>
