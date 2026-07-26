<template>
  <div class="admin-chats">
    <div class="chats-layout">
      <!-- Sidebar -->
      <aside class="chats-sidebar">
        <div class="sidebar-header">
          <input 
            type="text" 
            class="search-input" 
            v-model="searchQuery"
            placeholder="Поиск по чатам..."
          >
        </div>
        
        <div class="filters">
          <select class="filter-select" v-model="selectedStage">
            <option value="">Все этапы</option>
            <option v-for="stage in stages" :key="stage.id" :value="stage.id">
              {{ stage.name }}
            </option>
          </select>
          
          <div class="filter-btns">
            <button 
              v-for="filter in statusFilters" 
              :key="filter.value"
              class="filter-btn"
              :class="{active: activeStatus === filter.value}"
              @click="activeStatus = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>

        <div class="chats-list" ref="chatsListEl">
          <div 
            v-for="chat in filteredChats" 
            :key="chat.id"
            class="chat-item"
            :class="{active: activeChatId === chat.id}"
            @click="openChat(chat.id)"
          >
            <div class="chat-avatar" :style="avatarStyle(chat.lead_name)">
              {{ initials(chat.lead_name) }}
            </div>
            <div class="chat-info">
              <div class="chat-name">{{ chat.lead_name || 'Без имени' }}</div>
              <div class="chat-last-msg">{{ chat.last_msg || 'Нет сообщений' }}</div>
            </div>
            <div class="chat-meta">
              <div class="chat-time">{{ timeAgo(chat.updated_at) }}</div>
              <span v-if="chat.unread_count" class="unread-badge">{{ chat.unread_count }}</span>
            </div>
            <div class="chat-tags">
              <span v-if="chat.stage_name" class="tag stage-tag">{{ chat.stage_name }}</span>
              <span v-if="chat.manager_name" class="tag manager-tag">{{ chat.manager_name }}</span>
            </div>
          </div>
          
          <div v-if="loadingChats" class="loading">Загрузка...</div>
          <div v-else-if="!filteredChats.length" class="empty">Чаты не найдены</div>
        </div>
      </aside>

      <!-- Chat Area -->
      <div class="chat-area" v-if="activeChat">
        <div class="chat-header">
          <div class="chat-header-info">
            <div class="chat-avatar" :style="avatarStyle(activeChat.lead_name)">
              {{ initials(activeChat.lead_name) }}
            </div>
            <div>
              <div class="chat-header-name">{{ activeChat.lead_name || 'Без имени' }}</div>
              <div class="chat-header-status">{{ activeChat.stage_name || 'Новый' }}</div>
            </div>
          </div>
          <div class="chat-header-actions">
            <button class="icon-btn" @click="showProfile = true" title="Профиль">
              <i class="mi">info</i>
            </button>
          </div>
        </div>

        <div class="messages-container" ref="messagesEl">
          <div v-for="(msg, idx) in messages" :key="msg.id" class="message-wrapper">
            <div v-if="showDaySep(idx)" class="day-sep">{{ formatDay(msg.created_at) }}</div>
            
            <div class="message" :class="msg.is_manager ? 'outgoing' : 'incoming'">
              <div class="msg-bubble">
                <div class="msg-text">{{ msg.message }}</div>
                <div class="msg-meta">
                  <span class="msg-time">{{ formatTime(msg.created_at) }}</span>
                  <span v-if="msg.is_manager" class="msg-author">{{ msg.sender_name }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="loadingMessages" class="loading">Загрузка сообщений...</div>
        </div>

        <div class="input-wrap">
          <textarea 
            ref="inputEl"
            v-model="messageText"
            @keydown.enter.exact.prevent="sendMessage"
            placeholder="Введите сообщение..."
            rows="1"
            class="msg-input"
          ></textarea>
          <button 
            class="send-btn" 
            @click="sendMessage"
            :disabled="!messageText.trim() || sending"
          >
            <i class="mi">send</i>
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="chat-area empty-state">
        <i class="mi large">forum</i>
        <p>Выберите чат для начала общения</p>
      </div>

      <!-- Right Panel -->
      <aside class="right-panel" v-if="activeChat && showProfile">
        <div class="panel-header">
          <h3>Информация о лиде</h3>
          <button class="close-btn" @click="showProfile = false">
            <i class="mi">close</i>
          </button>
        </div>
        
        <div class="panel-content">
          <div class="form-section">
            <label class="form-label">Этап</label>
            <select class="form-select" v-model="meta.stage_id" @change="saveMeta">
              <option v-for="stage in stages" :key="stage.id" :value="stage.id">
                {{ stage.name }}
              </option>
            </select>
          </div>

          <div class="form-section">
            <label class="form-label">Менеджер</label>
            <select class="form-select" v-model="meta.manager_id" @change="saveMeta">
              <option value="">Не назначен</option>
              <option v-for="mgr in managers" :key="mgr.id" :value="mgr.id">
                {{ mgr.display_name || mgr.username }}
              </option>
            </select>
          </div>

          <div class="form-section">
            <label class="form-label">Комментарий</label>
            <textarea 
              class="form-textarea" 
              v-model="meta.notes"
              @blur="saveMeta"
              rows="4"
              placeholder="Добавьте комментарий..."
            ></textarea>
          </div>

          <div class="form-section">
            <label class="form-label">Теги</label>
            <div class="tags-list">
              <button 
                v-for="tag in allTags" 
                :key="tag.id"
                class="tag-btn"
                :class="{active: meta.tags?.includes(tag.id)}"
                :style="tagStyle(tag.color)"
                @click="toggleTag(tag.id)"
              >
                {{ tag.name }}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import axios from 'axios';

// State
const chats = ref([]);
const messages = ref([]);
const activeChat = ref(null);
const activeChatId = ref(null);
const searchQuery = ref('');
const selectedStage = ref('');
const activeStatus = ref('all');
const loadingChats = ref(false);
const loadingMessages = ref(false);
const messageText = ref('');
const sending = ref(false);
const showProfile = ref(false);

const stages = ref([]);
const managers = ref([]);
const allTags = ref([]);
const meta = ref({
  stage_id: null,
  manager_id: null,
  notes: '',
  tags: []
});

const chatsListEl = ref(null);
const messagesEl = ref(null);
const inputEl = ref(null);

// Filters
const statusFilters = [
  { label: 'Все', value: 'all' },
  { label: 'Активные', value: 'active' },
  { label: 'Новые', value: 'new' },
  { label: 'Завершенные', value: 'closed' }
];

// Computed
const filteredChats = computed(() => {
  let result = chats.value;
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(c => 
      c.lead_name?.toLowerCase().includes(q) ||
      c.last_msg?.toLowerCase().includes(q)
    );
  }
  
  if (selectedStage.value) {
    result = result.filter(c => c.stage_id === selectedStage.value);
  }
  
  if (activeStatus.value !== 'all') {
    result = result.filter(c => c.status === activeStatus.value);
  }
  
  return result;
});

