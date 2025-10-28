import type { PropertiesHyphen } from 'csstype'
import type { ReadTimeResults } from 'reading-time'
import type { Token, MarkedExtension } from 'marked'

// GFM Block types
type GFMBlock = `blockquote_note` | `blockquote_tip` | `blockquote_info` | `blockquote_important` | `blockquote_warning` | `blockquote_caution`
  | `blockquote_title` | `blockquote_title_note` | `blockquote_title_tip` | `blockquote_title_info` | `blockquote_title_important` | `blockquote_title_warning` | `blockquote_title_caution`
  | `blockquote_p` | `blockquote_p_note` | `blockquote_p_tip` | `blockquote_p_info` | `blockquote_p_important` | `blockquote_p_warning` | `blockquote_p_caution`

// Markup style keys
type MarkupStyleKeys = `markdown_mark` | `markdown_kbd` | `markdown_sub` | `markdown_sup`

export type Block = `container` | `h1` | `h2` | `h3` | `h4` | `h5` | `h6` | `p` | `blockquote` | `blockquote_p` | `code_pre` | `code` | `image` | `ol` | `ul` | `footnotes` | `figure` | `hr` | `block_katex` | GFMBlock
export type Inline = `listitem` | `codespan` | `link` | `wx_link` | `strong` | `table` | `thead` | `th` | `td` | `tr` | `footnote` | `figcaption` | `em` | `inline_katex` | MarkupStyleKeys

interface CustomCSSProperties {
  [`--md-primary-color`]?: string
  [key: `--${string}`]: string | undefined
}

export type ExtendedProperties = PropertiesHyphen & CustomCSSProperties

export interface Theme {
  base: ExtendedProperties
  block: Record<Block, ExtendedProperties>
  inline: Record<Inline, ExtendedProperties>
}

export type ThemeStyles = Record<Block | Inline, ExtendedProperties>

export interface IOpts {
  theme: Theme
  fonts: string
  size: string
  primaryColor?: string
  legend?: string
  citeStatus?: boolean
  countStatus?: boolean
  isUseIndent?: boolean
  isUseJustify?: boolean
  isMacCodeBlock?: boolean
  isShowLineNumber?: boolean
}

export interface RendererAPI {
  reset: (newOpts: Partial<IOpts>) => void
  setOptions: (newOpts: Partial<IOpts>) => void
  getOpts: () => IOpts
  parseFrontMatterAndContent: (markdown: string) => {
    yamlData: Record<string, any>
    markdownContent: string
    readingTime: ReadTimeResults
  }
  buildReadingTime: (reading: ReadTimeResults) => string
  buildFootnotes: () => string
  buildAddition: () => string
  createContainer: (html: string) => string
}

// Alert types
export interface AlertOptions {
  className?: string
  variants?: AlertVariant[]
  styles?: ThemeStyles
  withoutStyle?: boolean
}

export interface AlertVariantItem {
  type: string
  icon: string
  title?: string
  titleClassName?: string
}

export type AlertVariant = string | AlertVariantItem

// Markup types
export interface MarkupOptions {
  styles?: ThemeStyles
}

// Slider types
export interface SliderOptions {
  styles?: ThemeStyles
}
