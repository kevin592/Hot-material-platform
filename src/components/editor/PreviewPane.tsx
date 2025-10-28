import React, { useEffect, useRef } from 'react'
import { hljs } from '@/lib/markdown/renderer'
import './PreviewPane.css'

interface Props {
  html: string
  width?: string
}

// 高亮待处理的代码块
function highlightPendingBlocks(element: HTMLElement) {
  const pendingBlocks = element.querySelectorAll('[data-language-pending]')

  pendingBlocks.forEach((block) => {
    const lang = block.getAttribute('data-language-pending')
    const rawCode = block.getAttribute('data-raw-code')
    const showLineNumber = block.getAttribute('data-show-line-number') === 'true'

    if (lang && rawCode && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(rawCode, { language: lang }).value
        const lines = highlighted.split('\n')

        if (showLineNumber) {
          const numberedLines = lines
            .map((line, index) => {
              const lineNumber = index + 1
              return `<span class="hljs-line"><span class="hljs-line-number">${lineNumber}</span>${line}</span>`
            })
            .join('\n')
          block.innerHTML = numberedLines
        } else {
          block.innerHTML = highlighted
        }

        block.removeAttribute('data-language-pending')
        block.removeAttribute('data-raw-code')
        block.removeAttribute('data-show-line-number')
      } catch (e) {
        console.error('Error highlighting code:', e)
      }
    }
  })
}

export const PreviewPane: React.FC<Props> = ({ html, width = '100%' }) => {
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (previewRef.current) {
      // 高亮代码块
      highlightPendingBlocks(previewRef.current)
    }
  }, [html])

  return (
    <div className="preview-wrapper" style={{ width }}>
      <div className="preview-content" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div
          id="output"
          ref={previewRef}
          className="markdown-preview"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
