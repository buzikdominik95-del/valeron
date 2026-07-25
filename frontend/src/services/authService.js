import api from './api'

export const authService = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  register: (data) =>
    api.post('/auth/register', data),
  
  getProfile: () =>
    api.get('/users/profile'),
  
  updateProfile: (data) =>
    api.put('/users/profile', data),
  
  logout: () => {
    // Token removal is handled by store
    return Promise.resolve()
  }
}