// API methods
const loadChats = async () => {
  loadingChats.value = true;
  try {
    const response = await axios.get('/api/admin/chats');
    chats.value = response.data.data || [];
  } catch (error) {
    console.error('Failed to load chats:', error);
  } finally {
    loadingChats.value = false;
  }
};

const openChat = async (chatId) => {
  activeChatId.value = chatId;
  activeChat.value = chats.value.find(c => c.id === chatId);
  showProfile.value = false;
  await loadMessages();
};

const loadMessages = async () => {
  if (!activeChatId.value) return;
  
  loadingMessages.value = true;
  try {
    const response = await axios.get(`/api/admin/chats/${activeChatId.value}/messages`);
    messages.value = response.data.data || [];
    
    await nextTick();
    scrollToBottom();
  } catch (error) {
    console.error('Failed to load messages:', error);
  } finally {
    loadingMessages.value = false;
  }
};

const sendMessage = async () => {
  if (!messageText.value.trim() || sending.value) return;
  
  sending.value = true;
  try {
    await axios.post(`/api/admin/chats/${activeChatId.value}/messages`, {
      message: messageText.value.trim()
    });
    
    messageText.value = '';
    await loadMessages();
  } catch (error) {
    console.error('Failed to send message:', error);
  } finally {
    sending.value = false;
  }
};

