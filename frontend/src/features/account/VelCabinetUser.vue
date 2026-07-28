<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { useNotices } from '@/composables/useNotices'
import VelAvatar from '@/components/ui/VelAvatar.vue'
import VelCabinetIcon from '@/features/account/VelCabinetIcon.vue'

/**
 * Правый край шапки кабинета: блок пользователя и колокольчик.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫМ ФАЙЛОМ. Шапка отвечает за строку целиком: залипание,
 * перенос полосы шагов, сжатие при прокрутке. Этот угол живёт своей жизнью —
 * у него три контрола, свои подписи для скринридера и больше половины всех
 * правил шапки (одно только «имя и почта уходят глазами, но остаются голосом»
 * тянет за собой отдельный запрос ширины). Вместе они давали файл, в котором
 * расклад строки приходилось искать между правилами колокольчика.
 *
 * КЛАССЫ ОСТАЛИСЬ vel-cabinet__… — это по-прежнему элементы блока «кабинет»,
 * а не новый блок: переезд чисто файловый, в DOM не поменялось ничего.
 * Переименование сломало бы внешние проверки — по классам этого блока ходит
 * scripts/audit-mobile.mjs.
 */
const { t } = useI18n()
const { client } = useAccount()
const { select, hrefFor } = useCabinetTab()

/*
 * Непрочитанное берётся из useNotices, а НЕ из флага стора.
 *
 * В account.store лежал hasUnreadNotices — обычный ref, который никто никогда
 * не поднимал: точка на колокольчике не загоралась ни при каких действиях, и
 * нажатие на него не открывало ничего. Теперь уведомления заводятся по
 * событиям, которые кабинет действительно наблюдает (см. notice-kinds), и
 * счётчик берётся оттуда же, откуда список в панели, — иначе точка и панель
 * рассказывали бы разное.
 */
const { hasUnread, unread } = useNotices()

/**
 * Открытие панели решает оболочка: кнопка живёт в шапке, а сама панель — в
 * VelAccount, у которого есть место под неё и который знает про заставку
 * входа. Здесь остаётся сообщить о нажатии.
 */
const emit = defineEmits<{ notices: [] }>()

/** Имя кнопки-колокольчика. Цвет точки скринридеру не виден — говорим словом,
    и числом: «3 непрочитанных» полезнее, чем «есть непрочитанные». */
const noticesLabel = computed(() =>
  hasUnread.value
    ? `${t('account.header.notices')}. ${t('notices.unread', { count: unread.value })}`
    : t('account.header.notices'),
)

/** Блок пользователя ведёт в «Profilo»: это самый короткий путь к своим данным. */
const profileLabel = computed(() =>
  client.value.fullName === ''
    ? t('account.header.profile')
    : t('account.header.profileOf', { name: client.value.fullName }),
)

/**
 * Переход по ссылке без перезагрузки. Модификаторы не перехватываем: с Ctrl,
 * Cmd, Shift и средней кнопкой человек просит открыть новое окно, и адрес
 * у ссылки настоящий.
 */
function openProfile(event: MouseEvent): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  if (event.button !== 0) return

  event.preventDefault()
  select('profile')
}
</script>

