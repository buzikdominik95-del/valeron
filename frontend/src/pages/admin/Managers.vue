<template>
  <div class="admin-managers">
    <div class="page-header">
      <h1>Управление менеджерами</h1>
      <button class="primary-btn" @click="openManagerModal(null)">
        <i class="mi xs">add</i> Добавить менеджера
      </button>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ managersList.length }}</div>
        <div class="stat-label">Всего менеджеров</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ trafficTotal }}%</div>
        <div class="stat-label">Распределение трафика</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ activeManagers }}</div>
        <div class="stat-label">Активных</div>
      </div>
    </div>

    <div class="managers-grid" v-if="!loadingManagers">
      <div 
        v-for="mgr in managersList" 
        :key="mgr.id"
        class="manager-card"
        :style="mcardGlowStyle(mgr)"
      >
        <div class="mcard-header">
          <div class="mcard-avatar" :style="mcardAvStyle(mgr)">
            {{ initials(mgr.display_name || mgr.username) }}
          </div>
          <div class="mcard-info">
            <div class="mcard-name">{{ mgr.display_name || mgr.username }}</div>
            <div class="mcard-username">@{{ mgr.username }}</div>
          </div>
          <div class="role-badge" :style="roleBadgeStyle(mgr.role)">
            {{ roleLabel(mgr.role) }}
          </div>
        </div>

        <div class="mcard-stats">
          <div class="mcard-stat">
            <i class="mi xs">trending_up</i>
            <span>{{ mgr.traffic_pct }}% трафика</span>
          </div>
          <div class="mcard-stat">
            <i class="mi xs">forum</i>
            <span>{{ mgr.chats_count || 0 }} чатов</span>
          </div>
          <div class="mcard-stat" v-if="mgr.last_seen">
            <i class="mi xs">schedule</i>
            <span>{{ timeAgo(mgr.last_seen) }}</span>
          </div>
        </div>

        <div class="mcard-actions">
          <button class="ghost-btn" @click="openManagerModal(mgr)">
            <i class="mi xs">edit</i> Редактировать
          </button>
          <button class="ghost-btn danger" @click="deleteManager(mgr)">
            <i class="mi xs">delete</i> Удалить
          </button>
          <button class="ghost-btn" @click="terminateSessions(mgr)" v-if="mgr.has_sessions">
            <i class="mi xs">logout</i> Завершить сессии
          </button>
        </div>
      </div>
    </div>

    <div v-else class="loading">Загрузка менеджеров...</div>

    <!-- Manager Modal -->
    <div class="modal-overlay" v-if="showManagerModal" @click.self="showManagerModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editManager?.id ? 'Редактировать' : 'Добавить' }} менеджера</h3>
          <button class="modal-close" @click="showManagerModal = false">
            <i class="mi">close</i>
          </button>
        </div>

        <div class="form-row">
          <label class="form-label">Логин</label>
          <input 
            class="form-input" 
            v-model="managerForm.username" 
            placeholder="username"
            :disabled="!!editManager?.id"
          >
        </div>

        <div class="form-row">
          <label class="form-label">Имя</label>
          <input 
            class="form-input" 
            v-model="managerForm.display_name" 
            placeholder="Имя менеджера"
          >
        </div>

        <div class="form-row">
          <label class="form-label">
            Пароль {{ editManager?.id ? '(пусто — не менять)' : '' }}
          </label>
          <input 
            type="password" 
            class="form-input" 
            v-model="managerForm.password" 
            placeholder="Пароль"
          >
        </div>

        <div class="form-row">
          <label class="form-label">Роль</label>
          <select class="form-select" v-model="managerForm.role">
            <option value="manager">Менеджер</option>
            <option value="admin">Администратор</option>
            <option value="okk">ОКК (только просмотр)</option>
          </select>
        </div>

        <div class="form-row">
          <label class="form-label">Доля трафика %</label>
          <input 
            type="number" 
            class="form-input" 
            v-model="managerForm.traffic_pct" 
            placeholder="0"
            min="0"
            max="100"
          >
        </div>

        <div class="form-row" v-if="editManager?.id">
          <label class="form-label">Передать чаты менеджеру</label>
          <select class="form-select" v-model="managerForm.transfer_to">
            <option value="">— Не передавать —</option>
            <option 
              v-for="m in managersList.filter(x => x.id !== editManager.id)" 
              :key="m.id" 
              :value="m.id"
            >
              {{ m.display_name || m.username }}
            </option>
          </select>
        </div>

        <div class="modal-actions">
          <button class="ghost-btn" @click="showManagerModal = false">Отмена</button>
          <button class="primary-btn" @click="saveManager">
            <i class="mi xs">save</i> Сохранить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

// State
const managersList = ref([]);
const loadingManagers = ref(false);
const showManagerModal = ref(false);
const editManager = ref(null);
const managerForm = ref({
  username: '',
  display_name: '',
  password: '',
  role: 'manager',
  traffic_pct: 0,
  transfer_to: ''
});

// Computed
const trafficTotal = computed(() => {
  return managersList.value.reduce((sum, m) => sum + (m.traffic_pct || 0), 0);
});

const activeManagers = computed(() => {
  return managersList.value.filter(m => m.is_active).length;
});

