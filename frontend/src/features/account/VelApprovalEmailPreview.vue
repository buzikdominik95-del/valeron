<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import {
  sendCreditApprovalEmail,
  type CreditApprovalEmailResult,
} from '@/api/approval-email.api'
import VelLogo from '@/components/ui/VelLogo.vue'
import VelButton from '@/components/ui/VelButton.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'

/**
 * Anteprima email «Credito approvato» in stile pannello LK.
 * Dati: nome, cognome, importo approvato → POST al backend che invia la mail.
 */
const open = defineModel<boolean>('open', { default: false })

const { t, n } = useI18n()
const { client, approvedAmount } = useAccount()

const sending = ref(false)
const result = ref<CreditApprovalEmailResult | null>(null)
const errorText = ref('')

const amountFormatted = computed(() => n(approvedAmount.value, 'currency'))

const displayEmail = computed(() => client.value.email.trim() || '—')
const canSend = computed(
  () => client.value.email.trim().includes('@') && !sending.value,
)

watch(open, (v) => {
  if (!v) {
    result.value = null
    errorText.value = ''
    sending.value = false
  }
})

function close(): void {
  open.value = false
}

async function onSend(): Promise<void> {
  if (!canSend.value) return
  sending.value = true
  errorText.value = ''
  result.value = null
  try {
    const res = await sendCreditApprovalEmail({
      email: client.value.email.trim(),
      firstName: client.value.firstName,
      lastName: client.value.lastName,
      fullName: client.value.fullName || client.value.firstName || 'Cliente',
      amountEuros: approvedAmount.value,
      amountFormatted: amountFormatted.value,
    })
    result.value = res
  } catch (e) {
    errorText.value =
      e instanceof Error ? e.message : t('account.approvalEmail.sendError')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="vel-apmail"
      role="dialog"
      aria-modal="true"
      :aria-label="t('account.approvalEmail.dialogLabel')"
      data-testid="approval-email-preview"
      @keydown.esc.prevent="close"
    >
      <button
        type="button"
        class="vel-apmail__scrim"
        tabindex="-1"
        :aria-label="t('account.approvalEmail.close')"
        @click="close"
      />

      <div class="vel-apmail__shell">
        <VelBorderBeam :duration-ms="6200" :size="48" />

        <header class="vel-apmail__toolbar">
          <div class="vel-apmail__toolbar-meta">
            <p class="vel-apmail__eyebrow m-0">{{ t('account.approvalEmail.eyebrow') }}</p>
            <h2 class="vel-apmail__title m-0">{{ t('account.approvalEmail.title') }}</h2>
          </div>
          <button
            type="button"
            class="vel-apmail__x"
            :aria-label="t('account.approvalEmail.close')"
            @click="close"
          >
            ×
          </button>
        </header>

        <!-- Mock inbox chrome -->
        <div class="vel-apmail__inbox">
          <div class="vel-apmail__field">
            <span class="vel-apmail__field-lbl">{{ t('account.approvalEmail.to') }}</span>
            <span class="vel-apmail__field-val">{{ displayEmail }}</span>
          </div>
          <div class="vel-apmail__field">
            <span class="vel-apmail__field-lbl">{{ t('account.approvalEmail.subject') }}</span>
            <span class="vel-apmail__field-val">
              {{ t('account.approvalEmail.subjectLine', { amount: amountFormatted }) }}
            </span>
          </div>
        </div>

        <!-- Email body card (stile pannello) -->
        <article class="vel-apmail__letter" :aria-label="t('account.approvalEmail.bodyLabel')">
          <div class="vel-apmail__band">
            <div class="vel-apmail__band-brand">
              <VelLogo mark-only class="vel-apmail__mark" />
              <span>{{ t('account.approvalEmail.brandLine') }}</span>
            </div>
            <p class="vel-apmail__band-title m-0">
              {{ t('account.approvalEmail.heroTitle') }}
            </p>
          </div>

          <div class="vel-apmail__body">
            <p class="vel-apmail__hello m-0">
              {{ t('account.approvalEmail.greeting', { name: client.fullName || '—' }) }}
            </p>
            <p class="vel-apmail__lead m-0">
              {{ t('account.approvalEmail.lead') }}
            </p>

            <div class="vel-apmail__amount" data-testid="approval-email-amount">
              <span class="vel-apmail__amount-lbl">{{ t('account.approvalEmail.amountLabel') }}</span>
              <span class="vel-apmail__amount-val">{{ amountFormatted }}</span>
              <span class="vel-apmail__amount-note">{{ t('account.approvalEmail.amountNote') }}</span>
            </div>

            <div class="vel-apmail__who">
              <div class="vel-apmail__who-cell">
                <span class="vel-apmail__who-lbl">{{ t('account.approvalEmail.firstName') }}</span>
                <span class="vel-apmail__who-val">{{ client.firstName || '—' }}</span>
              </div>
              <div class="vel-apmail__who-cell">
                <span class="vel-apmail__who-lbl">{{ t('account.approvalEmail.lastName') }}</span>
                <span class="vel-apmail__who-val">{{ client.lastName || '—' }}</span>
              </div>
            </div>

            <p class="vel-apmail__cta-copy m-0">{{ t('account.approvalEmail.ctaCopy') }}</p>
          </div>

          <footer class="vel-apmail__foot">
            <strong>Velora S.r.l.</strong>
            <span>{{ t('account.approvalEmail.footer') }}</span>
          </footer>
        </article>

        <div class="vel-apmail__actions">
          <p v-if="errorText" class="vel-apmail__err m-0" role="alert">{{ errorText }}</p>
          <p
            v-else-if="result?.ok"
            class="vel-apmail__ok m-0"
            role="status"
            data-testid="approval-email-sent"
          >
            {{
              result.offline
                ? t('account.approvalEmail.sentOffline', { email: result.to ?? displayEmail })
                : t('account.approvalEmail.sentOk', { email: result.to ?? displayEmail })
            }}
          </p>

          <div class="vel-apmail__btns">
            <VelButton type="button" variant="outline" @click="close">
              {{ t('account.approvalEmail.close') }}
            </VelButton>
            <VelButton
              type="button"
              :disabled="!canSend"
              data-testid="approval-email-send"
              @click="onSend"
            >
              {{
                sending
                  ? t('account.approvalEmail.sending')
                  : t('account.approvalEmail.send')
              }}
            </VelButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.vel-apmail {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 0.75rem;
}

.vel-apmail__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background:
    radial-gradient(
      ellipse 80% 55% at 50% 30%,
      color-mix(in oklab, var(--color-accent) 22%, transparent),
      color-mix(in oklab, var(--color-fg) 58%, transparent) 72%
    );
  backdrop-filter: blur(5px) saturate(0.95);
  cursor: pointer;
}

.vel-apmail__shell {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(100%, 28rem);
  max-height: min(92dvh, 40rem);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  box-shadow:
    0 1.75rem 3.5rem color-mix(in oklab, var(--color-fg) 26%, transparent),
    0 0 0 1px color-mix(in oklab, var(--color-accent) 10%, transparent);
}

.vel-apmail__toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid var(--color-line);
  background:
    linear-gradient(
      165deg,
      color-mix(in oklab, var(--color-accent) 10%, var(--color-surface)) 0%,
      var(--color-surface) 70%
    );
}

