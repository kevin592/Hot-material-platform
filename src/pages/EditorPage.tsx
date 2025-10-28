import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Layout, Button, Select, Space, Spin, App } from 'antd'
import { debounce } from 'es-toolkit'
import {
  SaveOutlined,
  CloseOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { EditorView } from '@codemirror/view'
import { MarkdownEditor } from '@/components/editor/MarkdownEditor'
import { PreviewPane } from '@/components/editor/PreviewPane'
import { useMarkdownRenderer } from '@/hooks/useMarkdownRenderer'
import { useEditorDraft } from '@/hooks/useEditorDraft'
import { themeMap } from '@/lib/markdown/themes'
import type { Theme } from '@/lib/markdown/renderer-types'
import './EditorPage.css'

const { Header, Content } = Layout

export default function EditorPage() {
  const { message } = App.useApp()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const hotId = searchParams.get('hotId')
  const initialTitle = searchParams.get('title')

  // 编辑器状态
  const [markdown, setMarkdown] = useState(initialTitle ? `# ${decodeURIComponent(initialTitle)}\n\n` : '# 开始你的创作\n\n')
  const [debouncedMarkdown, setDebouncedMarkdown] = useState(markdown)
  const [isRendering, setIsRendering] = useState(false)
  const [theme, setTheme] = useState<keyof typeof themeMap>('default')
  const [primaryColor, setPrimaryColor] = useState('#0F4C81')
  const editorViewRef = useRef<EditorView | null>(null) // 用于访问编辑器实例
  const previewPaneRef = useRef<HTMLDivElement>(null) // 预览区ref
  const isSyncScrolling = useRef(false) // 标记是否正在同步滚动

  // 防抖更新debouncedMarkdown
  const debouncedSetMarkdown = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedMarkdown(value)
        setIsRendering(false)
      }, 300),
    []
  )

  // 当markdown变化时,标记正在渲染并延迟更新
  useEffect(() => {
    if (markdown !== debouncedMarkdown) {
      setIsRendering(true)
      debouncedSetMarkdown(markdown)
    }
  }, [markdown, debouncedMarkdown, debouncedSetMarkdown])

  // 同步滚动: 编辑器和预览区双向同步
  useEffect(() => {
    if (!editorViewRef.current || !previewPaneRef.current) return

    const editorScroller = editorViewRef.current.scrollDOM
    const previewPane = previewPaneRef.current

    // 编辑器滚动时同步预览区
    const handleEditorScroll = () => {
      if (isSyncScrolling.current) return

      const scrollTop = editorScroller.scrollTop
      const scrollHeight = editorScroller.scrollHeight - editorScroller.clientHeight
      const scrollPercentage = scrollHeight > 0 ? scrollTop / scrollHeight : 0

      const previewScrollHeight = previewPane.scrollHeight - previewPane.clientHeight
      const targetScrollTop = previewScrollHeight * scrollPercentage

      isSyncScrolling.current = true
      previewPane.scrollTop = targetScrollTop
      requestAnimationFrame(() => {
        isSyncScrolling.current = false
      })
    }

    // 预览区滚动时同步编辑器
    const handlePreviewScroll = () => {
      if (isSyncScrolling.current) return

      const scrollTop = previewPane.scrollTop
      const scrollHeight = previewPane.scrollHeight - previewPane.clientHeight
      const scrollPercentage = scrollHeight > 0 ? scrollTop / scrollHeight : 0

      const editorScrollHeight = editorScroller.scrollHeight - editorScroller.clientHeight
      const targetScrollTop = editorScrollHeight * scrollPercentage

      isSyncScrolling.current = true
      editorScroller.scrollTop = targetScrollTop
      requestAnimationFrame(() => {
        isSyncScrolling.current = false
      })
    }

    editorScroller.addEventListener('scroll', handleEditorScroll)
    previewPane.addEventListener('scroll', handlePreviewScroll)

    return () => {
      editorScroller.removeEventListener('scroll', handleEditorScroll)
      previewPane.removeEventListener('scroll', handlePreviewScroll)
    }
  }, [])

  // 草稿管理
  const { getDraft, clearDraft, saveDraft } = useEditorDraft(hotId, markdown)

  // 检查并恢复草稿
  useEffect(() => {
    const draft = getDraft()
    const initialMarkdown = initialTitle ? `# ${decodeURIComponent(initialTitle)}\n\n` : '# 开始你的创作\n\n'

    if (draft && draft.markdown !== initialMarkdown) {
      // 检查草稿是否比当前内容更新
      const draftAge = Date.now() - draft.updatedAt
      const isRecent = draftAge < 24 * 60 * 60 * 1000 // 24小时内的草稿

      if (isRecent && draft.markdown.trim() && draft.markdown !== initialMarkdown) {
        Modal.confirm({
          title: '发现未保存的草稿',
          content: `上次编辑时间: ${new Date(draft.updatedAt).toLocaleString()}\n是否恢复草稿内容?`,
          okText: '恢复草稿',
          cancelText: '放弃草稿',
          onOk: () => {
            setMarkdown(draft.markdown)
          },
          onCancel: () => {
            clearDraft()
          }
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 只在组件挂载时执行一次

  // 渲染器配置
  const rendererOptions = useMemo(() => ({
    theme: themeMap[theme],
    primaryColor,
    size: '16px',
    fonts: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    isUseIndent: false,
    isUseJustify: false,
    citeStatus: true,
    legend: 'alt-title',
    countStatus: true,
    isMacCodeBlock: true,
    isShowLineNumber: true,
  }), [theme, primaryColor])

  const { render } = useMarkdownRenderer(rendererOptions)

  // 使用 useMemo 来确保当 debouncedMarkdown 或 render 变化时重新计算
  const htmlOutput = useMemo(() => {
    try {
      return render(debouncedMarkdown)
    } catch (error: any) {
      console.error('Markdown渲染错误详情:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        markdownLength: debouncedMarkdown.length,
        error: error
      })
      return `<div style="color: red; padding: 20px;">渲染错误: ${error?.message || error?.toString() || '未知错误'}</div>`
    }
  }, [debouncedMarkdown, render])

  // 保存功能
  const handleSave = useCallback(async () => {
    try {
      const response = await fetch('/api/creation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotId,
          markdown,
          html: htmlOutput,
        }),
      })

      if (response.ok) {
        message.success('保存成功')
        clearDraft() // 保存成功后清除草稿
      } else {
        throw new Error('保存失败')
      }
    } catch (error) {
      console.error('保存失败:', error)
      message.error('保存失败,请重试')
    }
  }, [hotId, markdown, htmlOutput, clearDraft])

  // 关闭并返回
  const handleClose = useCallback(() => {
    navigate(-1)
  }, [navigate])

  // 复制预览样式
  const handleCopyPreview = useCallback(async () => {
    try {
      const previewElement = document.getElementById('output')
      if (!previewElement) {
        message.error('预览内容为空')
        return
      }

      // 获取预览HTML
      const previewHTML = previewElement.innerHTML

      // 创建完整的HTML结构,内联基础样式
      const fullHTML = `
        <div style="max-width: 900px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.75; color: #333;">
          ${previewHTML}
        </div>
      `

      // 复制到剪贴板 (同时复制HTML和纯文本)
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([fullHTML], { type: 'text/html' }),
          'text/plain': new Blob([markdown], { type: 'text/plain' })
        })
      ])

      message.success('已复制预览样式,可直接粘贴到公众号或头条编辑器')
    } catch (error) {
      console.error('复制失败:', error)
      message.error('复制失败,请重试')
    }
  }, [markdown])

  return (
    <Layout className="editor-page">
      {/* 工具栏 */}
      <Header className="editor-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {/* 左侧: 主要操作 */}
          <Space>
            <Select
              value={theme}
              onChange={setTheme}
              style={{ width: 140 }}
              options={[
                { label: '经典主题', value: 'default' },
                { label: '优雅主题', value: 'grace' },
                { label: '简洁主题', value: 'simple' },
              ]}
            />

            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={handleCopyPreview}
            >
              复制预览样式
            </Button>

            <Button icon={<SaveOutlined />} onClick={handleSave}>
              保存
            </Button>

            <Button icon={<CloseOutlined />} onClick={handleClose}>
              关闭
            </Button>
          </Space>

          {/* 右侧: 字数统计 */}
          <div style={{ color: '#999', fontSize: '14px' }}>
            字数 {markdown.length}，阅读大约需 {Math.ceil(markdown.length / 400)} 分钟
          </div>
        </div>
      </Header>

      {/* 编辑器和预览 */}
      <Layout className="editor-layout">
        <Content className="preview-pane" ref={previewPaneRef}>
          <Spin spinning={isRendering} tip="渲染中..." size="large">
            <PreviewPane html={htmlOutput} />
          </Spin>
        </Content>

        <Content className="editor-pane">
          <MarkdownEditor value={markdown} onChange={setMarkdown} viewRef={editorViewRef} />
        </Content>
      </Layout>
    </Layout>
  )
}
