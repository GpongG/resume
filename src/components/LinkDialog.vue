<script setup lang="ts">
import { ref } from 'vue'
import { knowledgeState } from '../data/knowledge'

const props = defineProps<{ selectedText: string }>()
const emit = defineEmits<{
  (e: 'confirm', knowledgeId: string): void
  (e: 'cancel'): void
}>()

const knowledgeId = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

const confirm = () => {
  const id = knowledgeId.value.trim().replace(/^\//, '')
  if (!id) {
    inputEl.value?.focus()
    return
  }
  emit('confirm', id)
}
</script>

<template>
  <div class="dialog-mask" @click.self="emit('cancel')">
    <div class="dialog" role="dialog" aria-label="添加知识点链接">
      <h3>添加知识点链接</h3>
      <p class="dialog-text">
        选中文本：<strong>{{ selectedText || '（未选中）' }}</strong>
      </p>
      <label for="knowledge-id">知识点 ID</label>
      <input
        id="knowledge-id"
        ref="inputEl"
        v-model="knowledgeId"
        list="knowledge-options"
        placeholder="vue3 / typescript / vite / quill"
        @keyup.enter="confirm"
      />
      <datalist id="knowledge-options">
        <option v-for="k in knowledgeState.items" :key="k.id" :value="k.id">
          {{ k.title }}
        </option>
      </datalist>
      <div class="dialog-actions">
        <button class="secondary" @click="emit('cancel')">取消</button>
        <button class="primary" @click="confirm">确定</button>
      </div>
    </div>
  </div>
</template>
