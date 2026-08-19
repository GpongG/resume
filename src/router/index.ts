import { createRouter, createWebHashHistory } from 'vue-router'
import ResumePage from '../views/ResumePage.vue'
import KnowledgePage from '../views/KnowledgePage.vue'

// 使用 hash 模式（并匹配 vite.config 里的 base），
// 部署到任意静态托管（如 GitHub Pages 子路径）都不需要服务器 fallback 配置，避免页面空白。
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
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