<template>
  <div class="vel-cabinet__side">
    <a
      class="vel-cabinet__user"
      :href="hrefFor('profile')"
      :aria-label="profileLabel"
      @click="openProfile"
    >
      <VelAvatar :name="client.fullName" />

      <!-- На узком экране имя и почта скрыты глазами, но остаются
           в разметке: скринридеру они нужны на любой ширине. -->
      <span class="vel-cabinet__user-text">
        <span class="vel-cabinet__user-name">{{ client.fullName }}</span>
        <span class="vel-cabinet__user-mail">{{ client.email }}</span>
      </span>
    </a>

    <button
      type="button"
      class="vel-cabinet__bell"
      :class="{ 'vel-cabinet__bell--pulse': hasUnread }"
      data-testid="notices-bell"
      @click="emit('notices')"
    >
      <VelCabinetIcon kind="bell" />
      <span class="sr-only">{{ noticesLabel }}</span>
      <span
        v-if="hasUnread"
        class="vel-cabinet__badge vel-num"
        aria-hidden="true"
        data-testid="notices-badge"
      >
        {{ unread > 9 ? '9+' : unread }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.vel-cabinet__side {
  display: flex;
  min-inline-size: 0;
  margin-inline-start: auto;
  align-items: center;
  gap: 0.35rem;
}

.vel-cabinet__user {
  --vel-avatar-size: 2rem;

  display: inline-flex;
  min-block-size: 2.75rem;
  min-inline-size: 0;
  align-items: center;
  gap: 0.6rem;
  padding-inline: 0.4rem;
  border-radius: var(--radius-control);
  color: var(--color-fg);
  text-decoration: none;
  transition: background-color 150ms ease;
}

.vel-cabinet__user:hover,
.vel-cabinet__user:active {
  background-color: var(--color-raised);
}

.vel-cabinet__user-text {
  display: flex;
  min-inline-size: 0;
  flex-direction: column;
  line-height: 1.2;
}

.vel-cabinet__user-name {
  overflow: hidden;
  font-size: 0.85rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-cabinet__user-mail {
  overflow: hidden;
  color: var(--color-muted);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Ниже 64rem имя и почта уходят глазами, но остаются для скринридера:
   на этой ширине в шапке помещаются только знак, кружок и колокольчик. */
@media (max-width: 63.999rem) {
  .vel-cabinet__user-text {
    position: absolute;
    overflow: hidden;
    clip-path: inset(50%);
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    white-space: nowrap;
  }
}

.vel-cabinet__bell {
  --vel-icon-size: 1.35rem;

  position: relative;
  display: inline-flex;
  min-inline-size: 2.75rem;
  min-block-size: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    color 150ms ease,
    background-color 150ms ease;
}

.vel-cabinet__bell:hover {
  background-color: var(--color-raised);
  color: var(--color-fg);
}

.vel-cabinet__bell:active {
  color: var(--color-accent-deep);
}

/* Счётчик непрочитанных на колокольчике (как на Assistenza). */
.vel-cabinet__badge {
  position: absolute;
  inset-block-start: 0.3rem;
  inset-inline-end: 0.28rem;
  display: inline-flex;
  min-inline-size: 1.1rem;
  min-block-size: 1.1rem;
  align-items: center;
  justify-content: center;
  padding-inline: 0.28rem;
  border-radius: var(--radius-round);
  background-color: var(--color-success);
  color: #ffffff;
  font-size: 0.62rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 0 0 2px var(--color-surface);
}

/* Непрочитанные: колокольчик + badge заметно пульсируют, пока не откроют. */
.vel-cabinet__bell--pulse {
  color: var(--color-accent-deep);
  animation: vel-bell-pulse 1.15s ease-in-out infinite;
}

.vel-cabinet__bell--pulse .vel-cabinet__badge {
  animation: vel-bell-badge 1.15s ease-in-out infinite;
}

@keyframes vel-bell-pulse {
  0%,
  100% {
    transform: scale(1);
    filter: brightness(1);
  }

  50% {
    transform: scale(1.12);
    filter: brightness(1.08);
  }
}

@keyframes vel-bell-badge {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 2px var(--color-surface),
      0 0 0 0 color-mix(in oklab, var(--color-success) 50%, transparent);
  }

  50% {
    transform: scale(1.18);
    box-shadow:
      0 0 0 2px var(--color-surface),
      0 0 0 8px color-mix(in oklab, var(--color-success) 0%, transparent),
      0 0 12px 2px color-mix(in oklab, var(--color-success) 45%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-cabinet__user,
  .vel-cabinet__bell {
    transition: none;
  }

  .vel-cabinet__bell--pulse,
  .vel-cabinet__bell--pulse .vel-cabinet__badge {
    animation: none;
  }

  .vel-cabinet__bell--pulse .vel-cabinet__badge {
    box-shadow:
      0 0 0 2px var(--color-surface),
      0 0 0 3px color-mix(in oklab, var(--color-success) 40%, transparent);
  }
}
</style>
