<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type Quill from 'quill'
import LinkDialog from './LinkDialog.vue'

const router = useRouter()

// 按需引入 highlight.js：只加载核心 + 代码块用到的几种语言，
// 避免全量引入（190+ 种语言）导致打包体积过大。
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import plaintext from 'highlight.js/lib/languages/plaintext'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('python', python)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('plain', plaintext)
hljs.registerLanguage('plaintext', plaintext)

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const editorContainer = ref<HTMLElement | null>(null)
let quill: Quill | null = null

// 编辑模式下点击正文里的链接时阻止默认跳转（避免打开新标签页），留在当前页面
let linkClickHandler: ((e: Event) => void) | null = null

const showLinkDialog = ref(false)
const pendingRange = ref<{ index: number; length: number } | null>(null)
const pendingText = ref('')

// 代码块语言选择器（<select class="ql-ui">）是 Quill 内部 UI，
// 保存时应剥离，避免 select/option 文案污染预览内容。
const stripQuillUi = (html: string): string => html.replace(/<select[\s\S]*?<\/select>/g, '')

type SyntaxLanguage = { key: string; label: string }

const CODE_LANGUAGES: SyntaxLanguage[] = [
  { key: 'plain', label: 'Plain Text' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'json', label: 'JSON' },
  { key: 'html', label: 'HTML' },
  { key: 'css', label: 'CSS' },
  { key: 'python', label: 'Python' },
  { key: 'bash', label: 'Bash' },
  { key: 'sql', label: 'SQL' }
]

