<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMoscowNightMode } from '@/composables/useMoscowNightMode'
import consultantPhoto from '@/img/consulente-schierano.jpg'

/**
 * Шапка переписки: фото консультанта, имя, статус и часы ответа.
 * Ночной режим по Москве: 22:30–09:00 → Offline + расписание.
 */
const { t } = useI18n()
const { isNightMode } = useMoscowNightMode()

const statusLabel = computed(() =>
  isNightMode.value ? t('account.support.chat.offline') : t('account.support.chat.online'),
)

const hoursLabel = computed(() =>
  isNightMode.value
    ? t('account.support.chat.hoursOffline')
    : t('account.support.chat.hours'),
)

</script>

<template>
  <header class="vel-chat__head">
    <span class="vel-chat__avatar" aria-hidden="true">
      <img
        class="vel-chat__photo"
        :src="consultantPhoto"
        alt=""
        width="44"
        height="44"
        decoding="async"
      />
      <span
        class="vel-chat__live"
        :class="{ 'vel-chat__live--offline': isNightMode }"
        :title="statusLabel"
      />
    </span>

    <span class="vel-chat__who">
      <span class="vel-chat__name">{{ t('account.support.chat.agentName') }}</span>
      <span class="vel-chat__status" :class="{ 'vel-chat__status--offline': isNightMode }">
        <span class="vel-chat__dot" :class="{ 'vel-chat__dot--offline': isNightMode }" aria-hidden="true" />
        {{ statusLabel }}
      </span>
      <span class="vel-chat__hours">{{ hoursLabel }}</span>
    </span>
  </header>
</template>

<style scoped>
.vel-chat__head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  background: linear-gradient(
    135deg,
    var(--color-accent-deep) 0%,
    color-mix(in oklab, var(--color-accent-deep) 82%, #0a1628) 100%
  );
  color: var(--color-accent-ink);
}

.vel-chat__avatar {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  inline-size: 2.75rem;
  block-size: 2.75rem;
}

.vel-chat__photo {
  inline-size: 100%;
  block-size: 100%;
  border-radius: var(--radius-round);
  object-fit: cover;
  object-position: center 18%;
  box-shadow:
    0 0 0 2px color-mix(in oklab, var(--color-accent-ink) 35%, transparent),
    0 4px 12px color-mix(in oklab, #000 28%, transparent);
}

/* Точка «в сети» на аватаре */
.vel-chat__live {
  position: absolute;
  right: 0;
  bottom: 0;
  inline-size: 0.7rem;
  block-size: 0.7rem;
  border: 2px solid var(--color-accent-deep);
  border-radius: var(--radius-round);
  background: var(--color-success);
  box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 55%, transparent);
  animation: vel-chat-live 1.8s ease-out infinite;
}

.vel-chat__who {
  display: flex;
  min-inline-size: 0;
  flex-direction: column;
  gap: 0.08rem;
}

.vel-chat__name {
  overflow: hidden;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-chat__status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: color-mix(in oklab, var(--color-success) 70%, var(--color-accent-ink));
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.2;
}

.vel-chat__dot {
  display: inline-block;
  inline-size: 0.4rem;
  block-size: 0.4rem;
  border-radius: var(--radius-round);
  background: var(--color-success);
  box-shadow: 0 0 6px color-mix(in oklab, var(--color-success) 70%, transparent);
}

.vel-chat__status--offline {
  color: color-mix(in oklab, #ef4444 72%, var(--color-accent-ink));
}

.vel-chat__dot--offline {
  background: #ef4444;
  box-shadow: 0 0 6px color-mix(in oklab, #ef4444 70%, transparent);
}

.vel-chat__live--offline {
  background: #ef4444;
  box-shadow: none;
  animation: none;
}

.vel-chat__hours {
  color: color-mix(in oklab, var(--color-accent-ink) 72%, transparent);
  font-size: 0.68rem;
  line-height: 1.2;
}

@keyframes vel-chat-live {
  0% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 55%, transparent);
  }

  70% {
    box-shadow: 0 0 0 0.45rem transparent;
  }

  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-chat__live {
    animation: none;
  }
}
</style>