const saveMeta = async () => {
  if (!activeChatId.value) return;
  
  try {
    await axios.put(`/api/admin/chats/${activeChatId.value}/meta`, meta.value);
  } catch (error) {
    console.error('Failed to save meta:', error);
  }
};

const toggleTag = (tagId) => {
  if (!meta.value.tags) meta.value.tags = [];
  
  const idx = meta.value.tags.indexOf(tagId);
  if (idx > -1) {
    meta.value.tags.splice(idx, 1);
  } else {
    meta.value.tags.push(tagId);
  }
  
  saveMeta();
};

// Utility functions
const initials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const avatarStyle = (name) => {
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ];
  
  const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return { background: colors[hash % colors.length] };
};

const tagStyle = (color) => {
  return { 
    background: color,
    border: `1px solid ${color}40`
  };
};

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  
  if (seconds < 60) return 'только что';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}м назад`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}ч назад`;
  return `${Math.floor(seconds / 86400)}д назад`;
};

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const formatDay = (date) => {
  const d = new Date(date);
  const today = new Date();
  
  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  
  return d.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long' 
  });
};

const showDaySep = (idx) => {
  if (idx === 0) return true;
  const curr = new Date(messages.value[idx].created_at).toDateString();
  const prev = new Date(messages.value[idx - 1].created_at).toDateString();
  return curr !== prev;
};

const scrollToBottom = () => {
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
};

// Lifecycle
onMounted(async () => {
  await loadChats();
  
  // Load reference data
  try {
    const [stagesRes, managersRes, tagsRes] = await Promise.all([
      axios.get('/api/admin/stages'),
      axios.get('/api/admin/managers'),
      axios.get('/api/admin/tags')
    ]);
    
    stages.value = stagesRes.data.data || [];
    managers.value = managersRes.data.data || [];
    allTags.value = tagsRes.data.data || [];
  } catch (error) {
    console.error('Failed to load reference data:', error);
  }
});
</script>

<style scoped>
.admin-chats {
  height: 100%;
  background: #0f1923;
}

.chats-layout {
  display: flex;
  height: 100%;
}

/* ── Sidebar ───────────────────────────────────────────────────────────── */

.chats-sidebar {
  width: 320px;
  background: #141e2b;
  border-right: 1px solid #1e2936;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #1e2936;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  background: #1a2532;
  border: 1px solid #2d3847;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #00b4aa;
  background: #1e2936;
}

.filters {
  padding: 12px 16px;
  border-bottom: 1px solid #1e2936;
}

.filter-select {
  width: 100%;
  padding: 8px 12px;
  background: #1a2532;
  border: 1px solid #2d3847;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 13px;
  margin-bottom: 8px;
  outline: none;
}

.filter-btns {
  display: flex;
  gap: 4px;
}

.filter-btn {
  flex: 1;
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #9ca3af;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #1a2532;
  color: #e0e0e0;
}

.filter-btn.active {
  background: #1e2936;
  color: #00b4aa;
}

.chats-list {
  flex: 1;
  overflow-y: auto;
}

.chat-item {
  display: grid;
  grid-template: 
    "avatar name time" auto
    "avatar msg time" auto
    "avatar tags tags" auto / 48px 1fr auto;
  gap: 4px 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #1a2532;
  cursor: pointer;
  transition: background 0.2s;
}

