import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('./pages/Test.vue')
  },
  {
    path: '/test-animations',
    component: () => import('./pages/TestAnimations.vue')
  },
  {
    path: '/commission-demo',
    component: () => import('./pages/CommissionLevelDemo.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
