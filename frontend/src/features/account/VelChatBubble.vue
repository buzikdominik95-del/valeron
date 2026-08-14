<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import type { ChatAttachment, ChatAuthor, ChatDelivery } from '@/features/account/chat-thread'
import VelAvatar from '@/components/ui/VelAvatar.vue'
import consultantPhoto from '@/img/consulente-schierano.jpg'

/**
 * Один пузырь переписки.
 *
 * СВОИ СПРАВА, ЧУЖИЕ СЛЕВА. Рядом — аватар:
 *   agent  → фото менеджера (как в шапке чата);
 *   client → инициалы клиента.
 *
 * ВРЕМЯ ТОЛЬКО У ПОСЛЕДНЕГО В СЕРИИ. СОСТОЯНИЕ ОТПРАВКИ — словом, не галочками.
 */
const props = defineProps<{
  author: ChatAuthor
  text: string
  /**
   * ISO-8601 — форматируем здесь, по правилам языка интерфейса.
   * Пустая строка означает «времени нет» (приветствие поддержки).
   */
  at: string
  delivery: ChatDelivery
  /** Последний ли в череде сообщений одного автора. */
  last: boolean
  /** Локальное фото (data URL) — legacy. */
  imageUrl?: string
  /** Фото или файл. */
  attachment?: ChatAttachment | null
}>()

const { t, d } = useI18n()
const { client } = useAccount()

const own = computed(() => props.author === 'client')

const imageSrc = computed(() => {
  if (props.attachment?.kind === 'image') return props.attachment.url
  return props.imageUrl || ''
})

const fileAttach = computed(() =>
  props.attachment?.kind === 'file' ? props.attachment : null,
)

const clientName = computed(() => {
  const full = client.value.fullName.trim()
  if (full) return full
  return [client.value.firstName, client.value.lastName].filter(Boolean).join(' ') || 'Cliente'
})

/** Показывать отметку только у последнего в серии и только если время есть. */
const showMeta = computed(() => props.last && props.at !== '')

const timeText = computed(() => (props.at === '' ? '' : d(new Date(props.at), 'time')))

/** Полная дата и время — голосом: на экране стоит только «14:31». */
const stampLabel = computed(() => (props.at === '' ? '' : d(new Date(props.at), 'long')))

/* Полноэкранный просмотр фото: клик по превью — открыть, Esc/клик — закрыть. */
const lightboxOpen = ref(false)

const onLightboxKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeLightbox()
}

const openLightbox = () => {
  if (!imageSrc.value) return
  lightboxOpen.value = true
  window.addEventListener('keydown', onLightboxKey)
}

const closeLightbox = () => {
  lightboxOpen.value = false
  window.removeEventListener('keydown', onLightboxKey)
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onLightboxKey)
})
</script>

<template>
  <div
    class="vel-bubble"
    :class="[own ? 'vel-bubble--own' : 'vel-bubble--other', { 'vel-bubble--last': last }]"
  >
    <!-- Agent: аватар слева -->
    <span v-if="!own" class="vel-bubble__ava" aria-hidden="true">
      <img
        class="vel-bubble__photo"
        :src="consultantPhoto"
        alt=""
        width="32"
        height="32"
        decoding="async"
      />
    </span>

    <div class="vel-bubble__body">
      <!-- Имя менеджера не дублируем над каждым пузырём (фотка 4 — только текст). -->
      <img
        v-if="imageSrc"
        class="vel-bubble__img"
        :src="imageSrc"
        alt=""
        loading="lazy"
        decoding="async"
        role="button"
        tabindex="0"
        @click="openLightbox"
        @keydown.enter="openLightbox"
      />
      <Teleport to="body">
        <div
          v-if="lightboxOpen"
          class="vel-lightbox"
          role="dialog"
          aria-modal="true"
          @click="closeLightbox"
        >
          <img class="vel-lightbox__img" :src="imageSrc" alt="" @click.stop />
          <button
            type="button"
            class="vel-lightbox__close"
            aria-label="Chiudi"
            @click="closeLightbox"
          >
            &#10005;
          </button>
        </div>
      </Teleport>
      <a
        v-if="fileAttach"
        class="vel-bubble__file"
        :href="fileAttach.url"
        :download="fileAttach.name"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg class="vel-bubble__file-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 3.5h7.2L17.5 6.8V20.5H7V3.5Z"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <path d="M14.2 3.5V6.9H17.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
        </svg>
        <span class="vel-bubble__file-name">{{ fileAttach.name }}</span>
      </a>
      <p v-if="text" class="vel-bubble__text">{{ text }}</p>

      <p v-if="showMeta" class="vel-bubble__meta">
        <time :datetime="at" class="vel-num">
          {{ timeText }}
          <span class="sr-only">{{ stampLabel }}</span>
        </time>

        <span v-if="own && delivery === 'local'" class="vel-bubble__state">
          {{ t('account.support.chat.stateLocal') }}
        </span>
        <span
          v-else-if="own && delivery === 'failed'"
          class="vel-bubble__state vel-bubble__state--bad"
        >
          {{ t('account.support.chat.stateFailed') }}
        </span>
      </p>
    </div>

    <!-- Client: аватар справа -->
    <span v-if="own" class="vel-bubble__ava vel-bubble__ava--own" aria-hidden="true">
      <VelAvatar class="vel-bubble__user" :name="clientName" />
    </span>
  </div>
</template>