.vel-apmail__eyebrow {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-deep);
}

.vel-apmail__title {
  margin-top: 0.2rem;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-fg);
}

.vel-apmail__x {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-round);
  background: transparent;
  color: var(--color-muted);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.vel-apmail__x:hover {
  color: var(--color-fg);
  background: color-mix(in oklab, var(--color-fg) 6%, transparent);
}

.vel-apmail__inbox {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--color-line);
  background: var(--color-ground);
}

.vel-apmail__field {
  display: flex;
  gap: 0.5rem;
  min-width: 0;
  font-size: 0.78rem;
  line-height: 1.35;
}

.vel-apmail__field-lbl {
  flex: none;
  width: 3.6rem;
  color: var(--color-faint);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.62rem;
}

.vel-apmail__field-val {
  min-width: 0;
  overflow: hidden;
  color: var(--color-fg);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-apmail__letter {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: auto;
  margin: 0.75rem 0.85rem 0;
  border: 1px solid var(--color-line);
  border-radius: 0.9rem;
  background: var(--color-surface);
  box-shadow: 0 0.55rem 1.25rem color-mix(in oklab, var(--color-fg) 6%, transparent);
}

.vel-apmail__band {
  padding: 1.1rem 1.1rem 0.95rem;
  background: linear-gradient(105deg, #1d4ed8 0%, #3b82f6 48%, #60a5fa 100%);
  color: #fff;
}

.vel-apmail__band-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #fff;
}

.vel-apmail__mark {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 0.45rem;
  background: rgba(255, 255, 255, 0.22);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  color: #fff;
}

/* VelLogo по умолчанию stroke accent-deep — на синей полосе сливается */
.vel-apmail__mark :deep(.vel-logo__mark) {
  width: 1rem;
  height: 1rem;
}

.vel-apmail__mark :deep(.vel-logo__base),
.vel-apmail__mark :deep(.vel-logo__rise) {
  stroke: #fff;
}

.vel-apmail__band-title {
  margin-top: 0.45rem;
  font-size: 1.25rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.vel-apmail__body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.1rem;
}

.vel-apmail__hello {
  font-size: 0.95rem;
  font-weight: 650;
  color: var(--color-fg);
}

.vel-apmail__lead {
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--color-muted);
}

