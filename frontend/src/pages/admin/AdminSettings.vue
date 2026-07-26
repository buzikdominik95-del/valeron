<template>
  <div class="admin-settings">
    <div class="page-header">
      <h1>Настройки системы</h1>
    </div>

    <div class="settings-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="settings-tab"
        :class="{active: activeTab === tab.id}"
        @click="activeTab = tab.id"
      >
        <i class="mi xs">{{ tab.icon }}</i>
        {{ tab.label }}
      </button>
    </div>

    <div class="settings-content">
      <!-- General Settings -->
      <div v-if="activeTab === 'general'" class="settings-panel">
        <h2>Общие настройки</h2>
        
        <div class="form-section">
          <label class="form-label">Название системы</label>
          <input 
            type="text" 
            class="form-input" 
            v-model="settings.system_name"
            placeholder="Velora CRM"
          >
        </div>

        <div class="form-section">
          <label class="form-label">Email поддержки</label>
          <input 
            type="email" 
            class="form-input" 
            v-model="settings.support_email"
            placeholder="support@velora.com"
          >
        </div>

        <div class="form-section">
          <label class="form-label">Часовой пояс</label>
          <select class="form-select" v-model="settings.timezone">
            <option value="Europe/Moscow">Москва (UTC+3)</option>
            <option value="Europe/Kiev">Киев (UTC+2)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        <button class="primary-btn" @click="saveSettings">
          <i class="mi xs">save</i> Сохранить настройки
        </button>
      </div>

      <!-- Tags Management -->
      <div v-if="activeTab === 'tags'" class="settings-panel">
        <h2>Управление тегами</h2>
        
        <div class="tags-creator">
          <input 
            type="text" 
            class="form-input" 
            v-model="newTagName"
            placeholder="Название тега"
          >
          <input 
            type="color" 
            class="color-input" 
            v-model="newTagColor"
          >
          <button class="primary-btn" @click="createTag">
            <i class="mi xs">add</i> Создать тег
          </button>
        </div>

        <div class="tags-list">
          <div v-for="tag in allTags" :key="tag.id" class="tag-item">
            <div class="tag-preview" :style="{background: tag.color}">
              {{ tag.name }}
            </div>
            <button class="delete-btn" @click="deleteTag(tag)">
              <i class="mi xs">delete</i>
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Replies -->
      <div v-if="activeTab === 'replies'" class="settings-panel">
        <h2>Быстрые ответы</h2>
        
        <button class="primary-btn mb-4" @click="openReplyModal(null)">
          <i class="mi xs">add</i> Добавить шаблон
        </button>

        <div class="replies-list">
          <div v-for="reply in quickReplies" :key="reply.id" class="reply-item">
            <div class="reply-content">
              <div class="reply-title">{{ reply.title }}</div>
              <div class="reply-body">{{ reply.body }}</div>
            </div>
            <div class="reply-actions">
              <button class="ghost-btn" @click="openReplyModal(reply)">
                <i class="mi xs">edit</i>
              </button>
              <button class="ghost-btn danger" @click="deleteReply(reply)">
                <i class="mi xs">delete</i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Reply Modal -->
    <div class="modal-overlay" v-if="showReplyModal" @click.self="showReplyModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editReply?.id ? 'Редактировать' : 'Добавить' }} шаблон</h3>
          <button class="modal-close" @click="showReplyModal = false">
            <i class="mi">close</i>
          </button>
        </div>

        <div class="form-row">
          <label class="form-label">Название (ключевое слово)</label>
          <input 
            class="form-input" 
            v-model="replyForm.title" 
            placeholder="Например: приветствие"
          >
        </div>

        <div class="form-row">
          <label class="form-label">Текст сообщения</label>
          <textarea 
            class="form-textarea" 
            v-model="replyForm.body" 
            placeholder="Текст ответа..."
            rows="4"
          ></textarea>
        </div>

        <div class="modal-actions">
          <button class="ghost-btn" @click="showReplyModal = false">Отмена</button>
          <button class="primary-btn" @click="saveReply">
            <i class="mi xs">save</i> Сохранить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

// State
const activeTab = ref('general');
const settings = ref({
  system_name: 'Velora CRM',
  support_email: '',
  timezone: 'Europe/Moscow'
});

const tabs = [
  { id: 'general', label: 'Общие', icon: 'settings' },
  { id: 'tags', label: 'Теги', icon: 'label' },
  { id: 'replies', label: 'Быстрые ответы', icon: 'chat_bubble' }
];

// Tags
const allTags = ref([]);
const newTagName = ref('');
const newTagColor = ref('#0ea5e9');

// Quick Replies
const quickReplies = ref([]);
const showReplyModal = ref(false);
const editReply = ref(null);
const replyForm = ref({
  title: '',
  body: ''
});

