<template>
  <div class="px-6 py-8 max-w-[640px] mx-auto">
    <!-- Back button -->
    <button
      type="button"
      class="flex items-center justify-center size-10 rounded-lg bg-transparent border border-white text-foreground/80"
      aria-label="{{ t('cloudVerifyEmail_back') }}"
      @click="goBack"
    >
      <i class="pi pi-arrow-left" />
    </button>

    <!-- Title -->
    <h1 class="mt-8 text-2xl font-semibold">
      {{ t('cloudVerifyEmail_title') }}
    </h1>

    <!-- Body copy -->
    <p class="mt-6 text-base text-foreground/80">
      {{ t('cloudVerifyEmail_sent') }}
    </p>
    <p class="mt-3 text-base font-medium">{{ authStore.userEmail }}</p>

    <p class="mt-6 text-base text-foreground/80">
      {{ t('cloudVerifyEmail_clickToContinue') }}
    </p>

    <p class="mt-10 text-base text-foreground/80">
      {{ t('cloudVerifyEmail_didntReceive') }}
      <span class="text-blue-400 no-underline cursor-pointer" @click="onSend">
        {{ t('cloudVerifyEmail_resend') }}</span
      >
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useFirebaseAuth } from 'vuefire'

import { useToastStore } from '@/platform/updates/common/toastStore'
import { useFirebaseAuthStore } from '@/stores/firebaseAuthStore'

const authStore = useFirebaseAuthStore()
const auth = useFirebaseAuth()!

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

let intervalId: number | null = null
let timeoutId: number | null = null
const redirectInProgress = ref(false)

function clearPolling(): void {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
  if (timeoutId !== null) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
}

async function redirectToNextStep(): Promise<void> {
  if (redirectInProgress.value) return

  redirectInProgress.value = true
  clearPolling()

  const inviteCode = route.query.inviteCode as string | undefined

  if (inviteCode) {
    await router.push({
      name: 'cloud-invite-check',
      query: { inviteCode }
    })
  } else {
    await router.push({ name: 'cloud-user-check' })
  }
}

const goBack = async () => {
  const inviteCode = route.query.inviteCode as string | undefined
  const authStore = useFirebaseAuthStore()
  // If the user is already verified (email link already clicked),
  // continue to the next step automatically.
  if (authStore.isEmailVerified) {
    await router.push({
      name: 'cloud-invite-check',
      query: inviteCode ? { inviteCode } : {}
    })
  } else {
    await router.push({
      name: 'cloud-login',
      query: {
        inviteCode
      }
    })
  }
}

async function onSend() {
  try {
    await authStore.verifyEmail()
    useToastStore().add({
      severity: 'success',
      summary: t('cloudVerifyEmail_toast_success', {
        email: authStore.userEmail
      })
    })
  } catch (e) {
    useToastStore().add({
      severity: 'error',
      summary: t('cloudVerifyEmail_toast_failed')
    })
  }
}

onMounted(async () => {
  // If the user is already verified (email link already clicked),
  // continue to the next step automatically.
  if (authStore.isEmailVerified) {
    return redirectToNextStep()
  }

  // Send initial verification email
  await onSend()

  // Start polling to check email verification status
  intervalId = window.setInterval(async () => {
    if (auth.currentUser && !redirectInProgress.value) {
      await auth.currentUser.reload()
      if (auth.currentUser?.emailVerified) {
        void redirectToNextStep()
      }
    }
  }, 5000) // Check every 5 seconds

  // Stop polling after 5 minutes
  timeoutId = window.setTimeout(
    () => {
      clearPolling()
    },
    5 * 60 * 1000
  )
})

onUnmounted(() => {
  clearPolling()
})
</script>
