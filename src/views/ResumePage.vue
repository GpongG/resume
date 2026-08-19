<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import RichTextEditor from '../components/RichTextEditor.vue'
import DataTools from '../components/DataTools.vue'

const router = useRouter()
const editing = ref(false)

const defaultResumeHtml = `
  <h2>个人简介</h2>
  <p>我是一名前端工程师，专注于 <strong>Vue 3</strong>、<strong>TypeScript</strong> 与前端工程化开发，喜欢把复杂业务抽象成清晰可维护的组件与状态模型。</p>
  <p>我熟悉 <a href="/knowledge/vue3" data-knowledge-id="vue3">Vue 3</a>、<a href="/knowledge/typescript" data-knowledge-id="typescript">TypeScript</a> 和 <a href="/knowledge/vite" data-knowledge-id="vite">Vite</a>，并在项目中落地组件复用、数据建模和持续交付能力。</p>
  <h2>工作经历</h2>
  <p>负责前端架构与业务组件开发，推进项目工程化、交互体验优化和代码质量治理。</p>
  <h2>核心能力</h2>
  <ul>
    <li>熟悉前端工程化与组件设计</li>
    <li>擅长 <a href="/knowledge/quill" data-knowledge-id="quill">富文本编辑器</a>、表单和数据绑定业务</li>
    <li>具备可视化页面、状态管理和路由设计能力</li>
  </ul>
`

const resumeHtml = ref<string>(localStorage.getItem('resume-html') || defaultResumeHtml)

const normalizedHtml = computed(() => {
  const html = resumeHtml.value || defaultResumeHtml
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  doc.querySelectorAll('a[href^="/knowledge/"]').forEach((link) => {
    const href = link.getAttribute('href') || ''
    const knowledgeId = href.split('/knowledge/')[1]?.split('?')[0]
    if (knowledgeId) {
      link.setAttribute('data-knowledge-id', knowledgeId)
    }
  })

  return doc.body.innerHTML
})

const saveResume = () => {
  localStorage.setItem('resume-html', resumeHtml.value)
  // 保存成功后自动退出编辑模式，回到预览
  editing.value = false
}

// 热键：Cmd/Ctrl+S 保存（编辑模式），Cmd/Ctrl+E 进入编辑（预览模式）
const onGlobalKeydown = (event: KeyboardEvent) => {
  if (!(event.metaKey || event.ctrlKey)) return

  const key = event.key.toLowerCase()
  if (key === 's') {
    if (editing.value) {
      event.preventDefault()
      saveResume()
    }
  } else if (key === 'e') {
    if (!editing.value) {
      event.preventDefault()
      editing.value = true
    }
  }
}

const handleLinkClick = (event: MouseEvent) => {
  // 编辑模式下不拦截点击，交给 Quill 处理
  if (editing.value) return

  const target = event.target as HTMLElement | null
  const link = target?.closest('a[data-knowledge-id]') as HTMLAnchorElement | null
  if (!link) return

  event.preventDefault()
  const id = link.dataset.knowledgeId
  if (id) {
    router.push(`/knowledge/${id}`)
  }
}

watch(
  () => resumeHtml.value,
  (value) => {
    localStorage.setItem('resume-html', value)
  }
)

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
  const parser = new DOMParser()
  const doc = parser.parseFromString(resumeHtml.value, 'text/html')
  doc.querySelectorAll('a[href^="/knowledge/"]').forEach((link) => {
    const href = link.getAttribute('href') || ''
    const id = href.split('/knowledge/')[1]?.split('?')[0]
    if (id) link.setAttribute('data-knowledge-id', id)
  })
  resumeHtml.value = doc.body.innerHTML
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
})
</script>

<template>
  <div class="page-shell">
    <header class="topbar">
      <div>
        <h1>网页版简历</h1>
      </div>
      <div class="toolbar">
        <button class="primary" @click="editing = !editing">
          {{ editing ? '返回预览' : '编辑简历' }}
        </button>
        <button v-if="editing" class="secondary" @click="saveResume">
          保存内容
        </button>
        <DataTools />
      </div>
    </header>

    <main class="resume-layout" @click="handleLinkClick">
      <section v-show="!editing" class="resume-preview" v-html="normalizedHtml" />
      <section v-if="editing" class="editor-panel">
        <RichTextEditor v-model="resumeHtml" />
      </section>
    </main>
  </div>
</template>
