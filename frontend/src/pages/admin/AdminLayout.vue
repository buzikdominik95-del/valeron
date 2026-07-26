<template>
  <div id="admin-layout">
    <!-- Topnav -->
    <nav class="topnav">
      <div class="nav-logo">Velora Admin</div>
      <div class="nav-tabs">
        <button 
          class="nav-tab"
          :class="{active: currentView === 'chats'}"
          @click="switchView('chats')"
        >
          <i class="mi">forum</i> Чаты
        </button>
        <button 
          class="nav-tab"
          :class="{active: currentView === 'managers'}"
          @click="switchView('managers')"
          v-if="isAdmin"
        >
          <i class="mi">group</i> Менеджеры
        </button>
        <button 
          class="nav-tab"
          :class="{active: currentView === 'tenants'}"
          @click="switchView('tenants')"
        >
          <i class="mi">business</i> Тенанты
        </button>
        <button 
          class="nav-tab"
          :class="{active: currentView === 'documents'}"
          @click="switchView('documents')"
        >
          <i class="mi">description</i> Документы
        </button>
        <button 
          class="nav-tab"
          :class="{active: currentView === 'settings'}"
          @click="switchView('settings')"
          v-if="isAdmin"
        >
          <i class="mi">settings</i> Настройки
        </button>
      </div>
      <div class="nav-user">
        <div class="nav-user-info">
          <div class="nav-user-name">{{ user?.name || 'Админ' }}</div>
          <div class="role-badge" :style="roleBadgeStyle">{{ roleLabel }}</div>
        </div>
        <button class="logout-btn" @click="handleLogout" title="Выйти">
          <i class="mi">logout</i>
        </button>
      </div>
    </nav>

    <!-- Main content -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Toast notifications -->
    <div class="toast" v-if="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const user = computed(() => authStore.user);
const isAdmin = computed(() => user.value?.role === 'admin');
const currentView = ref('chats');

const roleLabel = computed(() => {
  const roles = {
    admin: 'Администратор',
    manager: 'Менеджер',
    okk: 'ОКК'
  };
  return roles[user.value?.role] || 'Пользователь';
});

const roleBadgeStyle = computed(() => {
  const colors = {
    admin: 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);',
    manager: 'background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);',
    okk: 'background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);'
  };
  return colors[user.value?.role] || 'background: #6c757d;';
});

// Toast notifications
const toast = ref('');
let toastTimer = null;

const showToast = (message) => {
  toast.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = '';
  }, 2600);
};

// View switching
const switchView = (view) => {
  currentView.value = view;
  router.push(`/admin/${view}`);
};

// Sync current view with route
watch(() => route.path, (newPath) => {
  const match = newPath.match(/\/admin\/([^/]+)/);
  if (match) {
    currentView.value = match[1];
  }
}, { immediate: true });

// Logout
const handleLogout = async () => {
  if (confirm('Вы уверены, что хотите выйти?')) {
    await authStore.logout();
    router.push('/login');
  }
};

// Expose for child components
defineExpose({
  showToast
});
</script>

<style scoped>
/* ============================================================================
   Admin Layout Styles
   Adapted from admin2/app.html dark theme
   ============================================================================ */

#admin-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0f1923;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

/* ── Topnav ────────────────────────────────────────────────────────────── */

.topnav {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 50px;
  background: #141e2b;
  border-bottom: 1px solid #1e2936;
  padding: 0 16px;
  flex-shrink: 0;
}

.nav-logo {
  font-family: 'Unbounded', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #00b4aa 0%, #008f87 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  padding-right: 16px;
  border-right: 1px solid #1e2936;
}

.nav-tabs {
  display: flex;
  gap: 2px;
  flex: 1;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #9ca3af;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-tab:hover {
  background: #1a2532;
  color: #e0e0e0;
}

.nav-tab.active {
  background: #1e2936;
  color: #00b4aa;
}

.nav-tab .mi {
  font-size: 18px;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 16px;
  border-left: 1px solid #1e2936;
}

.nav-user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.nav-user-name {
  font-size: 13px;
  font-weight: 500;
  color: #e0e0e0;
}

.role-badge {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #1a2532;
  color: #ef4444;
}

.logout-btn .mi {
  font-size: 20px;
}

/* ── Main Content ──────────────────────────────────────────────────────── */

.main-content {
  flex: 1;
  overflow: hidden;
}

/* ── Toast ─────────────────────────────────────────────────────────────── */

.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 20px;
  background: #1e2936;
  border: 1px solid #2d3847;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.2s ease-out;
  z-index: 9999;
}

@keyframes slideIn {
  from {
    transform: translateX(120%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* ── Transitions ───────────────────────────────────────────────────────── */

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Material Icons ────────────────────────────────────────────────────── */

.mi {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  display: inline-block;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  word-wrap: normal;
  white-space: nowrap;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: 'liga';
}

.mi.xs {
  font-size: 16px;
}

/* ── Responsive ────────────────────────────────────────────────────────── */

@media (max-width: 768px) {
  .nav-tabs {
    overflow-x: auto;
    scrollbar-width: none;
  }
  
  .nav-tabs::-webkit-scrollbar {
    display: none;
  }
  
  .nav-tab {
    flex-shrink: 0;
  }
  
  .nav-user-name {
    display: none;
  }
}
</style>