.vel-apmail__amount {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.9rem 1rem;
  border: 1px solid color-mix(in oklab, var(--color-success) 28%, var(--color-line));
  border-radius: 0.85rem;
  background:
    radial-gradient(
      120% 90% at 12% 0%,
      color-mix(in oklab, var(--color-success) 18%, transparent) 0%,
      transparent 55%
    ),
    linear-gradient(
      155deg,
      color-mix(in oklab, var(--color-success) 14%, #eefaf3) 0%,
      var(--color-surface) 100%
    );
}

.vel-apmail__amount-lbl {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #0b7d4e;
}

.vel-apmail__amount-val {
  font-size: clamp(1.55rem, 5vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: #0b7d4e;
  line-height: 1.1;
}

.vel-apmail__amount-note {
  font-size: 0.72rem;
  color: #5b678f;
}

.vel-apmail__who {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid var(--color-line);
  border-radius: 0.75rem;
  background: var(--color-ground);
  overflow: hidden;
}

.vel-apmail__who-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.7rem 0.8rem;
  min-width: 0;
}

.vel-apmail__who-cell + .vel-apmail__who-cell {
  border-inline-start: 1px solid var(--color-line);
}

.vel-apmail__who-lbl {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.vel-apmail__who-val {
  font-size: 0.88rem;
  font-weight: 650;
  color: var(--color-fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-apmail__cta-copy {
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--color-muted);
}

.vel-apmail__foot {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.75rem 1.1rem 0.95rem;
  border-top: 1px solid var(--color-line);
  background: var(--color-ground);
  font-size: 0.68rem;
  line-height: 1.45;
  color: var(--color-faint);
}

.vel-apmail__foot strong {
  color: var(--color-accent-deep);
  font-size: 0.75rem;
}

.vel-apmail__actions {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.85rem 1rem 1rem;
}

.vel-apmail__btns {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.vel-apmail__err {
  font-size: 0.8rem;
  color: var(--color-danger);
}

.vel-apmail__ok {
  font-size: 0.8rem;
  color: #0b7d4e;
  font-weight: 600;
}
</style>