<style scoped>
.vel-bubble {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
  max-inline-size: 100%;
  animation: vel-bubble-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-bubble--own {
  justify-content: flex-end;
  transform-origin: bottom right;
  animation-name: vel-bubble-own-in;
}

.vel-bubble--other {
  justify-content: flex-start;
  transform-origin: bottom left;
  animation-name: vel-bubble-other-in;
}

.vel-bubble__ava {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: flex-end;
  inline-size: 2rem;
  block-size: 2rem;
  margin-block-end: 0.1rem;
}

.vel-bubble__photo {
  inline-size: 2rem;
  block-size: 2rem;
  border-radius: var(--radius-round);
  object-fit: cover;
  object-position: center 18%;
  box-shadow:
    0 0 0 1.5px color-mix(in oklab, var(--color-line) 80%, transparent),
    0 2px 6px color-mix(in oklab, var(--color-fg) 10%, transparent);
}

.vel-bubble__ava--own {
  --vel-avatar-size: 2rem;
}

.vel-bubble__user {
  box-shadow:
    0 0 0 1.5px color-mix(in oklab, var(--color-accent) 35%, transparent),
    0 2px 6px color-mix(in oklab, var(--color-accent-deep) 18%, transparent);
}

.vel-bubble__agent-name {
  margin: 0 0 0.2rem;
  color: var(--color-success);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

@keyframes vel-bubble-own-in {
  from {
    opacity: 0;
    transform: scale(0.88) translate(0.85rem, 0.55rem);
  }

  60% {
    opacity: 1;
  }

  to {
    opacity: 1;
    transform: scale(1) translate(0, 0);
  }
}

@keyframes vel-bubble-other-in {
  from {
    opacity: 0;
    transform: scale(0.9) translate(-0.55rem, 0.4rem);
  }

  to {
    opacity: 1;
    transform: scale(1) translate(0, 0);
  }
}

.vel-bubble__body {
  max-inline-size: min(78%, 30rem);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-panel);
}

.vel-bubble--other .vel-bubble__body {
  background-color: var(--color-raised);
  color: var(--color-fg);
}

.vel-bubble--own .vel-bubble__body {
  background-color: var(--color-accent-deep);
  color: var(--color-accent-ink);
  box-shadow: 0 2px 10px color-mix(in oklab, var(--color-accent-deep) 22%, transparent);
  animation: vel-bubble-glow 0.7s ease-out both;
}

/* Хвостик у последнего в серии */
.vel-bubble--last.vel-bubble--own .vel-bubble__body {
  border-end-end-radius: 0.25rem;
}

.vel-bubble--last.vel-bubble--other .vel-bubble__body {
  border-end-start-radius: 0.25rem;
}

.vel-bubble__img {
  display: block;
  max-inline-size: min(100%, 16rem);
  max-block-size: 14rem;
  margin: 0 0 0.35rem;
  border-radius: calc(var(--radius-panel) - 0.15rem);
  object-fit: cover;
  cursor: zoom-in;
}

.vel-lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgb(10 12 16 / 88%);
  cursor: zoom-out;
}

.vel-lightbox__img {
  max-inline-size: 100%;
  max-block-size: 100%;
  border-radius: 0.5rem;
  object-fit: contain;
  cursor: default;
}

.vel-lightbox__close {
  position: absolute;
  inset-block-start: 0.9rem;
  inset-inline-end: 1rem;
  inline-size: 2.4rem;
  block-size: 2.4rem;
  border: 0;
  border-radius: 50%;
  background: rgb(255 255 255 / 12%);
  color: #fff;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}

.vel-lightbox__close:hover {
  background: rgb(255 255 255 / 24%);
}

.vel-bubble__file {
  display: inline-flex;
  max-inline-size: 100%;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.35rem;
  padding: 0.4rem 0.55rem;
  border-radius: calc(var(--radius-panel) - 0.2rem);
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.25;
}

.vel-bubble--other .vel-bubble__file {
  background: color-mix(in oklab, var(--color-accent) 10%, var(--color-surface));
  color: var(--color-accent-deep);
}

.vel-bubble--own .vel-bubble__file {
  background: color-mix(in oklab, var(--color-accent-ink) 16%, transparent);
  color: var(--color-accent-ink);
}

.vel-bubble__file-ico {
  flex: 0 0 auto;
  inline-size: 1.1rem;
  block-size: 1.1rem;
}

.vel-bubble__file-name {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-bubble__text {
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font-size: 0.9rem;
  line-height: 1.45;
}

.vel-bubble__meta {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 0.4rem;
  margin: 0.2rem 0 0;
  font-size: 0.68rem;
  line-height: 1.2;
}

.vel-bubble--other .vel-bubble__meta {
  color: var(--color-muted);
}

.vel-bubble--own .vel-bubble__meta {
  color: color-mix(in oklab, var(--color-accent-ink) 78%, transparent);
}

.vel-bubble__state--bad {
  color: color-mix(in oklab, var(--color-accent-ink) 92%, var(--color-danger));
  font-weight: 600;
}

@keyframes vel-bubble-glow {
  from {
    box-shadow:
      0 0 0 0 color-mix(in oklab, var(--color-accent) 40%, transparent),
      0 2px 10px color-mix(in oklab, var(--color-accent-deep) 22%, transparent);
  }

  to {
    box-shadow: 0 2px 10px color-mix(in oklab, var(--color-accent-deep) 22%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-bubble,
  .vel-bubble--own .vel-bubble__body {
    animation: none;
  }
}
</style>
