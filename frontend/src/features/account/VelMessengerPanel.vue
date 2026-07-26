<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessengerDraft } from '@/composables/useMessengerDraft'
import { usePanelMotion } from '@/composables/usePanelMotion'
import { useAutoAnimate } from '@/composables/useAutoAnimate'
import VelButton from '@/components/ui/VelButton.vue'
import VelField from '@/components/ui/VelField.vue'
import VelTextarea from '@/components/ui/VelTextarea.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

const emit = defineEmits<{ sent: [] }>()

const { t } = useI18n()
const { draft, sent, canSend, send } = useMessengerDraft()

const root = useTemplateRef<HTMLElement>('root')
usePanelMotion(root)

const thread = useTemplateRef<HTMLElement>('thread')
useAutoAnimate(thread)

function onSubmit(): void {
  if (send()) emit('sent')
}
</script>

<template>
  <section
    ref="root"
    class="flex flex-col overflow-hidden rounded-panel border border-line bg-surface"
  >
    <header class="flex items-center gap-3 border-b border-line bg-ground px-4 py-3">
      <span
        class="vel-msg-avatar inline-flex size-9 shrink-0 items-center justify-center bg-accent font-bold text-accent-ink"
        aria-hidden="true"
      >
        V
      </span>
      <div class="min-w-0">
        <h2 class="m-0 text-sm font-semibold text-fg">
          {{ t('account.commission.messenger.title') }}
        </h2>
        <p class="m-0 flex items-center gap-1.5 text-xs text-muted">
          <span class="vel-msg-dot" aria-hidden="true" />
          {{ t('account.commission.messenger.online') }}
        </p>
      </div>
      <VelAccountSign sign="shield" class="ms-auto text-muted" />
    </header>

    <div
      ref="thread"
      class="flex flex-col gap-2 bg-ground/70 px-4 py-4"
      role="log"
      :aria-label="t('account.commission.messenger.threadLabel')"
    >
      <div
        class="vel-msg-in max-w-[92%] rounded-control border border-line bg-surface px-3 py-2 text-sm text-fg"
      >
        <p class="m-0">{{ t('account.commission.messenger.agentHello') }}</p>
      </div>
      <p class="m-0 text-xs text-muted">{{ t('account.commission.messenger.hint') }}</p>
      <div
        v-if="sent"
        class="vel-msg-out ms-auto max-w-[92%] rounded-control bg-accent px-3 py-2 text-sm text-accent-ink"
      >
        <p class="m-0 whitespace-pre-wrap">{{ draft }}</p>
      </div>
    </div>

    <form class="flex flex-col gap-3 border-t border-line px-4 py-3" @submit.prevent="onSubmit">
      <VelField :label="t('account.commission.messenger.draftLabel')">
        <VelTextarea v-model="draft" :rows="5" :readonly="sent" autocomplete="off" />
      </VelField>

      <p class="m-0 text-xs text-faint">{{ t('account.commission.messenger.localNote') }}</p>

      <VelButton type="submit" block size="lg" :disabled="!canSend">
        {{ sent ? t('account.commission.messenger.sent') : t('account.commission.messenger.send') }}
      </VelButton>
    </form>
  </section>
</template>

<style scoped>
/* Круг — из токена, а не утилитой rounded-full: правило про круглое в
   main.css требует одного источника значения, а точка «в сети» строкой ниже
   и так берёт его отсюда. Две разные записи одного радиуса в одном файле
   означали бы, что при смене токена половина панели за ним не поедет. */
.vel-msg-avatar {
  border-radius: var(--radius-round);
  box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-accent) 40%, transparent);
  animation: vel-msg-ring 2.6s ease-out infinite;
}

.vel-msg-dot {
  display: inline-block;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: var(--radius-round);
  background: var(--color-success);
  box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 50%, transparent);
  animation: vel-msg-online 1.8s ease-out infinite;
}

.vel-msg-in {
  animation: vel-msg-slide 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-msg-out {
  animation: vel-msg-slide 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes vel-msg-ring {
  0% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-accent) 40%, transparent);
  }

  70% {
    box-shadow: 0 0 0 10px transparent;
  }

  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

@keyframes vel-msg-online {
  0% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 55%, transparent);
  }

  70% {
    box-shadow: 0 0 0 6px transparent;
  }

  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

@keyframes vel-msg-slide {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-msg-avatar,
  .vel-msg-dot,
  .vel-msg-in,
  .vel-msg-out {
    animation: none;
  }
}
</style>
