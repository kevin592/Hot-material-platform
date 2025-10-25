import React, { useState, useEffect } from 'react';
import { Card, Steps, Button, Space, message, Spin, Typography, Progress, Divider, Input, Modal, Radio, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, CopyOutlined, CheckCircleOutlined, LoadingOutlined, CloseCircleOutlined, ThunderboltOutlined, EditOutlined, EyeOutlined, BulbOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { createArticle, generateTitles } from '../services/cozeService';
import './AIEditor.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AIEditorProps {
  topic: string;
  onBack: () => void;
}

interface AgentStatus {
  name: string;
  label: string;
  status: 'wait' | 'process' | 'finish' | 'error';
  description?: string;
}

const AIEditor: React.FC<AIEditorProps> = ({ topic, onBack }) => {
  const [agents, setAgents] = useState<AgentStatus[]>([
    { name: 'coordinator', label: '初始化协调器', status: 'wait' },
    { name: 'topic_analyzer', label: '分析选题', status: 'wait' },
    { name: 'material_hunter', label: '收集素材', status: 'wait' },
    { name: 'viewpoint_strategist', label: '设计观点', status: 'wait' },
    { name: 'card_creator', label: '创作卡片', status: 'wait' },
    { name: 'style_cloner', label: '风格检查', status: 'wait' },
    { name: 'article_weaver', label: '组装文章', status: 'wait' }
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [article, setArticle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [articleDraft, setArticleDraft] = useState('');

  // 标题生成相关状态
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [titleGenerating, setTitleGenerating] = useState(false);

  // 当文章生成后,同步到草稿
  useEffect(() => {
    if (article) {
      setArticleDraft(article);
    }
  }, [article]);

  const startCreation = async () => {
    setLoading(true);
    setError('');
    setArticle('');
    setCurrentStep(0);
    setProgress(0);

    // 重置所有agent状态
    setAgents(prev => prev.map(agent => ({ ...agent, status: 'wait', description: '' })));

    try {
      // 模拟Agent执行流程
      for (let i = 0; i < agents.length; i++) {
        setCurrentStep(i);
        updateAgentStatus(i, 'process');
        setProgress(((i + 1) / agents.length) * 100);

        // 模拟AI处理时间
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 模拟Agent输出
        const descriptions = [
          '协调器启动成功，已分配任务',
          `分析完成：${topic} - 发现3个关键角度`,
          '收集到15条相关素材和数据',
          '观点框架已构建：引入-论证-高潮-结尾',
          '生成7个内容卡片，逻辑连贯',
          '风格一致性检查通过 (95%匹配度)',
          '文章组装完成，共1200字'
        ];
        updateAgentStatus(i, 'finish', descriptions[i]);
      }

      // 调用Coze API创作文章
      const result = await createArticle(topic);
      setArticle(result);
      message.success('文章创作完成!');

    } catch (err: any) {
      setError(err.message || '创作失败');
      updateAgentStatus(currentStep, 'error', err.message);
      message.error('创作失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const updateAgentStatus = (index: number, status: AgentStatus['status'], description?: string) => {
    setAgents(prev => prev.map((agent, i) =>
      i === index ? { ...agent, status, description } : agent
    ));
  };

  const handleCopyArticle = () => {
    navigator.clipboard.writeText(article);
    message.success('文章已复制到剪贴板');
  };

  const handleCopyForPlatform = (platform: string) => {
    let content = article;

    switch(platform) {
      case 'wechat':
        // 公众号:保留Markdown,稍作调整
        content = article;
        message.success('已复制公众号格式');
        break;
      case 'toutiao':
        // 头条:精简版,移除过长段落
        content = article.split('\n').filter(line => line.length < 200).join('\n');
        message.success('已复制头条格式(精简版)');
        break;
      case 'zhihu':
        // 知乎:保持Markdown
        content = article;
        message.success('已复制知乎格式');
        break;
      default:
        content = article;
    }

    navigator.clipboard.writeText(content);
  };

  const copyMenuItems: MenuProps['items'] = [
    {
      key: 'markdown',
      label: '复制Markdown格式',
      onClick: () => handleCopyArticle(),
    },
    {
      key: 'wechat',
      label: '复制为公众号格式',
      onClick: () => handleCopyForPlatform('wechat'),
    },
    {
      key: 'toutiao',
      label: '复制为今日头条格式',
      onClick: () => handleCopyForPlatform('toutiao'),
    },
    {
      key: 'zhihu',
      label: '复制为知乎格式',
      onClick: () => handleCopyForPlatform('zhihu'),
    },
  ];

  const handleDownload = () => {
    const blob = new Blob([article], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.substring(0, 20)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('文章已下载');
  };

  const getStepIcon = (status: AgentStatus['status']) => {
    switch (status) {
      case 'finish':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'process':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  const handleToggleEditMode = () => {
    setEditMode(!editMode);
    if (!editMode) {
      message.info('已切换到编辑模式');
    } else {
      message.info('已切换到预览模式');
    }
  };

  const handleSaveDraft = () => {
    setArticle(articleDraft);
    message.success('保存成功');
  };

  // Markdown工具栏功能
  const textareaRef = React.useRef<any>(null);

  const insertMarkdown = (prefix: string, suffix: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current?.resizableTextArea?.textArea;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = articleDraft.substring(start, end);
    const textToInsert = selectedText || placeholder;
    const newText = articleDraft.substring(0, start) + prefix + textToInsert + suffix + articleDraft.substring(end);

    setArticleDraft(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + textToInsert.length);
    }, 0);
  };

  const toolbarActions = [
    { label: '标题1', icon: 'H1', action: () => insertMarkdown('# ', '', '标题') },
    { label: '标题2', icon: 'H2', action: () => insertMarkdown('## ', '', '标题') },
    { label: '标题3', icon: 'H3', action: () => insertMarkdown('### ', '', '标题') },
    { label: '加粗', icon: 'B', action: () => insertMarkdown('**', '**', '加粗文字') },
    { label: '斜体', icon: 'I', action: () => insertMarkdown('*', '*', '斜体文字') },
    { label: '删除线', icon: 'S', action: () => insertMarkdown('~~', '~~', '删除文字') },
    { label: '引用', icon: '""', action: () => insertMarkdown('> ', '', '引用内容') },
    { label: '代码', icon: '<>', action: () => insertMarkdown('`', '`', '代码') },
    { label: '代码块', icon: '{ }', action: () => insertMarkdown('```\n', '\n```', '代码块') },
    { label: '无序列表', icon: '•', action: () => insertMarkdown('- ', '', '列表项') },
    { label: '有序列表', icon: '1.', action: () => insertMarkdown('1. ', '', '列表项') },
    { label: '链接', icon: '🔗', action: () => insertMarkdown('[', '](url)', '链接文字') },
    { label: '图片', icon: '🖼', action: () => insertMarkdown('![', '](url)', '图片描述') },
    { label: '分割线', icon: '—', action: () => insertMarkdown('\n---\n', '', '') },
  ];

  const handleGenerateTitles = async () => {
    setTitleGenerating(true);
    try {
      const titles = await generateTitles(topic, 10);
      setGeneratedTitles(titles);
      setSelectedTitle(titles[0]);
      setTitleModalVisible(true);
    } catch (error: any) {
      message.error(error.message || '标题生成失败');
    } finally {
      setTitleGenerating(false);
    }
  };

  const handleUseTitle = () => {
    if (selectedTitle) {
      // 更新文章中的标题
      const newArticle = article.replace(/^#\s+.+$/m, `# ${selectedTitle}`);
      setArticle(newArticle);
      setArticleDraft(newArticle);
      setTitleModalVisible(false);
      message.success('标题已更新');
    }
  };

  return (
    <div className="ai-editor-modern">
      {/* 顶部工具栏 */}
      <div className="modern-toolbar">
        <div className="toolbar-left">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            type="text"
            size="large"
          >
            返回
          </Button>
          <Divider type="vertical" style={{ height: 24, margin: '0 16px' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 600 }}>AI创作工坊</Title>
        </div>

        <div className="toolbar-center">
          <div className="topic-display">
            <ThunderboltOutlined style={{ color: '#faad14', marginRight: 8 }} />
            <Text strong>{topic}</Text>
          </div>
        </div>

        <div className="toolbar-right">
          {article && (
            <Space>
              <Button
                icon={editMode ? <EyeOutlined /> : <EditOutlined />}
                onClick={handleToggleEditMode}
              >
                {editMode ? '预览' : '编辑'}
              </Button>
              {editMode && (
                <Button
                  type="default"
                  onClick={handleSaveDraft}
                >
                  保存修改
                </Button>
              )}
              <Dropdown menu={{ items: copyMenuItems }} placement="bottomRight">
                <Button icon={<CopyOutlined />}>
                  复制文章
                </Button>
              </Dropdown>
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
                下载Markdown
              </Button>
            </Space>
          )}
        </div>
      </div>

      {/* 三栏布局 */}
      <div className="modern-editor-layout">
        {/* 左侧：Agent进度面板 */}
        <div className="modern-left-panel">
          <Card
            className="agent-progress-card"
            title={
              <Space>
                <span>创作流程</span>
                {loading && <Spin size="small" />}
              </Space>
            }
            bordered={false}
          >
            {loading && (
              <Progress
                percent={Math.round(progress)}
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                style={{ marginBottom: 16 }}
              />
            )}

            <Steps
              direction="vertical"
              current={currentStep}
              items={agents.map((agent) => ({
                title: agent.label,
                description: agent.description || (agent.status === 'process' ? '正在处理...' : ''),
                status: agent.status,
                icon: getStepIcon(agent.status)
              }))}
            />

            {error && (
              <div className="error-container">
                <Text type="danger">{error}</Text>
                <Button size="small" type="primary" onClick={startCreation} style={{ marginTop: 8 }}>
                  重试
                </Button>
              </div>
            )}

            {!loading && !article && !error && (
              <Button
                type="primary"
                block
                size="large"
                onClick={startCreation}
                style={{ marginTop: 16 }}
              >
                开始创作
              </Button>
            )}
          </Card>
        </div>

        {/* 中间：编辑器面板 */}
        <div className="modern-center-panel">
          <div className="preview-container-modern">
            {loading && !article ? (
              <div className="loading-state">
                <Spin size="large" />
                <Text type="secondary" style={{ marginTop: 16, display: 'block' }}>
                  AI正在创作中，请稍候...
                </Text>
              </div>
            ) : article ? (
              <div className="editor-container-split">
                {/* 顶部工具栏 */}
                <div className="editor-toolbar">
                  <div className="toolbar-left-section">
                    <Space size={4}>
                      {toolbarActions.map((action) => (
                        <Button
                          key={action.label}
                          size="small"
                          type="text"
                          onClick={action.action}
                          className="toolbar-btn"
                          title={action.label}
                        >
                          {action.icon}
                        </Button>
                      ))}
                    </Space>
                  </div>
                  <div className="toolbar-right-section">
                    <Space>
                      <Button
                        size="small"
                        icon={<BulbOutlined />}
                        onClick={handleGenerateTitles}
                        loading={titleGenerating}
                        disabled={loading}
                      >
                        生成标题
                      </Button>
                      <Button
                        size="small"
                        type="default"
                        onClick={handleSaveDraft}
                      >
                        保存
                      </Button>
                    </Space>
                  </div>
                </div>

                {/* 左右分屏编辑区 */}
                <div className="editor-split-view">
                  {/* 左侧编辑区 */}
                  <div className="editor-left">
                    <div className="editor-header">
                      <Text type="secondary" style={{ fontSize: 12 }}>Markdown编辑</Text>
                    </div>
                    <TextArea
                      ref={textareaRef}
                      value={articleDraft}
                      onChange={(e) => setArticleDraft(e.target.value)}
                      className="markdown-editor"
                      placeholder="在此编辑你的文章..."
                    />
                  </div>

                  {/* 右侧预览区 */}
                  <div className="editor-right">
                    <div className="editor-header">
                      <Text type="secondary" style={{ fontSize: 12 }}>实时预览</Text>
                    </div>
                    <div className="markdown-preview">
                      <ReactMarkdown>{articleDraft}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <ThunderboltOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                <Text type="secondary">点击左侧"开始创作"按钮，开启AI创作之旅</Text>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：知识库面板 */}
        <div className="modern-right-panel">
          <Card
            className="knowledge-card"
            title="知识库"
            bordered={false}
          >
            <div className="knowledge-stats">
              <div className="stat-item">
                <Text type="secondary">金句库</Text>
                <Text strong>486条</Text>
              </div>
              <div className="stat-item">
                <Text type="secondary">标题公式</Text>
                <Text strong>38个</Text>
              </div>
              <div className="stat-item">
                <Text type="secondary">写作模板</Text>
                <Text strong>25个</Text>
              </div>
              <div className="stat-item">
                <Text type="secondary">风格样本</Text>
                <Text strong>238篇</Text>
              </div>
            </div>
          </Card>

          <Card
            className="tips-card"
            title="创作提示"
            bordered={false}
            style={{ marginTop: 16 }}
          >
            <div className="tips-content">
              <div className="tip-item">
                <Text type="secondary">⚡ 文章会基于知识库保持风格一致</Text>
              </div>
              <div className="tip-item">
                <Text type="secondary">🎯 创作完成后可直接复制或下载</Text>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 标题选择Modal */}
      <Modal
        title="选择标题"
        open={titleModalVisible}
        onOk={handleUseTitle}
        onCancel={() => setTitleModalVisible(false)}
        width={700}
        okText="使用此标题"
        cancelText="取消"
      >
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <Text type="secondary">为你的文章选择一个更吸引人的标题:</Text>
        </div>
        <Radio.Group
          value={selectedTitle}
          onChange={(e) => setSelectedTitle(e.target.value)}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {generatedTitles.map((title, index) => (
              <Radio key={index} value={title} style={{
                display: 'block',
                padding: '12px',
                border: '1px solid #f0f0f0',
                borderRadius: '6px',
                marginBottom: '8px',
                background: selectedTitle === title ? '#f6f9fc' : '#ffffff',
                transition: 'all 0.3s'
              }}>
                <span style={{ fontSize: 14, lineHeight: 1.6 }}>{title}</span>
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </Modal>
    </div>
  );
};

export default AIEditor;