// Methods
const saveSettings = async () => {
  try {
    await axios.put('/api/admin/settings', settings.value);
    alert('Настройки сохранены');
  } catch (error) {
    console.error('Failed to save settings:', error);
    alert('Ошибка при сохранении настроек');
  }
};

const createTag = async () => {
  if (!newTagName.value.trim()) return;
  
  try {
    await axios.post('/api/admin/tags', {
      name: newTagName.value.trim(),
      color: newTagColor.value
    });
    
    newTagName.value = '';
    newTagColor.value = '#0ea5e9';
    await loadTags();
  } catch (error) {
    console.error('Failed to create tag:', error);
    alert('Ошибка при создании тега');
  }
};

const deleteTag = async (tag) => {
  if (!confirm(`Удалить тег "${tag.name}"?`)) return;
  
  try {
    await axios.delete(`/api/admin/tags/${tag.id}`);
    await loadTags();
  } catch (error) {
    console.error('Failed to delete tag:', error);
    alert('Ошибка при удалении тега');
  }
};

const loadTags = async () => {
  try {
    const response = await axios.get('/api/admin/tags');
    allTags.value = response.data.data || [];
  } catch (error) {
    console.error('Failed to load tags:', error);
  }
};

const openReplyModal = (reply) => {
  editReply.value = reply;
  replyForm.value = {
    title: reply?.title || '',
    body: reply?.body || ''
  };
  showReplyModal.value = true;
};

const saveReply = async () => {
  try {
    if (editReply.value?.id) {
      await axios.put(`/api/admin/quick-replies/${editReply.value.id}`, replyForm.value);
    } else {
      await axios.post('/api/admin/quick-replies', replyForm.value);
    }
    
    showReplyModal.value = false;
    await loadReplies();
  } catch (error) {
    console.error('Failed to save reply:', error);
    alert('Ошибка при сохранении шаблона');
  }
};

const deleteReply = async (reply) => {
  if (!confirm('Удалить шаблон?')) return;
  
  try {
    await axios.delete(`/api/admin/quick-replies/${reply.id}`);
    await loadReplies();
  } catch (error) {
    console.error('Failed to delete reply:', error);
    alert('Ошибка при удалении шаблона');
  }
};

const loadReplies = async () => {
  try {
    const response = await axios.get('/api/admin/quick-replies');
    quickReplies.value = response.data.data || [];
  } catch (error) {
    console.error('Failed to load replies:', error);
  }
};

// Lifecycle
onMounted(async () => {
  await Promise.all([loadTags(), loadReplies()]);
});
</script>

<style scoped>
.admin-settings {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #e0e0e0;
  margin: 0;
}

.settings-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid #1e2936;
  padding-bottom: 2px;
}

.settings-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #9ca3af;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.settings-tab:hover {
  color: #e0e0e0;
}

.settings-tab.active {
  color: #00b4aa;
  border-bottom-color: #00b4aa;
}

.settings-content {
  background: #141e2b;
  border: 1px solid #1e2936;
  border-radius: 12px;
  padding: 24px;
}

.settings-panel h2 {
  font-size: 18px;
  font-weight: 600;
  color: #e0e0e0;
  margin: 0 0 20px 0;
}

.form-section {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #9ca3af;
  margin-bottom: 8px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  background: #1a2532;
  border: 1px solid #2d3847;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: #00b4aa;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.primary-btn {
  display: inline-flex;
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

.mb-4 {
  margin-bottom: 16px;
}

/* Tags */
.tags-creator {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.tags-creator .form-input {
  flex: 1;
}

.color-input {
  width: 60px;
  height: 44px;
  padding: 4px;
  background: #1a2532;
  border: 1px solid #2d3847;
  border-radius: 6px;
  cursor: pointer;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #1a2532;
  border: 1px solid #2d3847;
  border-radius: 8px;
}

.tag-preview {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: white;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #ef444420;
  color: #ef4444;
}

/* Quick Replies */
.replies-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  background: #1a2532;
  border: 1px solid #2d3847;
  border-radius: 8px;
}

.reply-content {
  flex: 1;
}

.reply-title {
  font-weight: 600;
  font-size: 14px;
  color: #e0e0e0;
  margin-bottom: 6px;
}

.reply-body {
  font-size: 13px;
  color: #9ca3af;
  line-height: 1.5;
}

.reply-actions {
  display: flex;
  gap: 8px;
}

.ghost-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid #2d3847;
  border-radius: 6px;
  color: #9ca3af;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.ghost-btn:hover {
  background: #1e2936;
  color: #e0e0e0;
}

.ghost-btn.danger:hover {
  background: #ef444420;
  border-color: #ef4444;
  color: #ef4444;
}

/* Modal */
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

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 20px;
  justify-content: flex-end;
}

.mi.xs {
  font-size: 16px;
}
</style>