.chat-item:hover {
  background: #1a2532;
}

.chat-item.active {
  background: #1e2936;
}

.chat-avatar {
  grid-area: avatar;
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

.chat-info {
  grid-area: name / name / msg / msg;
  min-width: 0;
}

.chat-name {
  font-weight: 500;
  font-size: 14px;
  color: #e0e0e0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-last-msg {
  font-size: 13px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

.chat-meta {
  grid-area: time;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.chat-time {
  font-size: 11px;
  color: #6b7280;
}

.unread-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #00b4aa;
  border-radius: 10px;
  color: white;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-tags {
  grid-area: tags;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: white;
}

.stage-tag {
  background: #4f46e5;
}

.manager-tag {
  background: #6366f1;
}

/* ── Chat Area ─────────────────────────────────────────────────────────── */

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0f1923;
  min-width: 0;
}

.empty-state {
  align-items: center;
  justify-content: center;
  color: #6b7280;
  gap: 16px;
}

.empty-state .mi.large {
  font-size: 64px;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #141e2b;
  border-bottom: 1px solid #1e2936;
}

.chat-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-header-name {
  font-weight: 600;
  font-size: 15px;
  color: #e0e0e0;
}

.chat-header-status {
  font-size: 13px;
  color: #6b7280;
}

.chat-header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 36px;
  height: 36px;
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

.icon-btn:hover {
  background: #1a2532;
  color: #e0e0e0;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.day-sep {
  text-align: center;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  margin: 12px 0;
}

.message {
  display: flex;
}

.message.incoming {
  justify-content: flex-start;
}

.message.outgoing {
  justify-content: flex-end;
}

.msg-bubble {
  max-width: 60%;
  padding: 10px 14px;
  border-radius: 12px;
  background: #1e2936;
}

.message.outgoing .msg-bubble {
  background: linear-gradient(135deg, #00b4aa 0%, #008f87 100%);
}

.msg-text {
  color: #e0e0e0;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.input-wrap {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: #141e2b;
  border-top: 1px solid #1e2936;
}

.msg-input {
  flex: 1;
  padding: 10px 14px;
  background: #1a2532;
  border: 1px solid #2d3847;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  max-height: 120px;
  transition: all 0.2s;
}

.msg-input:focus {
  border-color: #00b4aa;
}

.send-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #00b4aa 0%, #008f87 100%);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 180, 170, 0.3);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Right Panel ───────────────────────────────────────────────────────── */

.right-panel {
  width: 320px;
  background: #141e2b;
  border-left: 1px solid #1e2936;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #1e2936;
}

.panel-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: #e0e0e0;
  margin: 0;
}

.close-btn {
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

.close-btn:hover {
  background: #1a2532;
  color: #e0e0e0;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
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

.form-select:focus,
.form-textarea:focus {
  border-color: #00b4aa;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.6;
}

.tag-btn:hover {
  opacity: 0.8;
}

.tag-btn.active {
  opacity: 1;
  box-shadow: 0 0 0 2px rgba(0, 180, 170, 0.3);
}

/* ── Loading & Empty ───────────────────────────────────────────────────── */

.loading,
.empty {
  padding: 20px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

/* ── Scrollbar ─────────────────────────────────────────────────────────── */

.chats-list::-webkit-scrollbar,
.messages-container::-webkit-scrollbar,
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.chats-list::-webkit-scrollbar-track,
.messages-container::-webkit-scrollbar-track,
.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.chats-list::-webkit-scrollbar-thumb,
.messages-container::-webkit-scrollbar-thumb,
.panel-content::-webkit-scrollbar-thumb {
  background: #2d3847;
  border-radius: 3px;
}

.chats-list::-webkit-scrollbar-thumb:hover,
.messages-container::-webkit-scrollbar-thumb:hover,
.panel-content::-webkit-scrollbar-thumb:hover {
  background: #3d4857;
}
</style>
