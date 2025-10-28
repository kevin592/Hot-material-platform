import { useRef, useCallback, useEffect, useState } from 'react'
import { marked } from 'marked'
import { initRenderer } from '@/lib/markdown/renderer'
import type { RendererAPI, IOpts } from '@/lib/markdown/renderer-types'

export function useMarkdownRenderer(options: IOpts) {
  const rendererRef = useRef<RendererAPI | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // 初始化渲染器
    rendererRef.current = initRenderer(options)
    setIsReady(true)

    return () => {
      // 清理
      rendererRef.current = null
      setIsReady(false)
    }
  }, [options])

  const render = useCallback((markdown: string): string => {
    if (!rendererRef.current) {
      return ''
    }

    // 解析front-matter和内容
    const { markdownContent, readingTime } =
      rendererRef.current.parseFrontMatterAndContent(markdown)

    // 渲染markdown
    const content = marked(markdownContent)

    // 构建脚注
    const footer = rendererRef.current.buildFootnotes()

    // 构建阅读时间
    const readingTimeHtml = rendererRef.current.buildReadingTime(readingTime)

    // 创建容器并返回
    return rendererRef.current.createContainer(
      `${readingTimeHtml}${content}${footer}`
    )
  }, [isReady])

  const updateOptions = useCallback((newOpts: Partial<IOpts>) => {
    if (rendererRef.current) {
      rendererRef.current.setOptions(newOpts)
    }
  }, [])

  return { render, updateOptions }
}
