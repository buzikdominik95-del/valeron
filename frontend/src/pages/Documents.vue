<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'

const documents = ref([])
const loading = ref(false)
const uploading = ref(false)
const error = ref(null)
const selectedFile = ref(null)

onMounted(async () => {
  await loadDocuments()
})

async function loadDocuments() {
  loading.value = true
  try {
    const response = await api.get('/users/documents')
    documents.value = response.data || []
    error.value = null
  } catch (err) {
    error.value = 'Не удалось загрузить документы'
  } finally {
    loading.value = false
  }
}

async function uploadDocument() {
  if (!selectedFile.value) return

  uploading.value = true
  const formData = new FormData()
  formData.append('file', selectedFile.value)
  formData.append('type', 'document')

  try {
    await api.post('/users/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    selectedFile.value = null
    await loadDocuments()
    error.value = null
  } catch (err) {
    error.value = 'Ошибка загрузки'
  } finally {
    uploading.value = false
  }
}

async function deleteDocument(id) {
  if (confirm('Удалить этот документ?')) {
    try {
      await api.delete(`/users/documents/${id}`)
      await loadDocuments()
    } catch (err) {
      error.value = 'Ошибка удаления'
    }
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Мои документы</h1>
    
    <div class="bg-white p-8 rounded-lg shadow-md mb-6">
      <h2 class="text-xl font-semibold mb-4">Загрузить новый документ</h2>
      
      <div class="flex gap-4">
        <input 
          type="file"
          ref="fileInput"
          @change="e => selectedFile = e.target.files[0]"
          class="flex-1"
        />
        <button 
          @click="uploadDocument"
          :disabled="uploading || !selectedFile"
          class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded transition"
        >
          {{ uploading ? 'Загрузка...' : 'Загрузить' }}
        </button>
      </div>

      <div v-if="error" class="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {{ error }}
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      Загрузка документов...
    </div>

    <div v-else-if="documents.length === 0" class="bg-gray-100 p-8 rounded-lg text-center text-gray-600">
      У вас пока нет документов
    </div>

    <div v-else class="space-y-4">
      <div 
        v-for="doc in documents" 
        :key="doc.id"
        class="bg-white p-4 rounded-lg shadow flex justify-between items-center"
      >
        <div>
          <h3 class="font-semibold">{{ doc.filename }}</h3>
          <p class="text-sm text-gray-600">{{ doc.type }} • {{ doc.size }} bytes</p>
        </div>
        <button 
          @click="deleteDocument(doc.id)"
          class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
        >
          Удалить
        </button>
      </div>
    </div>
  </div>
</template>
