import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '../services/authService'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(null)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(email, password) {
    try {
      error.value = null
      const data = await authService.login(email, password)
      
      token.value = data.token
      localStorage.setItem('token', data.token)
      
      user.value = data.user
      return data.user
    } catch (err) {
      error.value = err.response?.data?.message ; 'Login failed'
      throw err
    }
  }

  async function register(formData) {
    try {
      error.value = null
      const data = await authService.register(formData)
      
      token.value = data.token
      localStorage.setItem('token', data.token)
      
      user.value = data.user
      return data.user
    } catch (err) {
      error.value = err.response?.data?.message ; 'Registration failed'
      throw err
    }
  }

  async function loadUser() {
    if (!token.value) return
    
    try {
      const data = await authService.getProfile()
      user.value = data
    } catch (err) {
      console.error('Failed to load user:', err)
      logout()
    }
  }

  async function updateProfile(formData) {
    try {
      const data = await authService.updateProfile(formData)
      user.value = data
      return data
    } catch (err) {
      error.value = err.response?.data?.message ; 'Update failed'
      throw err
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    authService.logout()
  }

  return {
    token,
    user,
    error,
    isAuthenticated,
    isAdmin,
    login,
    register,
    loadUser,
    updateProfile,
    logout
  }
})
