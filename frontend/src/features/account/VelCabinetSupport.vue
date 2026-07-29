<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CABINET_HEADING_ID } from '@/composables/useCabinetTab'
import { useSupportChat } from '@/composables/useSupportChat'
import { endsRun, startsNewDay } from '@/features/account/chat-thread'
import VelChatBubble from '@/features/account/VelChatBubble.vue'
import VelChatHeader from '@/features/account/VelChatHeader.vue'
import VelChatComposer from '@/features/account/VelChatComposer.vue'

/**
 * Раздел «Assistenza»: единый чат.
 *
 * Шаг воронки messenger больше не отдельная панель: шаблон оплаты лежит
 * в том же composer, а реплика консультанта — в той же ленте.
 * Waiting — компактная полоска внутри карточки, не второе «окно».
 */
const { t, d } = useI18n()

const {
  messages,
  draft,
  canSend,
  send,
  sending,
  justSent,
  threadEl,
  isFunnelMode,
  isWaitingAdmin,
} = useSupportChat()
void threadEl

const thread = computed(() =>
  messages.value.map((message, index) => ({
    message,
    dayLabel: startsNewDay(message, messages.value[index - 1])
      ? d(new Date(message.at), 'day')
      : null,
    last: endsRun(message, messages.value[index + 1]),
  })),
)
</script>

<template>
  <div class="vel-chat" :class="{ 'vel-chat--funnel': isFunnelMode || isWaitingAdmin }">
    <h2 :id="CABINET_HEADING_ID" tabindex="-1" class="sr-only">
      {{ t('account.pages.support.title') }}
    </h2>

    <section class="vel-chat__card" :aria-label="t('account.pages.support.title')">
      <VelChatHeader />

      <!-- Ожидание оператора — внутри чата, не отдельным окном -->
      <div
        v-if="isWaitingAdmin"
        class="vel-chat__wait"
        role="status"
        :aria-label="t('account.commission.waiting.busy')"
      >
        <span class="vel-chat__wait-ring" aria-hidden="true" />
        <div class="min-w-0">
          <p class="vel-chat__wait-title">{{ t('account.commission.waiting.title') }}</p>
          <p class="vel-chat__wait-body">
            {{ t('account.commission.waiting.body') }}
          </p>
        </div>
      </div>

      <div
        ref="threadEl"
        class="vel-chat__thread"
        role="log"
        aria-live="polite"
        tabindex="0"
        :aria-label="t('account.support.chat.threadLabel')"
      >
        <!--
          Точечный фон — CSS на .vel-chat__thread, не absolute-слой внутри скролла:
          иначе при прокрутке ленты паттерн «съезжал» и оставлял пустые зоны.
        -->
        <div class="vel-chat__stack">
          <!--
            Только реальные сообщения с timestamp (welcome — 2 пузыря из push).
            Без funnel-hint / localNote под composer (фотка 1).
            Дата — перед первым сообщением через startsNewDay(prev=undefined).
          -->
          <template v-for="item in thread" :key="item.message.id">
            <p v-if="item.dayLabel" class="vel-chat__day">{{ item.dayLabel }}</p>

            <VelChatBubble
              :author="item.message.author"
              :text="item.message.text"
              :at="item.message.at"
              :delivery="item.message.delivery"
              :last="item.last"
            />
          </template>
        </div>
      </div>

      <VelChatComposer
        v-model="draft"
        :can-send="canSend"
        :sending="sending"
        :just-sent="justSent"
        :funnel="isFunnelMode"
        @send="send"
      />
    </section>
  </div>
</template>

<style scoped>
.vel-chat {
  --vel-chat-reserve: calc(
    var(--vel-tabbar-h, 4rem) + var(--vel-tabbar-gap, 0.5rem) * 2 +
      env(safe-area-inset-bottom) + 3.25rem
  );

  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  block-size: calc(100dvh - var(--vel-shell-head-h, 9.6rem) - var(--vel-chat-reserve));
  min-block-size: min(22rem, 70dvh);
  /* На всю ширину main — как «бровь» */
  width: 100%;
  max-inline-size: none;
}

.vel-chat__card {
  display: flex;
  overflow: hidden;
  min-block-size: 0;
  flex: 1 1 auto;
  flex-direction: column;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  box-shadow: 0 10px 28px color-mix(in oklab, var(--color-fg) 6%, transparent);
}

.vel-chat--funnel .vel-chat__card {
  border-color: color-mix(in oklab, var(--color-accent) 35%, var(--color-line));
  box-shadow:
    0 10px 28px color-mix(in oklab, var(--color-fg) 6%, transparent),
    0 0 0 1px color-mix(in oklab, var(--color-accent) 12%, transparent);
}

@media (min-width: 64rem) {
  .vel-chat {
    --vel-chat-reserve: 4.5rem;
  }
}

.vel-chat__wait {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.7rem 0.9rem;
  border-block-end: 1px solid var(--color-line);
  background: color-mix(in oklab, var(--color-accent) 8%, var(--color-ground));
  animation: vel-chat-wait-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-chat__wait-ring {
  display: inline-block;
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
  margin-top: 0.15rem;
  border: 2px solid color-mix(in oklab, var(--color-accent) 28%, transparent);
  border-top-color: var(--color-accent);
  border-radius: var(--radius-round);
  animation: vel-chat-spin 0.85s linear infinite;
}

.vel-chat__wait-title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-fg);
}

.vel-chat__wait-body {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--color-muted);
}

.vel-chat__thread {
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  min-block-size: 12rem;
  flex: 1 1 auto;
  padding: 0.85rem;
  overscroll-behavior-block: contain;
  /*
   * Фон на самом scroll-контейнере (не на absolute-дочернем):
   * attachment scroll — паттерн привязан к viewport ленты и не уезжает
   * вместе с сообщениями при скролле.
   */
  background-color: var(--color-ground);
  background-image: radial-gradient(
    circle at center,
    color-mix(in oklab, var(--color-line-strong) 50%, transparent) 0,
    color-mix(in oklab, var(--color-line-strong) 50%, transparent) 1px,
    transparent 1.1px
  );
  background-size: 18px 18px;
  background-repeat: repeat;
  background-attachment: scroll;
  background-origin: padding-box;
  background-clip: padding-box;
}

.vel-chat__stack {
  position: relative;
  z-index: 1;
  display: flex;
  min-block-size: 100%;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.4rem;
}

.vel-chat__thread:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.vel-chat__funnel-hint {
  margin: 0 0 0.15rem;
  max-inline-size: min(92%, 28rem);
  padding: 0.35rem 0.6rem;
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-accent) 10%, var(--color-surface));
  color: var(--color-muted);
  font-size: 0.72rem;
  line-height: 1.35;
  animation: vel-chat-hint-in 0.45s 0.12s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-chat__day {
  margin: 0.5rem auto 0.15rem;
  padding: 0.15rem 0.6rem;
  border-radius: var(--radius-round);
  background-color: var(--color-surface);
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 600;
}

.vel-chat__note {
  margin: 0;
  color: var(--color-faint);
  font-size: 0.72rem;
  line-height: 1.4;
}

@keyframes vel-chat-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes vel-chat-wait-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes vel-chat-hint-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-chat__wait-ring,
  .vel-chat__wait,
  .vel-chat__funnel-hint {
    animation: none;
  }
}
</style>
