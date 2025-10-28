import React, { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { history, historyKeymap } from '@codemirror/commands'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { message } from 'antd'
import {
  formatBold,
  formatItalic,
  formatStrikethrough,
  formatLink,
  formatCode,
  formatOrderedList,
  formatUnorderedList,
  applyHeading,
  undoAction,
  redoAction,
  indentList,
  outdentList
} from '@/lib/codemirror/format'
import { uploadImage } from '@/api/upload'
import './MarkdownEditor.css'

interface Props {
  value: string
  onChange: (value: string) => void
  viewRef?: React.MutableRefObject<EditorView | null>
}

export const MarkdownEditor: React.FC<Props> = ({ value, onChange, viewRef: externalViewRef }) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!editorRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        // 基础功能
        history(),
        closeBrackets(),
        markdown({ codeLanguages: languages }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        EditorView.lineWrapping,

        // 快捷键
        keymap.of([
          // 撤销/重做
          { key: 'Mod-z', run: undoAction },
          { key: 'Mod-y', run: redoAction },
          { key: 'Mod-Shift-z', run: redoAction },

          // 文本格式
          { key: 'Mod-b', run: (view) => { formatBold(view); return true } },
          { key: 'Mod-i', run: (view) => { formatItalic(view); return true } },
          { key: 'Mod-d', run: (view) => { formatStrikethrough(view); return true } },
          { key: 'Mod-k', run: (view) => { formatLink(view); return true } },
          { key: 'Mod-e', run: (view) => { formatCode(view); return true } },

          // 标题
          { key: 'Mod-1', run: (view) => { applyHeading(view, 1); return true } },
          { key: 'Mod-2', run: (view) => { applyHeading(view, 2); return true } },
          { key: 'Mod-3', run: (view) => { applyHeading(view, 3); return true } },
          { key: 'Mod-4', run: (view) => { applyHeading(view, 4); return true } },

          // 列表
          { key: 'Mod-u', run: (view) => { formatUnorderedList(view); return true } },
          { key: 'Mod-o', run: (view) => { formatOrderedList(view); return true } },

          // 列表缩进
          { key: 'Tab', run: indentList },
          { key: 'Shift-Tab', run: outdentList },

          // 默认快捷键
          ...historyKeymap,
          ...closeBracketsKeymap,
        ]),

        // 更新监听
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString()
            onChange(newValue)
          }
        }),

        // 粘贴事件处理
        EditorView.domEventHandlers({
          paste(event, view) {
            const clipboardData = event.clipboardData
            if (!clipboardData) return false

            // 检查是否有图片
            const items = Array.from(clipboardData.items)
            const imageItem = items.find(item => item.type.startsWith('image/'))

            if (imageItem) {
              event.preventDefault()

              const file = imageItem.getAsFile()
              if (!file) return true

              // 保存当前光标位置
              const insertPos = view.state.selection.main.from

              // 先插入占位符
              const placeholder = '![上传中...]()'
              view.dispatch({
                changes: {
                  from: insertPos,
                  to: insertPos,
                  insert: placeholder
                }
              })

              // 显示上传提示
              message.loading({ content: '图片上传中...', key: 'imageUpload', duration: 0 })

              // 上传图片
              uploadImage(file)
                .then((imageUrl) => {
                  // 上传成功,替换占位符为实际URL
                  const currentDoc = view.state.doc.toString()
                  const placeholderIndex = currentDoc.indexOf(placeholder, insertPos)

                  if (placeholderIndex !== -1) {
                    const imageMarkdown = `![图片](${imageUrl})`
                    view.dispatch({
                      changes: {
                        from: placeholderIndex,
                        to: placeholderIndex + placeholder.length,
                        insert: imageMarkdown
                      },
                      selection: { anchor: placeholderIndex + imageMarkdown.length }
                    })
                  }

                  message.success({ content: '图片上传成功', key: 'imageUpload', duration: 2 })
                })
                .catch((error) => {
                  // 上传失败,删除占位符
                  const currentDoc = view.state.doc.toString()
                  const placeholderIndex = currentDoc.indexOf(placeholder, insertPos)

                  if (placeholderIndex !== -1) {
                    view.dispatch({
                      changes: {
                        from: placeholderIndex,
                        to: placeholderIndex + placeholder.length,
                        insert: ''
                      }
                    })
                  }

                  message.error({ content: `图片上传失败: ${error.message}`, key: 'imageUpload', duration: 3 })
                })

              return true
            }

            return false
          }
        }),
      ],
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    // 如果父组件传入了viewRef,同步赋值
    if (externalViewRef) {
      externalViewRef.current = view
    }

    return () => {
      view.destroy()
      // 清空external ref
      if (externalViewRef) {
        externalViewRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 当外部value变化时更新编辑器
  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString()
      if (currentValue !== value) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: viewRef.current.state.doc.length,
            insert: value,
          },
        })
      }
    }
  }, [value])

  return <div ref={editorRef} className="markdown-editor" />
}
