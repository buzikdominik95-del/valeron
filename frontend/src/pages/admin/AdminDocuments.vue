<template>
  <div class="admin-documents">
    <div class="page-header">
      <h1>Управление документами</h1>
      <button class="primary-btn" @click="uploadDocument">
        <i class="mi xs">upload</i> Загрузить документ
      </button>
    </div>

    <div class="documents-container">
      <div class="documents-list">
        <!-- Документы будут подгружаться из существующего DocumentController -->
        <p class="info-text">
          Интеграция с существующим модулем документов (DocumentController, DocumentResource)
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
const uploadDocument = () => {
  alert('Функционал загрузки документов будет интегрирован с существующим DocumentController');
};
</script>

<style scoped>
.admin-documents {
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

.documents-container {
  background: #141e2b;
  border: 1px solid #1e2936;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
}

.info-text {
  color: #9ca3af;
  font-size: 14px;
}

.mi.xs {
  font-size: 16px;
}
</style>
