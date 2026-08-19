import { reactive } from 'vue'

export type KnowledgeItem = {
  id: string
  title: string
  summary: string
  content: string
  tags: string[]
  relatedSkills: string[]
}

const STORAGE_KEY = 'knowledge-overrides'

// 从 localStorage 读取用户保存的知识点覆盖数据
function loadOverrides(): Record<string, KnowledgeItem> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, KnowledgeItem>) : {}
  } catch {
    return {}
  }
}

export const knowledgeBase: KnowledgeItem[] = [
  {
    id: 'vue3',
    title: 'Vue 3 Composition API',
    summary: 'Vue 3 的响应式系统和组合式 API，让组件逻辑更清晰、可复用，并提升大型项目的可维护性。',
    content:
      '<h3>核心概念</h3><p>Vue 3 通过 <strong>reactive</strong>、<strong>ref</strong> 和 <strong>computed</strong> 建立响应式模型，推荐使用 Composition API 来组织组件逻辑。</p><p>它的优势在于：逻辑更容易复用、可单独抽离到 composable 中、对复杂页面状态管理更友好。</p><h3>典型用法</h3><ul><li>用 <code>ref()</code> 包装基础值</li><li>用 <code>computed()</code> 派生状态</li><li>用 <code>watch()</code> 监听数据变化</li><li>通过 <code>provide/inject</code> 实现跨层共享</li></ul><h3>在简历中的价值</h3><p>在工程实践中，Vue 3 常用于构建中后台、管理系统和交互型前端页面，适合具有强业务逻辑的产品迭代场景。</p>',
    tags: ['Vue 3', 'Composition API', '响应式'],
    relatedSkills: ['TypeScript', 'Vite', 'Pinia', 'Vue Router']
  },
  {
    id: 'typescript',
    title: 'TypeScript',
    summary: 'TypeScript 为 JavaScript 增加静态类型系统，能显著降低前端联调和迭代中的错误率。',
    content:
      '<h3>为什么重要</h3><p>TypeScript 让代码更可维护，尤其适合多人协作、大型前端项目和复杂 UI 逻辑。</p><p>它通过 <strong>接口</strong>、<strong>泛型</strong>、<strong>类型推断</strong> 来帮助团队在开发期发现问题，而不是把错误留到运行期才暴露。</p><h3>常见应用</h3><ul><li>定义组件 props 与 emits</li><li>抽离 API 返回类型</li><li>统一状态和表单数据结构</li><li>减少任何类型的隐式 any 风险</li></ul><h3>效果</h3><p>在中后台项目中，良好的类型设计能明显减少重构成本，并提高代码可读性。</p>',
    tags: ['类型系统', '前端工程化', '接口设计'],
    relatedSkills: ['Vue 3', 'Node.js', 'React', '工程化']
  },
  {
    id: 'vite',
    title: 'Vite',
    summary: 'Vite 以极快的冷启动和热更新速度成为现代前端开发的标准工具链之一。',
    content:
      '<h3>特点</h3><p>Vite 采用 ES 模块原生加载方式，启动时间更短，开发体验更流畅。对组件开发、调试和快速迭代特别友好。</p><h3>应用场景</h3><ul><li>前端项目脚手架</li><li>组件库开发</li><li>中后台应用</li><li>前端工程化配置</li></ul><h3>价值</h3><p>对于高频迭代的业务项目，Vite 能明显提升研发效率和反馈速度。</p>',
    tags: ['构建工具', '前端开发', '工程化'],
    relatedSkills: ['Vue 3', 'TypeScript', 'ESM']
  },
  {
    id: 'quill',
    title: '富文本编辑器 Quill',
    summary: 'Quill 是一个轻量但功能完整的富文本编辑器，适合快速做可编辑内容页面和文档型场景。',
    content:
      '<h3>适用场景</h3><p>适合做简历编辑、笔记页、问答内容编辑、后台文案管理等具备富文本需求的页面。</p><h3>优点</h3><ul><li>轻量且稳定</li><li>支持基本格式化功能</li><li>可嵌入链接、列表、代码块等</li><li>适合前端需求快速落地</li></ul><h3>实现思路</h3><p>在实际项目里，通常会保留 HTML 内容，并在展示时进行链接拦截和路由跳转。</p>',
    tags: ['富文本', '编辑器', '前端交互'],
    relatedSkills: ['Vue 3', 'HTML', '组件封装']
  }
]

// 合并默认数据与用户保存的覆盖，返回全新对象数组。
// 同时保留用户新建的、不在默认库中的知识点。
function mergeItems(overrides: Record<string, KnowledgeItem>): KnowledgeItem[] {
  const baseIds = new Set(knowledgeBase.map((item) => item.id))
  const merged = knowledgeBase.map((item) => {
    const saved = overrides[item.id]
    return saved
      ? { ...item, ...saved, tags: saved.tags ?? item.tags }
      : { ...item }
  })
  Object.values(overrides).forEach((item) => {
    if (!baseIds.has(item.id)) {
      merged.push({ ...item })
    }
  })
  return merged
}

// 响应式知识库状态：默认数据 + 用户保存的覆盖
const state = reactive<{ items: KnowledgeItem[] }>({
  items: mergeItems(loadOverrides())
})

// 当其他标签页修改了 knowledge-overrides 时，重新加载最新数据，
// 解决“在 A 标签保存后，已打开的 B 标签仍显示旧内容”的问题。
function reloadFromStorage() {
  state.items.splice(0, state.items.length, ...mergeItems(loadOverrides()))
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      reloadFromStorage()
    }
  })
}

export const knowledgeState = state

export function getKnowledge(id: string): KnowledgeItem | undefined {
  return state.items.find((item) => item.id === id)
}

// 确保知识点存在：链接指向的新 ID 会自动创建一个全新的空知识点页面，
// 用户可以在其中从零添加内容。
export function ensureKnowledge(id: string): KnowledgeItem {
  const existing = state.items.find((item) => item.id === id)
  if (existing) return existing

  const item: KnowledgeItem = {
    id,
    title: id,
    summary: '',
    content: '',
    tags: [],
    relatedSkills: []
  }
  state.items.push(item)
  saveKnowledge(id, {})
  return item
}

export function saveKnowledge(id: string, patch: Partial<KnowledgeItem>): void {
  const item = state.items.find((item) => item.id === id)
  if (!item) return
  Object.assign(item, patch)
  const all = Object.fromEntries(state.items.map((i) => [i.id, i]))
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // 忽略存储配额等错误
  }
}