const initEditor = async () => {
  if (!editorContainer.value || quill) return

  const [{ default: QuillCtor }, { default: Syntax }] =
    (await Promise.all([
      import('quill'),
      import('quill/modules/syntax')
    ])) as [
      { default: typeof Quill },
      { default: { DEFAULTS: { languages: SyntaxLanguage[] }; register: (name: string, mod: unknown, overwrite?: boolean) => void } }
    ]

  // 覆盖默认语言列表（避免与 DEFAULTS 合并产生多余选项）
  Syntax.DEFAULTS.languages = CODE_LANGUAGES
  QuillCtor.register('modules/syntax', Syntax, true)

  // ===== 格式刷（锁定模式）=====
  const BLOCK_FORMATS = new Set(['header', 'align', 'list', 'indent', 'direction', 'code-block', 'blockquote'])
  const SKIP_FORMATS = new Set(['link', 'code-block', 'formula', 'video'])

  let painterActive = false
  let painterFormats: Record<string, unknown> | null = null

  const setPainterButton = (active: boolean) => {
    const toolbarModule = quill?.getModule('toolbar') as { container: HTMLElement } | null
    const btn = toolbarModule?.container.querySelector('.ql-format-painter') as HTMLElement | null
    btn?.classList.toggle('painter-on', active)
  }

  const toolbarConfig = {
    container: [
      [{ header: [1, 2, 3, false] }],
      ['format-painter'],
      ['bold', 'italic', 'underline', 'strike'],
      [{ align: [false, 'center', 'right'] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['code-block', 'link', 'clean']
    ],
    // 格式刷 handler 必须在这里（构造时）注册，否则工具栏按钮不会绑定点击
    handlers: {
      'format-painter': () => {
        if (!quill) return
        if (painterActive) {
          // 再次点击：退出格式刷
          painterActive = false
          painterFormats = null
          setPainterButton(false)
          quill.focus()
          return
        }
        // 进入：读取当前选区的格式作为复制源
        const selection = quill.getSelection(true)
        if (!selection) return
        const formats = quill.getFormat(selection.index, selection.length)
        const usable = Object.fromEntries(
          Object.entries(formats).filter(([key]) => !SKIP_FORMATS.has(key))
        )
        if (Object.keys(usable).length === 0) {
          window.alert('请先选中带有格式的文字，再点击格式刷')
          return
        }
        painterFormats = usable
        painterActive = true
        setPainterButton(true)
      }
    }
  }

  quill = new QuillCtor(editorContainer.value, {
    theme: 'snow',
    modules: {
      syntax: {
        hljs,
        languages: CODE_LANGUAGES
      },
      toolbar: toolbarConfig
    },
    placeholder: '编辑你的简历内容...'
  })

  // 代码块往返保护：加载时显式保留每行文本（含行首缩进空格），
  // 避免 Quill 默认解析在边界情况下丢掉代码块的缩进。
  const DeltaCtor = QuillCtor.import('delta') as new () => ReturnType<Quill['getContents']>
  quill.clipboard.addMatcher('.ql-code-block-container', (node: Node) => {
    const container = node as HTMLElement
    const lines = Array.from(container.querySelectorAll('.ql-code-block'))
    const language = lines[0]?.getAttribute('data-language') || 'plain'
    const newDelta = new DeltaCtor()
    lines.forEach((line) => {
      newDelta.insert((line.textContent || '') + '\n', { 'code-block': language })
    })
    return newDelta
  })

  // 用 clipboard.convert + setContents 加载 HTML，保证 Delta 与 DOM 同步
  const delta = quill.clipboard.convert({ html: props.modelValue })
  quill.setContents(delta, QuillCtor.sources.SILENT)

  quill.on('text-change', () => {
    if (quill) {
      emit('update:modelValue', stripQuillUi(quill.root.innerHTML))
    }
  })

  // 编辑时点击链接不跳转（保留在当前页面，便于继续编辑）
  linkClickHandler = (e: Event) => {
    const target = e.target as HTMLElement | null
    if (target?.closest('a')) {
      e.preventDefault()
    }
  }
  quill.root.addEventListener('click', linkClickHandler)

  const toolbar = quill.getModule('toolbar') as {
    container: HTMLElement
    addHandler: (name: string, handler: () => void) => void
  }

  toolbar.addHandler('link', () => {
    if (!quill) return

    // 确保编辑器获得焦点并拿到当前选区
    const selection = quill.getSelection(true)
    if (!selection || selection.length === 0) {
      window.alert('请先在编辑器中选中要添加链接的文字，再点击链接图标')
      quill.focus()
      return
    }

    // 先记录选区，弹窗打开期间编辑器失焦也不会丢失
    pendingRange.value = { index: selection.index, length: selection.length }
    pendingText.value = quill.getText(selection.index, selection.length).trim() || ''
    showLinkDialog.value = true
  })

  // 锁定模式：光标移动到目标位置（无需选中）即自动应用已保存的格式，可连续使用，直到再次点击退出
  let paintTimer: number | undefined
  quill.on('selection-change', () => {
    if (!painterActive || !painterFormats) return
    clearTimeout(paintTimer)
    // 延迟一拍，等 selection 稳定后读取最新光标位置再应用
    paintTimer = window.setTimeout(() => {
      if (!quill || !painterActive || !painterFormats) return
      const range = quill.getSelection()
      if (!range) return

      const inlineFmts: Record<string, unknown> = {}
      const blockFmts: Record<string, unknown> = {}
      Object.entries(painterFormats).forEach(([key, value]) => {
        if (BLOCK_FORMATS.has(key)) blockFmts[key] = value
        else inlineFmts[key] = value
      })

      if (range.length > 0) {
        // 选中了目标文本：直接应用
        if (Object.keys(inlineFmts).length > 0) {
          quill.formatText(range.index, range.length, inlineFmts)
        }
        if (Object.keys(blockFmts).length > 0) {
          quill.formatLine(range.index, range.length, blockFmts)
        }
      } else {
        // 未选中：应用到光标所在的位置
        //   - 块级格式（标题/对齐/列表等）应用到光标所在行，立即生效
        //   - 行内格式（加粗/斜体等）设为光标处的输入格式，后续输入生效
        if (Object.keys(blockFmts).length > 0) {
          quill.formatLine(range.index, 1, blockFmts)
        }
        Object.entries(inlineFmts).forEach(([name, value]) => {
          quill?.format(name, value)
        })
      }
    }, 0)
  })
}

const applyLink = (knowledgeId: string) => {
  if (!quill || !pendingRange.value) return
  const { index, length } = pendingRange.value
  quill.setSelection(index, length)
  quill.format('link', `/knowledge/${knowledgeId}`)
  showLinkDialog.value = false
  pendingRange.value = null
  // 添加链接后随即跳转到该知识点的编辑页面（?edit=1 让知识页自动进入编辑模式）
  router.push({ path: `/knowledge/${knowledgeId}`, query: { edit: '1' } })
}

const cancelLink = () => {
  showLinkDialog.value = false
  pendingRange.value = null
}

onMounted(() => {
  void initEditor()
})

onUnmounted(() => {
  if (quill && linkClickHandler) {
    quill.root.removeEventListener('click', linkClickHandler)
  }
  quill = null
})
</script>

<template>
  <div ref="editorContainer" class="quill-editor" />
  <LinkDialog
    v-if="showLinkDialog"
    :selected-text="pendingText"
    @confirm="applyLink"
    @cancel="cancelLink"
  />
</template>
