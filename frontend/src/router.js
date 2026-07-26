import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('./pages/Test.vue')
  },
  {
    path: '/login',
    component: () => import('./pages/Login.vue')
  },
  {
    path: '/register',
    component: () => import('./pages/Register.vue')
  },
  {
    path: '/test-animations',
    component: () => import('./pages/TestAnimations.vue')
  },
  {
    path: '/commission-demo',
    component: () => import('./pages/CommissionLevelDemo.vue')
  },
  {
    path: '/admin',
    component: () => import('./pages/admin/AdminLayout.vue'),
    children: [
      {
        path: '',
        redirect: '/admin/chats'
      },
      {
        path: 'chats',
        component: () => import('./pages/admin/Chats.vue')
      },
      {
        path: 'managers',
        component: () => import('./pages/admin/Managers.vue')
      },
      {
        path: 'tenants',
        component: () => import('./pages/admin/Tenants.vue')
      },
      {
        path: 'documents',
        component: () => import('./pages/admin/AdminDocuments.vue')
      },
      {
        path: 'settings',
        component: () => import('./pages/admin/AdminSettings.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
