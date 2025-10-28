import { useEffect, useCallback, useRef } from 'react'

interface DraftData {
  markdown: string
  hotId: string | null
  title: string
  updatedAt: number
}

const DRAFT_KEY_PREFIX = 'editor-draft-'
const AUTO_SAVE_DELAY = 3000 // 3秒防抖

export function useEditorDraft(hotId: string | null, markdown: string) {
  const timeoutRef = useRef<NodeJS.Timeout>()

  // 获取草稿key
  const getDraftKey = useCallback(() => {
    return `${DRAFT_KEY_PREFIX}${hotId || 'new'}`
  }, [hotId])

  // 保存草稿到LocalStorage
  const saveDraft = useCallback(() => {
    const draftData: DraftData = {
      markdown,
      hotId,
      title: markdown.split('\n')[0].replace(/^#\s*/, '').trim() || '未命名',
      updatedAt: Date.now()
    }

    try {
      localStorage.setItem(getDraftKey(), JSON.stringify(draftData))
    } catch (error) {
      console.error('保存草稿失败:', error)
    }
  }, [markdown, hotId, getDraftKey])

  // 获取草稿
  const getDraft = useCallback((): DraftData | null => {
    try {
      const draftJson = localStorage.getItem(getDraftKey())
      if (!draftJson) return null

      const draft = JSON.parse(draftJson) as DraftData
      return draft
    } catch (error) {
      console.error('读取草稿失败:', error)
      return null
    }
  }, [getDraftKey])

  // 清除草稿
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(getDraftKey())
    } catch (error) {
      console.error('清除草稿失败:', error)
    }
  }, [getDraftKey])

  // 自动保存 (防抖3秒)
  useEffect(() => {
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      if (markdown.trim()) {
        saveDraft()
      }
    }, AUTO_SAVE_DELAY)

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [markdown, saveDraft])

  // 组件卸载时保存一次
  useEffect(() => {
    return () => {
      if (markdown.trim()) {
        saveDraft()
      }
    }
  }, [markdown, saveDraft])

  return {
    getDraft,
    clearDraft,
    saveDraft
  }
}
