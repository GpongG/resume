<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RichTextEditor from '../components/RichTextEditor.vue'
import { ensureKnowledge, getKnowledge, saveKnowledge } from '../data/knowledge'

const route = useRoute()
const router = useRouter()

const editing = ref(false)

const knowledgeId = computed(() => String(route.params.id || 'vue3'))

// 保证知识点存在：链接指向的新 ID 会自动创建一个全新的空知识点页面，
// 用户可以在空页面中从零添加内容（而不是回退到 vue3 的默认内容）。
watch(
  knowledgeId,
  (id) => {
    ensureKnowledge(id)
  },
  { immediate: true }
)

const knowledge = computed(() => getKnowledge(knowledgeId.value)!)

const draft = reactive({
  title: '',
  summary: '',
  content: '',
  tagsText: ''
})

// 预览模式：拦截知识点链接，在当前页 SPA 跳转（与简历页行为一致）
const handleContentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  const link = target?.closest('a[href^="/knowledge/"]') as HTMLAnchorElement | null
  if (!link) return

  event.preventDefault()
  const href = link.getAttribute('href') || ''
  const id = href.split('/knowledge/')[1]?.split('?')[0]
  if (id) {
    router.push(`/knowledge/${id}`)
  }
}

const startEditing = () => {
  draft.title = knowledge.value?.title ?? ''
  draft.summary = knowledge.value?.summary ?? ''
  draft.content = knowledge.value?.content ?? ''
  draft.tagsText = (knowledge.value?.tags ?? []).join(', ')
  editing.value = true
}

const cancelEditing = () => {
  editing.value = false
}

// 从链接添加处跳转而来（路由带 ?edit=1）时，自动进入编辑模式，方便立即补充内容
const autoEditIfRequested = () => {
  if (route.query.edit === '1') {
    startEditing()
  }
}
watch(() => route.query.edit, autoEditIfRequested)

const save = () => {
  saveKnowledge(knowledgeId.value, {
    title: draft.title.trim() || knowledge.value?.title || '',
    summary: draft.summary,
    content: draft.content,
    tags: draft.tagsText
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
  })
  editing.value = false
}

// 热键：Cmd/Ctrl+S 保存（编辑模式），Cmd/Ctrl+E 进入编辑（预览模式）
const onGlobalKeydown = (event: KeyboardEvent) => {
  if (!(event.metaKey || event.ctrlKey)) return

  const key = event.key.toLowerCase()
  if (key === 's') {
    if (editing.value) {
      event.preventDefault()
      save()
    }
  } else if (key === 'e') {
    if (!editing.value) {
      event.preventDefault()
      startEditing()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
  autoEditIfRequested()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
})

// 切换知识点时退出编辑态
watch(knowledgeId, () => {
  editing.value = false
})
</script>

<template>
  <div class="knowledge-page">
    <header class="knowledge-header">
      <button class="secondary" @click="router.push('/')">返回简历</button>
      <h1>{{ knowledge.title }}</h1>
      <div class="toolbar">
        <template v-if="!editing">
          <button class="primary" @click="startEditing">编辑页面</button>
        </template>
        <template v-else>
          <button class="primary" @click="save">保存</button>
          <button class="secondary" @click="cancelEditing">取消</button>
        </template>
      </div>
    </header>

    <div v-if="!editing" class="knowledge-card" @click="handleContentClick">
      <p class="summary">{{ knowledge.summary }}</p>
      <div class="tags">
        <span v-for="tag in knowledge.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>

      <div v-if="knowledge.content" class="content" v-html="knowledge.content" />
      <div v-else class="empty-tip">
        <p>这个知识点还没有任何内容。</p>
        <p>点击右上角「编辑页面」，用富文本编辑器从零添加内容。</p>
      </div>
    </div>

    <div v-else class="knowledge-card edit-card">
      <label class="field-label" for="edit-title">标题</label>
      <input id="edit-title" v-model="draft.title" class="text-input" />

      <label class="field-label" for="edit-summary">摘要</label>
      <textarea id="edit-summary" v-model="draft.summary" class="text-input" rows="2"></textarea>

      <label class="field-label">正文（富文本，可给文字添加知识点链接）</label>
      <RichTextEditor v-model="draft.content" />

      <label class="field-label" for="edit-tags">标签（用逗号分隔）</label>
      <input id="edit-tags" v-model="draft.tagsText" class="text-input" />
    </div>
  </div>
</template>
