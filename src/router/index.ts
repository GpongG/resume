import { createRouter, createWebHistory } from 'vue-router'
import ResumePage from '../views/ResumePage.vue'
import KnowledgePage from '../views/KnowledgePage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'resume',
      component: ResumePage
    },
    {
      path: '/knowledge/:id',
      name: 'knowledge',
      component: KnowledgePage
    }
  ]
})

export default router
