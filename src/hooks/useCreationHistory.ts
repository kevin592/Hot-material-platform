import { useState, useEffect, useCallback } from 'react'

export interface CreationHistoryItem {
  id: string
  title: string
  markdown: string
  hotId: string | null
  createdAt: number
  updatedAt: number
  wordCount: number
}

const STORAGE_KEY = 'creation_history'
const LAST_SELECTED_KEY = 'creation_last_selected_id'
const MAX_HISTORY_COUNT = 50 // 最多保存50条历史记录

/**
 * 创作历史记录管理Hook
 */
export function useCreationHistory() {
  const [historyList, setHistoryList] = useState<CreationHistoryItem[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)

  // 保存最后选中的ID
  const saveLastSelectedId = useCallback((id: string) => {
    try {
      localStorage.setItem(LAST_SELECTED_KEY, id)
    } catch (error) {
      console.error('保存最后选中ID失败:', error)
    }
  }, [])

  // 获取最后选中的ID
  const getLastSelectedId = useCallback(() => {
    try {
      return localStorage.getItem(LAST_SELECTED_KEY)
    } catch (error) {
      console.error('获取最后选中ID失败:', error)
      return null
    }
  }, [])

  // 从localStorage加载历史记录
  const loadHistory = useCallback(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const parsed = JSON.parse(data) as CreationHistoryItem[]
        // 按更新时间倒序排列
        const sorted = parsed.sort((a, b) => b.updatedAt - a.updatedAt)
        setHistoryList(sorted)
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
    }
  }, [])

  // 保存历史记录到localStorage
  const saveHistory = useCallback((list: CreationHistoryItem[]) => {
    try {
      // 只保留最近的N条记录
      const limited = list.slice(0, MAX_HISTORY_COUNT)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited))
      setHistoryList(limited)
    } catch (error) {
      console.error('保存历史记录失败:', error)
    }
  }, [])

  // 创建新的历史记录
  const createHistory = useCallback(
    (title: string, markdown: string, hotId: string | null = null) => {
      const id = `creation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const newItem: CreationHistoryItem = {
        id,
        title: title || '无标题',
        markdown,
        hotId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        wordCount: markdown.length,
      }

      const newList = [newItem, ...historyList]
      saveHistory(newList)
      saveLastSelectedId(id)
      setCurrentId(id)
      return id
    },
    [historyList, saveHistory, saveLastSelectedId]
  )

  // 更新现有历史记录
  const updateHistory = useCallback(
    (id: string, updates: Partial<Omit<CreationHistoryItem, 'id' | 'createdAt'>>) => {
      const newList = historyList.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            ...updates,
            updatedAt: Date.now(),
            wordCount: updates.markdown ? updates.markdown.length : item.wordCount,
          }
        }
        return item
      })
      // 更新后重新排序,将更新的项移到最前面
      const sorted = newList.sort((a, b) => b.updatedAt - a.updatedAt)
      saveHistory(sorted)
    },
    [historyList, saveHistory]
  )

  // 删除历史记录
  const deleteHistory = useCallback(
    (id: string) => {
      const newList = historyList.filter((item) => item.id !== id)
      saveHistory(newList)
      if (currentId === id) {
        setCurrentId(null)
      }
    },
    [historyList, currentId, saveHistory]
  )

  // 获取单条历史记录
  const getHistory = useCallback(
    (id: string) => {
      return historyList.find((item) => item.id === id)
    },
    [historyList]
  )

  // 清空所有历史记录
  const clearAllHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setHistoryList([])
    setCurrentId(null)
  }, [])

  // 搜索历史记录
  const searchHistory = useCallback(
    (keyword: string) => {
      if (!keyword.trim()) {
        return historyList
      }
      const lowerKeyword = keyword.toLowerCase()
      return historyList.filter((item) =>
        item.title.toLowerCase().includes(lowerKeyword) ||
        item.markdown.toLowerCase().includes(lowerKeyword)
      )
    },
    [historyList]
  )

  // 组件挂载时加载历史记录
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  return {
    historyList,
    currentId,
    setCurrentId: (id: string) => {
      setCurrentId(id)
      saveLastSelectedId(id)
    },
    createHistory,
    updateHistory,
    deleteHistory,
    getHistory,
    clearAllHistory,
    searchHistory,
    getLastSelectedId,
  }
}
