<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { useNotices } from '@/composables/useNotices'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { NOTICE_TAB, NOTICE_TONE, type NoticeKind } from '@/features/account/notice-kinds'
import VelNoticeRow from '@/features/account/VelNoticeRow.vue'

/**
 * Панель уведомлений (колокольчик).
 * Клик по строке → нужная вкладка (Documenti / Assistenza) и закрытие панели.
 */
const open = defineModel<boolean>('open', { required: true })

const { t, d } = useI18n()
const { items, unread, markAllRead, markRead } = useNotices()
const { select: selectTab } = useCabinetTab()

const root = ref<HTMLElement | null>(null)
const heading = ref<HTMLElement | null>(null)

const list = computed(() =>
  items.value.map((notice) => ({
    ...notice,
    tone: NOTICE_TONE[notice.kind],
    title: t(`notices.kinds.${notice.kind}.title`),
    body: t(`notices.kinds.${notice.kind}.body`),
    stamp: d(new Date(notice.at), 'long'),
    time: d(new Date(notice.at), 'time'),
  })),
)

watch(open, (isOpen) => {
  if (!isOpen) return
  /* Открыл колокольчик = прочитал (в т.ч. notice от сообщений). */
  markAllRead()
  requestAnimationFrame(() => {
    heading.value?.focus()
  })
})

function openNotice(id: number, kind: NoticeKind): void {
  markRead(id)
  const target = NOTICE_TAB[kind]
  open.value = false
  selectTab(target)
  /* Переход в чат → все chat-notices снимаются с badge (не только эта строка). */
  if (target === 'support') {
    try {
      useNotices().markChatNoticesRead()
    } catch {
      /* optional */
    }
  }
}

onClickOutside(root, () => {
  if (open.value) open.value = false
})

onKeyStroke('Escape', () => {
  if (open.value) open.value = false
})
</script>

<template>
  <Transition name="vel-notices">
    <section
      v-if="open"
      ref="root"
      class="vel-notices"
      :aria-label="t('notices.title')"
    >
      <header class="vel-notices__head">
        <h2 ref="heading" tabindex="-1" class="vel-notices__title">
          {{ t('notices.title') }}
        </h2>

        <button
          type="button"
          class="vel-notices__close"
          :aria-label="t('notices.close')"
          @click="open = false"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
          </svg>
        </button>
      </header>

      <ul v-if="list.length > 0" class="vel-notices__list" :aria-label="t('notices.listLabel')">
        <VelNoticeRow
          v-for="notice in list"
          :key="notice.id"
          :tone="notice.tone"
          :title="notice.title"
          :body="notice.body"
          :at="notice.at"
          :time="notice.time"
          :stamp="notice.stamp"
          :unread="!notice.read"
          @open="openNotice(notice.id, notice.kind)"
        />
      </ul>

      <p v-else class="vel-notices__empty">
        {{ t('notices.empty') }}
        <span class="vel-notices__hint">{{ t('notices.emptyHint') }}</span>
      </p>

      <!-- Кнопка нужна только когда есть что пометить: панель гасит
           непрочитанное сама при открытии, и обычно счётчик уже нулевой. -->
      <button
        v-if="unread > 0"
        type="button"
        class="vel-notices__mark"
        @click="markAllRead"
      >
        {{ t('notices.markRead') }}
      </button>
    </section>
  </Transition>
</template>

<style scoped>
/*
  ПАНЕЛЬ ПРИВЯЗАНА К ПРАВОМУ КРАЮ, а не отцентрована: колокольчик стоит справа
  в шапке, и выпадающий из-под него список обязан выходить оттуда же.

  position: fixed, а не absolute: шапка залипшая и на узком экране обрезает
  содержимое по своим границам — absolute-панель ушла бы под её край.
  Отсчёт от верха берём по замеренной высоте шапки (--vel-shell-head-h), той
  же, по которой залипают меню и колонка обзора.
*/
.vel-notices {
  position: fixed;
  inset-block-start: calc(var(--vel-shell-head-h, 9.6rem) + 0.4rem);
  inset-inline-end: max(0.75rem, env(safe-area-inset-right));
  /* Выше шапки (40) и меню (30), ниже заставки входа (60). */
  z-index: 50;
  display: flex;
  overflow: hidden;
  /* На телефоне панель занимает почти всю ширину, на большом экране — свою
     колонку. min() вместо медиазапроса: правило одно и читается целиком. */
  inline-size: min(22rem, calc(100vw - 1.5rem));
  flex-direction: column;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  box-shadow: 0 12px 32px color-mix(in oklab, var(--color-accent-deep) 22%, transparent);
}

.vel-notices__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.7rem 0.5rem 0.7rem 0.9rem;
  border-block-end: 1px solid var(--color-line);
}

.vel-notices__title {
  margin: 0;
  color: var(--color-fg);
  font-size: 0.95rem;
  font-weight: 600;
}

/* Фокус сюда приходит программно при открытии — рамка была бы шумом.
   :focus-visible из base остаётся, клавиатурный фокус видно. */
.vel-notices__title:focus:not(:focus-visible) {
  outline: none;
}

.vel-notices__close {
  display: inline-flex;
  inline-size: 2.75rem;
  block-size: 2.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  transition: color 150ms ease, background-color 150ms ease;
}

.vel-notices__close:hover {
  background-color: var(--color-raised);
  color: var(--color-fg);
}

.vel-notices__close svg {
  inline-size: 1rem;
  block-size: 1rem;
}

.vel-notices__list {
  overflow-y: auto;
  /* Список не растёт бесконечно: длинная история прокручивается внутри
     панели, а не выталкивает её за нижний край экрана. */
  max-block-size: min(60dvh, 26rem);
  margin: 0;
  padding: 0.35rem;
  list-style: none;
  overscroll-behavior-block: contain;
}

/* Пустой список: сообщение и подсказка вместо строк. Оформление самой строки
   уехало в VelNoticeRow — здесь только то, что рисует сама панель. */
.vel-notices__empty {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 1.1rem 0.9rem;
  color: var(--color-fg);
  font-size: 0.85rem;
}

.vel-notices__hint {
  color: var(--color-muted);
  font-size: 0.78rem;
}

.vel-notices__mark {
  min-block-size: 2.75rem;
  border: 0;
  border-block-start: 1px solid var(--color-line);
  background: transparent;
  color: var(--color-accent-deep);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.vel-notices__mark:hover {
  background-color: var(--color-raised);
}

.vel-notices-enter-active,
.vel-notices-leave-active {
  transition:
    opacity 160ms ease,
    transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

.vel-notices-enter-from,
.vel-notices-leave-to {
  opacity: 0;
  transform: translateY(-0.4rem);
}

@media (prefers-reduced-motion: reduce) {
  .vel-notices__close {
    transition: none;
  }

  .vel-notices-enter-active,
  .vel-notices-leave-active {
    transition: opacity 120ms linear;
  }

  .vel-notices-enter-from,
  .vel-notices-leave-to {
    transform: none;
  }
}
</style>
