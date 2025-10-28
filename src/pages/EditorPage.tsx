import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Layout, Button, Select, Space, Spin, App, Modal, Input } from 'antd'
import { debounce } from 'es-toolkit'
import {
  SaveOutlined,
  CloseOutlined,
  CopyOutlined,
  FolderOutlined,
  MobileOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { EditorView } from '@codemirror/view'
import { MarkdownEditor } from '@/components/editor/MarkdownEditor'
import { PreviewPane } from '@/components/editor/PreviewPane'
import { useMarkdownRenderer } from '@/hooks/useMarkdownRenderer'
import { useEditorDraft } from '@/hooks/useEditorDraft'
import { useCreationHistory } from '@/hooks/useCreationHistory'
import { themeMap } from '@/lib/markdown/themes'
import type { Theme } from '@/lib/markdown/renderer-types'
import './EditorPage.css'

const { Header, Content } = Layout

// 时间格式化函数
function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else if (diff < 7 * day) {
    return `${Math.floor(diff / day)}天前`
  } else {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
}

export default function EditorPage() {
  const { message } = App.useApp()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const hotId = searchParams.get('hotId')
  const initialTitle = searchParams.get('title')

  // 历史记录管理
  const {
    historyList,
    currentId,
    setCurrentId,
    createHistory,
    updateHistory,
    deleteHistory,
    searchHistory,
    getLastSelectedId,
  } = useCreationHistory()

  // 编辑器状态
  const [title, setTitle] = useState(initialTitle ? decodeURIComponent(initialTitle) : '')
  const [markdown, setMarkdown] = useState(initialTitle ? `# ${decodeURIComponent(initialTitle)}\n\n` : '# 开始你的创作\n\n')
  const [debouncedMarkdown, setDebouncedMarkdown] = useState(markdown)
  const [isRendering, setIsRendering] = useState(false)
  const [theme, setTheme] = useState<keyof typeof themeMap>('default')
  const [primaryColor, setPrimaryColor] = useState('#0F4C81')
  const editorViewRef = useRef<EditorView | null>(null) // 用于访问编辑器实例
  const previewPaneRef = useRef<HTMLDivElement>(null) // 预览区ref
  const isSyncScrolling = useRef(false) // 标记是否正在同步滚动

  // UI状态
  const [historyVisible, setHistoryVisible] = useState(true)
  const [previewVisible, setPreviewVisible] = useState(true)
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false)
  const [materialDrawerOpen, setMaterialDrawerOpen] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')

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

  // 检查并恢复草稿或创建新历史记录
  useEffect(() => {
    // 如果已经有currentId,说明已经初始化过了,直接返回
    if (currentId) return
    // 如果historyList还没加载,等待
    if (historyList.length === 0 && localStorage.getItem('creation_history')) return

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
            // 创建新的历史记录
            const id = createHistory(title || '无标题', draft.markdown, hotId)
            setCurrentId(id)
          },
          onCancel: () => {
            clearDraft()
            // 创建新的历史记录
            const id = createHistory(title || '无标题', initialMarkdown, hotId)
            setCurrentId(id)
          }
        })
        return
      }
    }

    // 检查是否有历史记录
    if (historyList.length > 0) {
      // 如果有URL参数(hotId或title),说明是从主页跳转来的,创建新记录
      if (hotId || initialTitle) {
        const id = createHistory(title || '无标题', markdown, hotId)
        setCurrentId(id)
      } else {
        // 否则恢复最后选中的历史记录
        const lastSelectedId = getLastSelectedId()
        const lastSelected = lastSelectedId ? historyList.find(h => h.id === lastSelectedId) : null

        if (lastSelected) {
          // 恢复最后选中的记录
          setCurrentId(lastSelected.id)
          setTitle(lastSelected.title)
          setMarkdown(lastSelected.markdown)
        } else {
          // 如果找不到最后选中的记录,恢复最新的
          const latestHistory = historyList[0]
          setCurrentId(latestHistory.id)
          setTitle(latestHistory.title)
          setMarkdown(latestHistory.markdown)
        }
      }
    } else {
      // 如果没有历史记录,创建新的
      const id = createHistory(title || '无标题', markdown, hotId)
      setCurrentId(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyList]) // 依赖整个historyList,确保历史记录加载后执行

  // 自动保存到历史记录(防抖)
  const debouncedSaveToHistory = useMemo(
    () =>
      debounce(() => {
        if (currentId && markdown.trim()) {
          updateHistory(currentId, { title: title || '无标题', markdown, hotId })
        }
      }, 2000), // 2秒后自动保存
    [currentId, title, markdown, hotId, updateHistory]
  )

  // 当标题或内容变化时自动保存
  useEffect(() => {
    if (currentId) {
      debouncedSaveToHistory()
    }
  }, [title, markdown, currentId, debouncedSaveToHistory])

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
    countStatus: false,
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

  // 历史记录操作函数
  const handleNewCreation = useCallback(() => {
    const newMarkdown = '# 开始你的创作\n\n'
    const id = createHistory('无标题', newMarkdown, null)
    setCurrentId(id)
    setTitle('')
    setMarkdown(newMarkdown)
    message.success('已创建新文档')
  }, [createHistory, setCurrentId, message])

  const handleSelectHistory = useCallback((id: string) => {
    const item = historyList.find(h => h.id === id)
    if (item) {
      setCurrentId(id)
      setTitle(item.title)
      setMarkdown(item.markdown)
    }
  }, [historyList, setCurrentId])

  const handleDeleteHistory = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条创作记录吗?此操作不可恢复。',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        deleteHistory(id)
        message.success('已删除')
        // 如果删除的是当前项,切换到第一个
        if (id === currentId && historyList.length > 1) {
          const nextItem = historyList.find(h => h.id !== id)
          if (nextItem) {
            handleSelectHistory(nextItem.id)
          }
        }
      }
    })
  }, [deleteHistory, currentId, historyList, message, handleSelectHistory])

  // 搜索过滤后的历史列表
  const filteredHistory = useMemo(() => {
    return searchKeyword ? searchHistory(searchKeyword) : historyList
  }, [searchKeyword, searchHistory, historyList])

  // UI交互函数
  const toggleHistory = () => setHistoryVisible(!historyVisible)
  const togglePreview = () => setPreviewVisible(!previewVisible)
  const openSettingsDrawer = () => setSettingsDrawerOpen(true)
  const openMaterialDrawer = () => setMaterialDrawerOpen(true)
  const closeAllDrawers = () => {
    setSettingsDrawerOpen(false)
    setMaterialDrawerOpen(false)
  }
  const scrollToTop = () => {
    const editorContent = document.querySelector('.editor-content')
    if (editorContent) {
      editorContent.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <Layout className="editor-page">
      {/* 顶部工具栏 */}
      <Header className="editor-header">
        <div className="editor-header-left">
          <div className="editor-logo">
            <span>✨</span>
            <span>AI创作助手</span>
          </div>
          <Button
            type="text"
            icon={<FolderOutlined />}
            onClick={toggleHistory}
            title="历史记录"
          />
        </div>

        <div className="editor-header-center">
          <input
            type="text"
            className="editor-title-input"
            placeholder="无标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="editor-header-right">
          <Select
            value={theme}
            onChange={setTheme}
            style={{ width: 120, border: 'none' }}
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
            复制
          </Button>
          <Button icon={<SaveOutlined />} onClick={handleSave}>
            保存
          </Button>
          <Button
            type="text"
            icon={<MobileOutlined />}
            onClick={togglePreview}
            title="预览"
          />
        </div>
      </Header>

      {/* 主容器 */}
      <Layout className="editor-layout">
        {/* 左侧历史面板 */}
        <div className={`history-sidebar ${!historyVisible ? 'collapsed' : ''}`}>
          <div className="history-header">
            <button className="history-new-btn" onClick={handleNewCreation}>
              <span>➕</span>
              <span>新建创作</span>
            </button>
            <div className="history-search">
              <span className="history-search-icon">🔍</span>
              <Input
                className="history-search-input"
                placeholder="搜索..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                allowClear
              />
            </div>
          </div>
          <div className="history-list">
            {filteredHistory.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                {searchKeyword ? '无搜索结果' : '暂无历史记录'}
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className={`history-item ${item.id === currentId ? 'active' : ''}`}
                  onClick={() => handleSelectHistory(item.id)}
                >
                  <div className="history-item-title">{item.title}</div>
                  <div className="history-item-meta">
                    <span>{formatTime(item.updatedAt)}</span>
                    <span>•</span>
                    <span>{item.wordCount}字</span>
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => handleDeleteHistory(item.id, e)}
                      style={{ marginLeft: 'auto' }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 编辑器区域 */}
        <Content className="editor-pane">
          <div className="editor-content">
            <MarkdownEditor value={markdown} onChange={setMarkdown} viewRef={editorViewRef} />
          </div>

          {/* 右下角悬浮工具栏 */}
          <div className="floating-toolbar">
            <button className="float-btn" onClick={openMaterialDrawer} title="热点素材">
              <span>📌</span>
              <span className="float-btn-tooltip">热点素材</span>
            </button>
            <button className="float-btn primary" onClick={openSettingsDrawer} title="AI设置">
              <span>✨</span>
              <span className="float-btn-tooltip">AI设置</span>
            </button>
            <button className="float-btn" onClick={scrollToTop} title="回到顶部">
              <span>⬆️</span>
              <span className="float-btn-tooltip">回到顶部</span>
            </button>
          </div>
        </Content>

        {/* 预览区 */}
        <div className={`preview-pane ${!previewVisible ? 'collapsed' : ''}`} ref={previewPaneRef}>
          <div className="preview-header">
            <h3>📱 手机预览</h3>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>375px</span>
          </div>
          <div className="preview-container">
            <div className="preview-phone">
              <Spin spinning={isRendering} tip="渲染中..." size="large">
                <PreviewPane html={htmlOutput} />
              </Spin>
            </div>
          </div>
        </div>
      </Layout>

      {/* 遮罩层 */}
      <div
        className={`drawer-overlay ${settingsDrawerOpen || materialDrawerOpen ? 'active' : ''}`}
        onClick={closeAllDrawers}
      />

      {/* AI设置抽屉 */}
      <div className={`drawer ${settingsDrawerOpen ? 'active' : ''}`}>
        <div className="drawer-header">
          <h2>AI 创作设置</h2>
          <button className="drawer-close-btn" onClick={closeAllDrawers}>✕</button>
        </div>
        <div className="drawer-content">
          {/* 写作风格 */}
          <div className="drawer-section">
            <div className="drawer-section-title">🎨 写作风格</div>
            <div className="drawer-tag-grid">
              <div className="drawer-tag active">专业严谨</div>
              <div className="drawer-tag">轻松幽默</div>
              <div className="drawer-tag">感性细腻</div>
              <div className="drawer-tag">理性客观</div>
              <div className="drawer-tag">热情激昂</div>
              <div className="drawer-tag">温和平实</div>
            </div>
          </div>

          {/* 文章类型 */}
          <div className="drawer-section">
            <div className="drawer-section-title">📝 文章类型</div>
            <label className="drawer-form-label">选择内容类型</label>
            <select className="drawer-form-select">
              <option>新闻资讯</option>
              <option>深度评论</option>
              <option>情感故事</option>
              <option>知识科普</option>
              <option>热点解读</option>
            </select>
          </div>

          {/* 目标读者 */}
          <div className="drawer-section">
            <div className="drawer-section-title">👥 目标读者</div>
            <div className="drawer-tag-grid">
              <div className="drawer-tag active">大众读者</div>
              <div className="drawer-tag">年轻群体</div>
              <div className="drawer-tag">专业人士</div>
              <div className="drawer-tag">行业从业者</div>
            </div>
          </div>

          {/* 创作要求 */}
          <div className="drawer-section">
            <div className="drawer-section-title">💡 创作要求</div>
            <label className="drawer-form-label">告诉 AI 你的特殊需求</label>
            <textarea className="drawer-form-textarea" placeholder="例如：&#10;• 重点突出主人公的成长经历&#10;• 多使用数据支撑观点&#10;• 结尾要有启发性&#10;• 控制在1500字以内"></textarea>
          </div>

          {/* AI功能按钮 */}
          <div className="drawer-section">
            <div className="drawer-section-title">🤖 AI 辅助</div>
            <div className="drawer-ai-btn-group">
              <button className="drawer-ai-btn generate">
                <span>✨</span>
                <span>AI 生成内容</span>
              </button>
              <button className="drawer-ai-btn secondary">
                <span>🔄</span>
                <span>AI 优化润色</span>
              </button>
              <button className="drawer-ai-btn secondary">
                <span>➕</span>
                <span>AI 续写扩展</span>
              </button>
              <button className="drawer-ai-btn secondary">
                <span>✂️</span>
                <span>AI 精简压缩</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 素材抽屉 */}
      <div className={`drawer left ${materialDrawerOpen ? 'active' : ''}`}>
        <div className="drawer-header">
          <h2>热点素材库</h2>
          <button className="drawer-close-btn" onClick={closeAllDrawers}>✕</button>
        </div>
        <div className="drawer-content">
          <div className="drawer-section">
            <div className="drawer-section-title">📌 选择素材</div>
            <label className="drawer-form-label">当前选中</label>
            <select className="drawer-form-select">
              <option>2025央视主持人大赛最大黑马竟是她...</option>
              <option>日本高规格迎接特朗普，这上特大见面礼...</option>
              <option>2号提车，9号车祸，15号赔路...</option>
            </select>

            <label className="drawer-form-label">素材内容</label>
            <textarea
              className="drawer-form-textarea"
              style={{ minHeight: '300px' }}
              readOnly
              value={initialTitle ? `${decodeURIComponent(initialTitle)}\n\n(素材内容占位符)` : '请选择素材'}
            />

            <button className="drawer-ai-btn generate" style={{ marginTop: '16px' }}>
              <span>📝</span>
              <span>使用此素材创作</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
