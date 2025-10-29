import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Modal, Input, Select, message, Tabs, Checkbox, Drawer } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getTitles, analyzeTitle, approveTitle, getElements, deleteTitle, updateTitle } from '../api/titleLibrary';
import type { TitleItem, Element, TitleElement } from '../types';
import './TitleLibraryPage.css';

const { TextArea } = Input;

const TitleLibraryPage: React.FC = () => {
  // 状态
  const [activeTab, setActiveTab] = useState('library');
  const [titles, setTitles] = useState<TitleItem[]>([]);
  const [elements, setElements] = useState<Element[]>([]);
  const [loading, setLoading] = useState(false);

  // 模态框
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  // 表单
  const [newTitle, setNewTitle] = useState('');
  const [newSource, setNewSource] = useState('今日头条');

  // 审核中的标题
  const [reviewingTitle, setReviewingTitle] = useState<TitleItem | null>(null);
  const [editedPsychology, setEditedPsychology] = useState('');
  const [editedElements, setEditedElements] = useState<TitleElement[]>([]);
  const [editedRoutine, setEditedRoutine] = useState('');
  const [editedScenario, setEditedScenario] = useState('');

  // 审核流程状态 (step1: 快速决策, step2: 修改内容, step3: 补充信息)
  const [reviewStep, setReviewStep] = useState<'step1' | 'step2' | 'step3'>('step1');
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  // 筛选
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedElements, setSelectedElements] = useState<number[]>([]);

  // 批量选择标题
  const [selectedTitles, setSelectedTitles] = useState<number[]>([]);

  // 详情抽屉
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [detailTitle, setDetailTitle] = useState<TitleItem | null>(null);

  // 编辑标题Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTitle, setEditingTitle] = useState<TitleItem | null>(null);

  // 工具函数: 高亮关键词
  const highlightKeywords = (text: string) => {
    // 匹配引号内的内容、数字+单位、特殊词汇
    const patterns = [
      /"([^"]+)"/g,  // 引号内容
      /「([^」]+)」/g, // 书名号内容
      /\d+[个天月年%]/g, // 数字+单位
      /(快速|立即|马上|迅速|瞬间|普通人|新手|小白|宝妈|月薪\d+)/g // 特定词汇
    ];

    let result = text;
    let matches: Array<{start: number, end: number, text: string}> = [];

    // 收集所有匹配位置
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1] || match[0]
        });
      }
    });

    // 按位置排序并去重重叠部分
    matches.sort((a, b) => a.start - b.start);
    const filtered = matches.filter((m, i) => {
      if (i === 0) return true;
      return m.start >= matches[i-1].end;
    });

    // 构建React元素数组
    if (filtered.length === 0) return text;

    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    filtered.forEach((match, i) => {
      // 添加之前的普通文本
      if (match.start > lastEnd) {
        parts.push(text.substring(lastEnd, match.start));
      }
      // 添加高亮的关键词
      parts.push(
        <span key={i} style={{
          color: '#1c7ed6',
          fontWeight: 500,
          background: 'rgba(34, 139, 230, 0.08)',
          padding: '0 3px',
          borderRadius: '2px'
        }}>
          {text.substring(match.start, match.end)}
        </span>
      );
      lastEnd = match.end;
    });

    // 添加最后的普通文本
    if (lastEnd < text.length) {
      parts.push(text.substring(lastEnd));
    }

    return <>{parts}</>;
  };

  // 加载数据
  const loadTitles = async () => {
    try {
      setLoading(true);
      const response = await getTitles({ status: statusFilter === 'all' ? undefined : statusFilter });
      setTitles(response.data.list);
    } catch (error: any) {
      message.error('加载失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const loadElements = async () => {
    try {
      const response = await getElements();
      setElements(response.data.list);
    } catch (error: any) {
      message.error('加载元素库失败');
    }
  };

  useEffect(() => {
    if (activeTab === 'library') {
      loadTitles();
    } else {
      loadElements();
    }
  }, [activeTab, statusFilter]);

  // 添加标题
  const handleAddTitle = async () => {
    if (!newTitle.trim()) {
      message.error('请输入标题');
      return;
    }

    try {
      setLoading(true);
      const response = await analyzeTitle({ title: newTitle, source: newSource });
      message.success('AI分析完成,已添加到待审核列表');
      setAddModalVisible(false);
      setNewTitle('');
      setNewSource('今日头条');
      loadTitles();
    } catch (error: any) {
      message.error('分析失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 打开审核Modal
  const handleReview = (title: TitleItem) => {
    setReviewingTitle(title);
    setEditedPsychology(title.psychology.join('\n'));
    setEditedElements(title.elements);
    setEditedRoutine(title.routine);
    setEditedScenario(title.scenario);
    setReviewStep('step1'); // 重置为第一步
    setShowMoreInfo(false); // 重置展开状态
    setReviewModalVisible(true);
  };

  // 重新分析标题
  const handleReanalyze = async () => {
    if (!reviewingTitle) return;

    try {
      setLoading(true);
      const response = await analyzeTitle({
        title: reviewingTitle.title,
        source: reviewingTitle.source
      });

      // 更新编辑框内容
      setEditedPsychology(response.data.psychology.join('\n'));
      setEditedElements(response.data.elements);
      setEditedRoutine(response.data.routine);
      setEditedScenario(response.data.scenario);

      message.success('重新分析完成');
    } catch (error: any) {
      message.error('重新分析失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 保存到标题库
  const handleSaveToLibrary = async () => {
    if (!reviewingTitle) return;

    try {
      setLoading(true);
      await approveTitle(reviewingTitle.id, {
        psychology: editedPsychology.split('\n').filter(p => p.trim()),
        elements: editedElements,
        routine: editedRoutine,
        scenario: editedScenario
      });
      message.success('已保存到标题库');
      setReviewModalVisible(false);
      loadTitles();
    } catch (error: any) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 快速通过审核
  const handleQuickApprove = async () => {
    if (!reviewingTitle) return;

    try {
      setLoading(true);
      await approveTitle(reviewingTitle.id, {
        psychology: editedPsychology.split('\n').filter(p => p.trim()),
        elements: editedElements,
        routine: editedRoutine,
        scenario: editedScenario
      });
      message.success('审核通过,已保存到标题库');
      setReviewModalVisible(false);
      loadTitles();
    } catch (error: any) {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 拒绝标题
  const handleReject = async () => {
    if (!reviewingTitle) return;

    Modal.confirm({
      title: '确认拒绝',
      content: '确定要拒绝这个标题吗?此操作将删除该标题。',
      onOk: async () => {
        try {
          await deleteTitle(reviewingTitle.id);
          message.success('已拒绝并删除');
          setReviewModalVisible(false);
          loadTitles();
        } catch (error: any) {
          message.error('操作失败');
        }
      }
    });
  };

  // 批量删除标题
  const handleBatchDelete = async () => {
    if (selectedTitles.length === 0) {
      message.warning('请先选择要删除的标题');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedTitles.length} 个标题吗?此操作不可恢复。`,
      onOk: async () => {
        try {
          setLoading(true);
          await Promise.all(selectedTitles.map(id => deleteTitle(id)));
          message.success(`成功删除 ${selectedTitles.length} 个标题`);
          setSelectedTitles([]);
          loadTitles();
        } catch (error: any) {
          message.error('批量删除失败: ' + (error.message || '未知错误'));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // 批量导出标题
  const handleBatchExport = () => {
    if (selectedTitles.length === 0) {
      message.warning('请先选择要导出的标题');
      return;
    }

    const selectedData = titles.filter(t => selectedTitles.includes(t.id));
    const exportText = selectedData.map(t => `${t.title}\t${t.source}\t${t.routine}`).join('\n');

    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `标题库导出_${new Date().toISOString().slice(0,10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    message.success(`成功导出 ${selectedTitles.length} 个标题`);
  };

  // 单个删除标题
  const handleDeleteTitle = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个标题吗?此操作不可恢复。',
      onOk: async () => {
        try {
          await deleteTitle(id);
          message.success('删除成功');
          loadTitles();
        } catch (error: any) {
          message.error('删除失败: ' + (error.message || '未知错误'));
        }
      }
    });
  };

  // 重新分析编辑中的标题
  const handleReanalyzeEdit = async () => {
    if (!editingTitle) return;
    try {
      setLoading(true);
      const response = await analyzeTitle({
        title: editingTitle.title,
        source: editingTitle.source
      });
      setEditedPsychology(response.data.psychology.join('\n'));
      setEditedElements(response.data.elements);
      setEditedRoutine(response.data.routine);
      setEditedScenario(response.data.scenario);
      message.success('重新分析完成');
    } catch (error: any) {
      message.error('重新分析失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 编辑标题
  const handleEditTitle = (title: TitleItem) => {
    setEditingTitle(title);
    setEditedPsychology(title.psychology.join('\n'));
    setEditedElements(title.elements);
    setEditedRoutine(title.routine);
    setEditedScenario(title.scenario);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTitle) return;

    try {
      setLoading(true);
      await updateTitle(editingTitle.id, {
        psychology: editedPsychology.split('\n').filter(p => p.trim()),
        elements: editedElements,
        routine: editedRoutine,
        scenario: editedScenario
      });
      message.success('保存成功');
      setEditModalVisible(false);
      loadTitles();
    } catch (error: any) {
      message.error('保存失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 批量选择处理
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTitles(titles.map(t => t.id));
    } else {
      setSelectedTitles([]);
    }
  };

  const handleSelectTitle = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedTitles([...selectedTitles, id]);
    } else {
      setSelectedTitles(selectedTitles.filter(tid => tid !== id));
    }
  };

  // 标题库表格列
  const titleColumns: ColumnsType<TitleItem> = [
    {
      title: <Checkbox
        checked={titles.length > 0 && selectedTitles.length === titles.length}
        indeterminate={selectedTitles.length > 0 && selectedTitles.length < titles.length}
        onChange={(e) => handleSelectAll(e.target.checked)}
      />,
      width: 50,
      render: (_, record) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedTitles.includes(record.id)}
            onChange={(e) => handleSelectTitle(record.id, e.target.checked)}
          />
        </div>
      )
    },
    {
      title: '标题',
      width: '30%',
      render: (_, record) => (
        <div style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.5 }}>{record.title}</div>
      )
    },
    {
      title: '为什么会点击',
      width: '28%',
      render: (_, record) => (
        <div style={{ fontSize: 13, color: '#495057', lineHeight: 1.6 }}>
          {record.psychology && record.psychology.length > 0
            ? record.psychology[0]
            : '-'}
        </div>
      )
    },
    {
      title: '核心套路',
      width: '20%',
      render: (_, record) => (
        <div style={{ fontSize: 13, color: '#495057', lineHeight: 1.6 }}>
          {record.routine || '-'}
        </div>
      )
    },
    {
      title: '操作',
      width: '17%',
      render: (_, record) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button
            size="small"
            type="link"
            onClick={() => {
              setDetailTitle(record);
              setDetailDrawerVisible(true);
            }}
          >
            查看详情
          </Button>
          {record.status === 'pending' ? (
            <Button type="primary" size="small" onClick={() => handleReview(record)}>
              审核
            </Button>
          ) : (
            <>
              <Button size="small" onClick={() => handleEditTitle(record)}>
                编辑
              </Button>
              <Button size="small" danger onClick={() => handleDeleteTitle(record.id)}>
                删除
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  // 元素库表格列
  const elementColumns: ColumnsType<Element> = [
    {
      title: '元素',
      width: '20%',
      render: (_, record) => (
        <div style={{ fontWeight: 600, fontSize: 14 }}>{record.text}</div>
      )
    },
    {
      title: '分类',
      width: '15%',
      render: (_, record) => (
        <Tag color="blue" style={{ fontSize: 11 }}>{record.category}</Tag>
      )
    },
    {
      title: '说明',
      width: '45%',
      render: (_, record) => (
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>{record.explain}</div>
      )
    },
    {
      title: '使用',
      width: '10%',
      align: 'center',
      render: (_, record) => (
        <span style={{ fontSize: 12, color: '#868e96' }}>{record.usage}次</span>
      )
    },
    {
      title: '操作',
      width: '10%',
      align: 'center',
      render: (_, record) => {
        const isSelected = selectedElements.includes(record.id);
        return (
          <Button
            size="small"
            type={isSelected ? 'default' : 'primary'}
            onClick={() => {
              if (isSelected) {
                setSelectedElements(selectedElements.filter(id => id !== record.id));
              } else {
                setSelectedElements([...selectedElements, record.id]);
              }
            }}
          >
            {isSelected ? '取消' : '选择'}
          </Button>
        );
      }
    }
  ];

  return (
    <div className="title-library-page">
      {/* 页面头部 */}
      <div className="page-header">
        <div>
          <h1 className="page-title">爆款标题知识库</h1>
          <div className="page-subtitle">AI拆解标题 · 提取可复用元素 · 批量生成新标题</div>
        </div>
        <Button type="primary" onClick={() => setAddModalVisible(true)}>
          添加标题
        </Button>
      </div>

      {/* Tab切换 */}
      <div className="tabs-wrapper">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'library', label: `标题库 · ${titles.length}` },
            { key: 'elements', label: `元素库 · ${elements.length}` }
          ]}
        />
      </div>

      {/* 标题库Tab */}
      {activeTab === 'library' && (
        <div>
          {/* 批量操作栏 - 移到筛选栏上方 */}
          {selectedTitles.length > 0 && (
            <div className="batch-operations card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: '#1971c2' }}>已选 {selectedTitles.length} 个标题</span>
                <Space>
                  <Button size="small" onClick={() => setSelectedTitles([])}>取消选择</Button>
                  <Button size="small" onClick={handleBatchExport}>导出</Button>
                  <Button size="small" danger onClick={handleBatchDelete}>批量删除</Button>
                </Space>
              </div>
            </div>
          )}

          {/* 筛选栏 */}
          <div className="card" style={{ marginBottom: 24, padding: '16px 24px' }}>
            <Space size="middle">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 120 }}
                size="small"
              >
                <Select.Option value="all">全部状态</Select.Option>
                <Select.Option value="pending">待审核</Select.Option>
                <Select.Option value="approved">已通过</Select.Option>
              </Select>

              <Select style={{ width: 120 }} size="small" placeholder="全部领域">
                <Select.Option value="all">全部领域</Select.Option>
              </Select>

              <Select style={{ width: 120 }} size="small" placeholder="全部风格">
                <Select.Option value="all">全部风格</Select.Option>
              </Select>

              <Input placeholder="搜索标题..." style={{ width: 200 }} size="small" />

              <span style={{ fontSize: 13, color: '#868e96' }}>共 {titles.length} 条</span>
            </Space>
          </div>

          {/* 表格 */}
          <div className="card" style={{ padding: 0 }}>
            <Table
              columns={titleColumns}
              dataSource={titles}
              loading={loading}
              rowKey="id"
              pagination={false}
              onRow={(record) => ({
                onClick: () => {
                  setDetailTitle(record);
                  setDetailDrawerVisible(true);
                },
                style: { cursor: 'pointer' }
              })}
            />
          </div>
        </div>
      )}

      {/* 元素库Tab */}
      {activeTab === 'elements' && (
        <div style={{ display: 'flex', gap: 24 }}>
          {/* 左侧筛选 */}
          <div className="elements-sidebar">
            <div className="sidebar-header">筛选</div>

            <div style={{ marginBottom: 28 }}>
              <div className="filter-title">领域</div>
              <Space direction="vertical" size="small">
                <Checkbox>教程/技能</Checkbox>
                <Checkbox>副业/赚钱</Checkbox>
                <Checkbox>自媒体/涨粉</Checkbox>
                <Checkbox>育儿/教育</Checkbox>
              </Space>
            </div>

            <div>
              <div className="filter-title">心理效果</div>
              <Space direction="vertical" size="small">
                <Checkbox>降低门槛</Checkbox>
                <Checkbox>制造紧迫感</Checkbox>
                <Checkbox>增强可信度</Checkbox>
                <Checkbox>引发好奇</Checkbox>
                <Checkbox>击中人群</Checkbox>
                <Checkbox>制造对比</Checkbox>
                <Checkbox>承诺结果</Checkbox>
              </Space>
            </div>
          </div>

          {/* 右侧表格 */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#868e96' }}>
                显示 {elements.length} 个元素,共 {elements.length} 个
              </span>
              <Button size="small">清空筛选</Button>
            </div>

            <div className="card" style={{ padding: 0 }}>
              <Table
                columns={elementColumns}
                dataSource={elements}
                loading={loading}
                rowKey="id"
                pagination={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* 底部工具栏 - 元素库选择时显示 */}
      {selectedElements.length > 0 && activeTab === 'elements' && (
        <div className="bottom-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 600 }}>已选 {selectedElements.length} 个元素</span>
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              {selectedElements.map(id => {
                const el = elements.find(e => e.id === id);
                return el ? (
                  <Tag key={id} color="blue" closable onClose={() => {
                    setSelectedElements(selectedElements.filter(sid => sid !== id));
                  }}>
                    {el.text}
                  </Tag>
                ) : null;
              })}
            </div>
          </div>
          <Space>
            <Button onClick={() => setSelectedElements([])}>清空</Button>
            <Button type="primary">生成标题</Button>
          </Space>
        </div>
      )}

      {/* 添加标题Modal */}
      <Modal
        key="add-title-modal"
        title="添加标题"
        open={addModalVisible}
        onOk={handleAddTitle}
        onCancel={() => setAddModalVisible(false)}
        confirmLoading={loading}
        okText="提交AI分析"
        cancelText="取消"
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>标题文本 <span style={{ color: 'red' }}>*</span></div>
            <Input
              placeholder="输入爆款标题..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>来源 (可选)</div>
            <Select
              style={{ width: '100%' }}
              value={newSource}
              onChange={setNewSource}
            >
              <Select.Option value="今日头条">今日头条</Select.Option>
              <Select.Option value="抖音">抖音</Select.Option>
              <Select.Option value="小红书">小红书</Select.Option>
              <Select.Option value="公众号">公众号</Select.Option>
              <Select.Option value="知乎">知乎</Select.Option>
            </Select>
          </div>
        </Space>
      </Modal>

      {/* 审核Modal */}
      <Modal
        title={
          reviewStep === 'step1' ? '审核标题' :
          reviewStep === 'step2' ? '修改AI分析' :
          '补充详细信息'
        }
        open={reviewModalVisible}
        onCancel={() => {
          setReviewModalVisible(false);
          setReviewStep('step1');
          setShowMoreInfo(false);
        }}
        width={reviewStep === 'step1' ? 700 : 900}
        footer={null}
        destroyOnClose
      >
        {reviewingTitle && (
          <div>
            {/* Step 1: 快速决策 */}
            {reviewStep === 'step1' && (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* 标题信息 */}
                <div style={{
                  background: '#f8f9fa',
                  padding: '20px 24px',
                  borderRadius: 8,
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ fontSize: 13, color: '#868e96', marginBottom: 8 }}>标题</div>
                  <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.5, marginBottom: 8 }}>
                    {reviewingTitle.title}
                  </div>
                  <div style={{ fontSize: 13, color: '#868e96' }}>
                    来源: {reviewingTitle.source}
                  </div>
                </div>

                {/* AI分析结果 */}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#212529' }}>
                    AI分析 - 为什么会点击
                  </div>
                  <div style={{
                    background: '#e7f5ff',
                    padding: '18px 22px',
                    borderRadius: 8,
                    borderLeft: '4px solid #228be6'
                  }}>
                    {reviewingTitle.psychology.map((item, idx) => (
                      <div key={idx} style={{
                        marginBottom: idx === reviewingTitle.psychology.length - 1 ? 0 : 14,
                        display: 'flex',
                        alignItems: 'flex-start'
                      }}>
                        <span style={{
                          color: '#228be6',
                          marginRight: 10,
                          fontSize: 18,
                          fontWeight: 700
                        }}>•</span>
                        <span style={{ fontSize: 14, lineHeight: 1.7, color: '#1971c2', fontWeight: 500 }}>
                          {highlightKeywords(item)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 决策按钮 */}
                <div style={{
                  display: 'flex',
                  gap: 12,
                  paddingTop: 12,
                  borderTop: '1px solid #dee2e6',
                  justifyContent: 'center'
                }}>
                  <Button
                    size="large"
                    type="primary"
                    onClick={handleQuickApprove}
                    loading={loading}
                    style={{ minWidth: 140, height: 44 }}
                  >
                    快速通过
                  </Button>
                  <Button
                    size="large"
                    onClick={() => setReviewStep('step2')}
                    style={{ minWidth: 140, height: 44 }}
                  >
                    需要修改
                  </Button>
                  <Button
                    size="large"
                    danger
                    onClick={handleReject}
                    style={{ minWidth: 140, height: 44 }}
                  >
                    拒绝
                  </Button>
                </div>
              </Space>
            )}

            {/* Step 2: 修改内容 */}
            {reviewStep === 'step2' && (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* 标题 */}
                <div style={{
                  background: '#f8f9fa',
                  padding: '16px 20px',
                  borderRadius: 8
                }}>
                  <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>
                    {reviewingTitle.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#868e96', marginTop: 4 }}>
                    来源: {reviewingTitle.source}
                  </div>
                </div>

                {/* 修改AI分析 */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#212529' }}>
                    修改AI分析 - 为什么会点击
                  </div>
                  <TextArea
                    rows={6}
                    value={editedPsychology}
                    onChange={(e) => setEditedPsychology(e.target.value)}
                    placeholder="每行一个要点..."
                    style={{ fontSize: 13 }}
                  />
                  <div style={{ fontSize: 12, color: '#868e96', marginTop: 6 }}>
                    提示: 每行一个要点,描述用户为什么会点击这个标题
                  </div>
                </div>

                {/* 展开更多 */}
                {!showMoreInfo && (
                  <Button
                    type="link"
                    onClick={() => setShowMoreInfo(true)}
                    style={{ padding: 0, height: 'auto' }}
                  >
                    展开填写核心套路和适用场景 →
                  </Button>
                )}

                {/* 补充信息 (展开后显示) */}
                {showMoreInfo && (
                  <>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#212529' }}>
                        核心套路 (选填)
                      </div>
                      <Input
                        value={editedRoutine}
                        onChange={(e) => setEditedRoutine(e.target.value)}
                        placeholder="例如: 数字+门槛+人群定位"
                        style={{ fontSize: 13 }}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#212529' }}>
                        适用场景说明 (选填)
                      </div>
                      <TextArea
                        rows={3}
                        value={editedScenario}
                        onChange={(e) => setEditedScenario(e.target.value)}
                        placeholder="描述这个标题适合在什么场景下使用..."
                        style={{ fontSize: 13 }}
                      />
                    </div>
                  </>
                )}

                {/* 操作按钮 */}
                <div style={{
                  display: 'flex',
                  gap: 12,
                  paddingTop: 12,
                  borderTop: '1px solid #dee2e6',
                  justifyContent: 'flex-end'
                }}>
                  <Button onClick={() => setReviewStep('step1')}>
                    上一步
                  </Button>
                  <Button onClick={handleReanalyze} loading={loading}>
                    重新分析
                  </Button>
                  <Button type="primary" onClick={handleSaveToLibrary} loading={loading}>
                    保存到标题库
                  </Button>
                </div>
              </Space>
            )}
          </div>
        )}
      </Modal>

      {/* 编辑标题Modal */}
      <Modal
        key={editingTitle?.id || 'edit-modal'}
        title="编辑标题"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingTitle(null);
        }}
        onOk={handleSaveEdit}
        okText="保存"
        cancelText="取消"
        confirmLoading={loading}
        width={900}
        destroyOnClose
      >
        {editingTitle && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 原始标题 */}
            <div className="review-section">
              <div className="section-title">标题</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                {editingTitle.title}
              </div>
              <div style={{ fontSize: 13, color: '#868e96' }}>
                来源: {editingTitle.source}
              </div>
            </div>

            {/* 重新分析按钮 */}
            <div>
              <Button onClick={handleReanalyzeEdit} loading={loading}>
                重新分析
              </Button>
            </div>

            {/* 为什么会点击 */}
            <div className="review-section">
              <div className="section-title">为什么会点击</div>
              <TextArea
                rows={6}
                value={editedPsychology}
                onChange={(e) => setEditedPsychology(e.target.value)}
              />
            </div>

            {/* 核心套路 */}
            <div className="review-section">
              <div className="section-title">核心套路</div>
              <Input
                value={editedRoutine}
                onChange={(e) => setEditedRoutine(e.target.value)}
              />
            </div>

            {/* 适用场景 */}
            <div className="review-section">
              <div className="section-title">适用场景说明</div>
              <TextArea
                rows={3}
                value={editedScenario}
                onChange={(e) => setEditedScenario(e.target.value)}
              />
            </div>
          </Space>
        )}
      </Modal>

      {/* 详情抽屉 */}
      <Drawer
        title="标题详情"
        placement="right"
        width={600}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
      >
        {detailTitle && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 标题信息 */}
            <div>
              <div style={{ fontSize: 12, color: '#868e96', marginBottom: 8 }}>标题</div>
              <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.5, marginBottom: 8 }}>
                {detailTitle.title}
              </div>
              <Space size="middle">
                <span style={{ fontSize: 13, color: '#868e96' }}>来源: {detailTitle.source}</span>
                {detailTitle.status === 'pending' && (
                  <Tag color="orange" style={{ fontSize: 11, fontWeight: 600 }}>待审核</Tag>
                )}
                {detailTitle.status === 'approved' && (
                  <Tag color="green" style={{ fontSize: 11 }}>已通过</Tag>
                )}
              </Space>
            </div>

            {/* 为什么会点击 */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#212529' }}>
                为什么会点击
              </div>
              <div style={{
                background: '#f8f9fa',
                padding: '16px 20px',
                borderRadius: 8,
                borderLeft: '3px solid #228be6'
              }}>
                {detailTitle.psychology.map((item, idx) => (
                  <div key={idx} style={{
                    marginBottom: idx === detailTitle.psychology.length - 1 ? 0 : 12,
                    display: 'flex',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{
                      color: '#228be6',
                      marginRight: 8,
                      fontSize: 16,
                      fontWeight: 600
                    }}>•</span>
                    <span style={{ fontSize: 14, lineHeight: 1.6, color: '#495057' }}>
                      {highlightKeywords(item)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 核心套路 */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#212529' }}>
                核心套路
              </div>
              <div style={{ fontSize: 14, color: '#495057', lineHeight: 1.6 }}>
                {detailTitle.routine || '暂无'}
              </div>
            </div>

            {/* 适用场景 */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#212529' }}>
                适用场景
              </div>
              <div style={{ fontSize: 14, color: '#495057', lineHeight: 1.6 }}>
                {detailTitle.scenario || '暂无'}
              </div>
            </div>

            {/* 相关元素 */}
            {detailTitle.elements && detailTitle.elements.length > 0 && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#212529' }}>
                  相关元素
                </div>
                <Space wrap>
                  {detailTitle.elements.map((el, idx) => (
                    <Tag key={idx} color="blue" style={{ padding: '4px 12px', fontSize: 13 }}>
                      {el.text}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {/* 操作按钮 */}
            <div style={{ borderTop: '1px solid #e9ecef', paddingTop: 20, marginTop: 12 }}>
              <Space>
                <Button onClick={async () => {
                  if (!detailTitle) return;
                  try {
                    setLoading(true);
                    const response = await analyzeTitle({
                      title: detailTitle.title,
                      source: detailTitle.source
                    });
                    // 更新detailTitle
                    const updatedTitle = {
                      ...detailTitle,
                      psychology: response.data.psychology,
                      elements: response.data.elements,
                      routine: response.data.routine,
                      scenario: response.data.scenario
                    };
                    setDetailTitle(updatedTitle);
                    message.success('重新分析完成');
                  } catch (error: any) {
                    message.error('重新分析失败: ' + (error.message || '未知错误'));
                  } finally {
                    setLoading(false);
                  }
                }} loading={loading}>
                  重新分析
                </Button>
                <Button onClick={() => {
                  setDetailDrawerVisible(false);
                  handleEditTitle(detailTitle);
                }}>
                  编辑
                </Button>
                {detailTitle.status === 'pending' && (
                  <Button type="primary" onClick={() => {
                    setDetailDrawerVisible(false);
                    handleReview(detailTitle);
                  }}>
                    审核
                  </Button>
                )}
                <Button danger onClick={() => {
                  setDetailDrawerVisible(false);
                  handleDeleteTitle(detailTitle.id);
                }}>
                  删除
                </Button>
              </Space>
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default TitleLibraryPage;