// API methods
const loadManagers = async () => {
  loadingManagers.value = true;
  try {
    const response = await axios.get('/api/admin/managers');
    managersList.value = response.data.data || [];
  } catch (error) {
    console.error('Failed to load managers:', error);
  } finally {
    loadingManagers.value = false;
  }
};

const openManagerModal = (mgr) => {
  editManager.value = mgr;
  
  if (mgr) {
    Object.assign(managerForm.value, {
      username: mgr.username,
      display_name: mgr.display_name || '',
      password: '',
      role: mgr.role,
      traffic_pct: mgr.traffic_pct || 0,
      transfer_to: ''
    });
  } else {
    Object.assign(managerForm.value, {
      username: '',
      display_name: '',
      password: '',
      role: 'manager',
      traffic_pct: 0,
      transfer_to: ''
    });
  }
  
  showManagerModal.value = true;
};

const saveManager = async () => {
  try {
    if (editManager.value?.id) {
      await axios.put(`/api/admin/managers/${editManager.value.id}`, managerForm.value);
    } else {
      await axios.post('/api/admin/managers', managerForm.value);
    }
    
    showManagerModal.value = false;
    await loadManagers();
  } catch (error) {
    console.error('Failed to save manager:', error);
    alert('Ошибка при сохранении менеджера');
  }
};

const deleteManager = async (mgr) => {
  if (!confirm(`Удалить менеджера ${mgr.username}?`)) return;
  
  try {
    await axios.delete(`/api/admin/managers/${mgr.id}`);
    await loadManagers();
  } catch (error) {
    console.error('Failed to delete manager:', error);
    alert('Ошибка при удалении менеджера');
  }
};

const terminateSessions = async (mgr) => {
  if (!confirm(`Завершить все сессии ${mgr.username}?`)) return;
  
  try {
    await axios.post(`/api/admin/managers/${mgr.id}/terminate-sessions`);
    alert('Сессии завершены');
  } catch (error) {
    console.error('Failed to terminate sessions:', error);
    alert('Ошибка при завершении сессий');
  }
};

// Utility functions
const initials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const roleLabel = (role) => {
  const labels = {
    admin: 'Администратор',
    manager: 'Менеджер',
    okk: 'ОКК'
  };
  return labels[role] || role;
};

const roleBadgeStyle = (role) => {
  const styles = {
    admin: 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);',
    manager: 'background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);',
    okk: 'background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);'
  };
  return styles[role] || 'background: #6c757d;';
};

const mcardGlowStyle = (mgr) => {
  const colors = {
    admin: 'rgba(102, 126, 234, 0.15)',
    manager: 'rgba(240, 147, 251, 0.15)',
    okk: 'rgba(79, 172, 254, 0.15)'
  };
  return {
    boxShadow: `0 0 0 1px ${colors[mgr.role] || 'transparent'}`
  };
};

const mcardAvStyle = (mgr) => {
  const gradients = {
    admin: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    manager: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    okk: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  };
  return {
    background: gradients[mgr.role] || '#6c757d'
  };
};

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  
  if (seconds < 60) return 'только что';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}м назад`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}ч назад`;
  return `${Math.floor(seconds / 86400)}д назад`;
};

// Lifecycle
onMounted(() => {
  loadManagers();
});
</script>

<style scoped>
.admin-managers {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #e0e0e0;
  margin: 0;
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #00b4aa 0%, #008f87 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 180, 170, 0.3);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 20px;
  background: #141e2b;
  border: 1px solid #1e2936;
  border-radius: 12px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #00b4aa;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
}

.managers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.manager-card {
  padding: 20px;
  background: #141e2b;
  border: 1px solid #1e2936;
  border-radius: 12px;
  transition: all 0.2s;
}

.manager-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.mcard-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.mcard-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

.mcard-info {
  flex: 1;
  min-width: 0;
}

.mcard-name {
  font-weight: 600;
  font-size: 15px;
  color: #e0e0e0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mcard-username {
  font-size: 13px;
  color: #6b7280;
}

.role-badge {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.mcard-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: #1a2532;
  border-radius: 8px;
}

.mcard-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #9ca3af;
}

.mcard-stat .mi {
  color: #00b4aa;
}

.mcard-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ghost-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid #2d3847;
  border-radius: 6px;
  color: #9ca3af;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.ghost-btn:hover {
  background: #1a2532;
  border-color: #3d4857;
  color: #e0e0e0;
}

.ghost-btn.danger:hover {
  background: #ef444420;
  border-color: #ef4444;
  color: #ef4444;
}

/* ── Modal ─────────────────────────────────────────────────────────────── */

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: #141e2b;
  border: 1px solid #1e2936;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #1e2936;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #e0e0e0;
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #1a2532;
  color: #e0e0e0;
}

.form-row {
  padding: 16px 20px;
  border-bottom: 1px solid #1e2936;
}

.form-row:last-of-type {
  border-bottom: none;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #9ca3af;
  margin-bottom: 8px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  background: #1a2532;
  border: 1px solid #2d3847;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus,
.form-select:focus {
  border-color: #00b4aa;
}

.form-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 20px;
  justify-content: flex-end;
}

.loading {
  padding: 40px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

.mi.xs {
  font-size: 16px;
}
</style>
