<script setup lang="ts">
import { ref } from 'vue'
import { knowledgeState, type KnowledgeItem } from '../data/knowledge'

const fileInput = ref<HTMLInputElement | null>(null)

const STORAGE_RESUME = 'resume-html'
const STORAGE_KNOWLEDGE = 'knowledge-overrides'

type ExportData = {
  version: number
  exportedAt: string
  resumeHtml: string
  knowledge: KnowledgeItem[]
}

// 导出：把简历内容和全部知识点打包成一个 JSON 文件下载
const exportData = () => {
  const resumeHtml = localStorage.getItem(STORAGE_RESUME) || ''
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    resumeHtml,
    knowledge: knowledgeState.items.map((item) => ({ ...item }))
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'resume-data.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const triggerImport = () => {
  fileInput.value?.click()
}

// 导入：读取 JSON 文件，写入 localStorage 后刷新页面让数据重新加载
const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result)) as Partial<ExportData>
      if (!data || typeof data !== 'object' || !Array.isArray(data.knowledge)) {
        window.alert('导入失败：文件格式不正确，请选择导出的 JSON 文件')
        return
      }

      if (typeof data.resumeHtml === 'string') {
        localStorage.setItem(STORAGE_RESUME, data.resumeHtml)
      }

      const knowledgeMap: Record<string, KnowledgeItem> = {}
      data.knowledge.forEach((item) => {
        if (item && typeof item.id === 'string' && item.id) {
          knowledgeMap[item.id] = item
        }
      })
      localStorage.setItem(STORAGE_KNOWLEDGE, JSON.stringify(knowledgeMap))

      window.alert('导入成功，页面即将刷新')
      window.location.reload()
    } catch {
      window.alert('导入失败：无法解析文件内容')
    }
  }
  reader.readAsText(file)
  input.value = ''
}
</script>

<template>
  <div class="data-tools">
    <button class="secondary" @click="exportData">导出数据</button>
    <button class="secondary" @click="triggerImport">导入数据</button>
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="hidden-input"
      @change="onFileChange"
    />
  </div>
</template>
