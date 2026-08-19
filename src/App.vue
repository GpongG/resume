<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 全局兜底：点击任何 /knowledge/ 链接都在当前页面打开（SPA 跳转），
// 避免因 target="_blank" 或未拦截的链接新开标签页。
// 编辑器（contenteditable）内的链接点击不拦截，交给 Quill 处理。
const onDocumentClick = (event: MouseEvent) => {
  // 已被页面局部拦截（如简历页/知识页的 handler）则跳过，避免重复导航
  if (event.defaultPrevented) return

  const target = event.target as HTMLElement | null
  if (target?.closest('.ql-editor')) return

  const link = target?.closest('a[href^="/knowledge/"]') as HTMLAnchorElement | null
  if (!link) return

  event.preventDefault()
  const href = link.getAttribute('href') || ''
  const id = href.split('/knowledge/')[1]?.split('?')[0]
  if (id) {
    router.push(`/knowledge/${id}`)
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <router-view />
</template>
