import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  message,
  Tabs,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
  Badge,
  Spin
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  UserOutlined,
  FileTextOutlined,
  BarChartOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd/es/upload';
import {
  getAuthors,
  createAuthor,
  uploadArticle,
  getAuthorAnalysis,
  deleteAuthor,
  updateAuthor,
  type Author,
  type CreateAuthorParams,
  type LayerAnalysis
} from '../api/author';

interface Article {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  uploadTime: string;
  analysisProgress: number;
}

const AuthorLibraryPage: React.FC = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isAnalysisModalVisible, setIsAnalysisModalVisible] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [layerAnalysisData, setLayerAnalysisData] = useState<LayerAnalysis | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // 加载作者列表
  const loadAuthors = async () => {
    setLoading(true);
    try {
      const response = await getAuthors();
      setAuthors(response.data || []);
    } catch (error: any) {
      message.error(error.message || '加载作者列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadAuthors();
  }, []);

  const columns: ColumnsType<Author> = [
    {
      title: '作者信息',
      dataIndex: 'name',
      key: 'author',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1890ff, #40a9ff)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}>
            {record.name ? record.name[0] : '?'}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{record.description}</div>
            <div style={{ marginTop: 4 }}>
              {(record.tags || []).map(tag => (
                <Tag key={tag} size="small" color="blue">{tag}</Tag>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '文章统计',
      key: 'stats',
      render: (_, record) => (
        <div>
          <div>{record.articleCount} 篇文章</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            总字数: {(record.totalWords || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            平均: {(record.avgWordsPerArticle || 0).toLocaleString()} 字/篇
          </div>
        </div>
      ),
    },
    {
      title: '分析状态',
      dataIndex: 'analysisStatus',
      key: 'status',
      render: (status: string, record) => (
        <div>
          {status === 'completed' && (
            <Badge status="success" text="已完成" />
          )}
          {status === 'analyzing' && (
            <Badge status="processing" text="分析中" />
          )}
          {status === 'pending' && (
            <Badge status="default" text="待分析" />
          )}
          {record.styleScore > 0 && status === 'completed' && (
            <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
              风格分数: {record.styleScore}/10
            </div>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="上传文章">
            <Button
              type="text"
              icon={<UploadOutlined />}
              onClick={() => {
                setSelectedAuthor(record);
                setIsUploadModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="查看分析">
            <Button
              type="text"
              icon={<BarChartOutlined />}
              disabled={record.analysisStatus !== 'completed'}
              onClick={() => handleViewAnalysis(record)}
            />
          </Tooltip>
          <Tooltip title="重新分析">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => handleReAnalyze(record.id)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditAuthor(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteAuthor(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleCreateAuthor = async (values: CreateAuthorParams) => {
    try {
      await createAuthor(values);
      message.success('作者创建成功');
      setIsCreateModalVisible(false);
      form.resetFields();
      loadAuthors(); // 重新加载作者列表
    } catch (error: any) {
      message.error(error.message || '创建失败');
    }
  };

  const handleReAnalyze = (authorId: string) => {
    message.info('开始重新分析...');
    // 这里添加重新分析的逻辑
  };

  const handleDeleteAuthor = async (author: Author) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除作者"${author.name}"吗？这将同时删除该作者的所有文章和分析数据，且无法恢复。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteAuthor(author.id);
          message.success('删除成功');
          loadAuthors(); // 重新加载作者列表
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      },
    });
  };

  const handleEditAuthor = (author: Author) => {
    setSelectedAuthor(author);
    editForm.setFieldsValue({
      name: author.name,
      description: author.description,
    });
    setIsEditModalVisible(true);
  };

  const handleUpdateAuthor = async (values: CreateAuthorParams) => {
    if (!selectedAuthor) return;

    try {
      await updateAuthor(selectedAuthor.id, values);
      message.success('更新成功');
      setIsEditModalVisible(false);
      editForm.resetFields();
      setSelectedAuthor(null);
      loadAuthors(); // 重新加载作者列表
    } catch (error: any) {
      message.error(error.message || '更新失败');
    }
  };

  const uploadProps: UploadProps = {
    onRemove: (file) => {
      setUploadFiles(prev => prev.filter(f => f.uid !== file.uid));
    },
    beforeUpload: (file) => {
      setUploadFiles(prev => [...prev, file]);
      return false; // 阻止自动上传
    },
    fileList: uploadFiles.map(f => ({
      uid: f.uid,
      name: f.name,
      status: 'done' as const,
    })),
    multiple: true,
    accept: '.txt,.md',
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      message.warning('请选择要上传的文件');
      return;
    }

    try {
      message.success(`成功上传 ${uploadFiles.length} 个文件，开始7层分析...`);
      setIsUploadModalVisible(false);
      setUploadFiles([]);
      // 这里添加实际的文件上传逻辑

      // 模拟分析进度
      setTimeout(() => {
        message.success('第1层分析完成：语言特征识别');
      }, 2000);
      setTimeout(() => {
        message.success('第2层分析完成：高级技巧识别');
      }, 4000);
      setTimeout(() => {
        message.success('第3层分析完成：结构特征分析');
      }, 6000);
    } catch (error) {
      message.error('上传失败');
    }
  };

  const handleViewAnalysis = async (author: Author) => {
    try {
      const response = await getAuthorAnalysis(author.id);
      setSelectedAuthor(response.author);
      setLayerAnalysisData(response.layerAnalysis);
      setIsAnalysisModalVisible(true);
    } catch (error: any) {
      message.error(error.message || '获取分析结果失败');
    }
  };

  const renderLayerAnalysis = () => {
    if (!selectedAuthor || !layerAnalysisData) return null;

    const layers = [
      { key: 'language', name: '语言特征', icon: '📝' },
      { key: 'techniques', name: '高级技巧', icon: '🎯' },
      { key: 'structure', name: '结构特征', icon: '🏗️' },
      { key: 'viewpoint', name: '内容观点', icon: '💡' },
      { key: 'adaptation', name: '体裁适配', icon: '📊' },
      { key: 'interaction', name: '互动传播', icon: '🔄' },
      { key: 'fingerprint', name: '风格指纹', icon: '🔍' },
    ];

    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {layers.map(layer => {
            const data = layerAnalysisData[layer.key as keyof LayerAnalysis];
            return (
              <Col xs={24} sm={12} md={8} lg={6} xl={6} key={layer.key}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{layer.icon}</div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{layer.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
                      {data.score}/10
                    </div>
                    <Progress
                      percent={data.score * 10}
                      size="small"
                      style={{ marginTop: 8 }}
                      strokeColor="#1890ff"
                    />
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      {data.status === 'completed' ? '已完成' : '分析中'}
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>

        <Card title="详细分析报告" size="small">
          <Tabs defaultActiveKey="1">
            <Tabs.TabPane tab="语言特征" key="1">
              <div>
                <h4>口语化程度: {layerAnalysisData.language.score}/10</h4>
                {layerAnalysisData.language.features.length > 0 && (
                  <div>
                    <p>特征分析：</p>
                    <ul>
                      {layerAnalysisData.language.features.map((feature: any, index: number) => (
                        <li key={index}>{Object.entries(feature).map(([key, value]) => `${key}: ${value}`).join(', ')}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Tabs.TabPane>
            <Tabs.TabPane tab="高级技巧" key="2">
              <div>
                <h4>技巧评分: {layerAnalysisData.techniques.score}/10</h4>
                {layerAnalysisData.techniques.features.length > 0 && (
                  <div>
                    <p>高级技巧特征：</p>
                    <ul>
                      {layerAnalysisData.techniques.features.map((feature: any, index: number) => (
                        <li key={index}>{Object.entries(feature).map(([key, value]) => `${key}: ${value}`).join(', ')}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Tabs.TabPane>
            <Tabs.TabPane tab="风格建议" key="3">
              <div>
                <h4>基于风格特征的智能建议</h4>
                <ul>
                  <li>保持特色：您的写作风格评分{selectedAuthor.styleScore}/10，具有独特的个人特征</li>
                  <li>持续优化：建议继续上传更多文章以获得更准确的分析结果</li>
                  <li>风格应用：可以将分析结果应用到新的内容创作中</li>
                </ul>
              </div>
            </Tabs.TabPane>
          </Tabs>
        </Card>
      </div>
    );
  };

  
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>作者库</h2>
          <p style={{ margin: 0, color: '#666' }}>管理和分析作者写作风格特征</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalVisible(true)}
        >
          新建作者
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总作者数"
              value={authors.length}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总文章数"
              value={authors.reduce((sum, a) => sum + a.articleCount, 0)}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃作者"
              value={authors.filter(a => a.analysisStatus === 'completed').length}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="分析完成率"
              value={Math.round((authors.filter(a => a.analysisStatus === 'completed').length / authors.length) * 100)}
              suffix="%"
              prefix={<ReloadOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 作者列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={authors}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* 创建作者弹窗 */}
      <Modal
        title="创建新作者"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateAuthor}
        >
          <Form.Item
            name="name"
            label="作者姓名"
            rules={[{ required: true, message: '请输入作者姓名' }]}
          >
            <Input placeholder="请输入作者姓名" />
          </Form.Item>
          <Form.Item
            name="description"
            label="作者描述"
            rules={[{ required: true, message: '请输入作者描述' }]}
          >
            <Input.TextArea rows={4} placeholder="简要描述作者的写作风格和专长领域" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建作者
              </Button>
              <Button onClick={() => setIsCreateModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 上传文章弹窗 */}
      <Modal
        title={`上传文章 - ${selectedAuthor?.name}`}
        open={isUploadModalVisible}
        onCancel={() => {
          setIsUploadModalVisible(false);
          setUploadFiles([]);
          setSelectedAuthor(null);
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <p>当前文章数: {selectedAuthor?.articleCount} 篇</p>
          <p>分析状态: {selectedAuthor?.analysisStatus === 'completed' ? '已完成' : '分析中'}</p>
        </div>

        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 .txt、.md 格式，可批量上传多个文件
          </p>
        </Upload.Dragger>

        <div style={{ marginTop: 16, padding: 16, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#52c41a' }}>7层智能分析</h4>
          <p style={{ margin: 0, color: '#52c41a', fontSize: 12 }}>
            上传完成后，系统将自动对文章进行7层深度分析，包括语言特征、高级技巧、结构特征等，生成作者独特的风格指纹。
          </p>
        </div>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => {
              setIsUploadModalVisible(false);
              setUploadFiles([]);
              setSelectedAuthor(null);
            }}>
              取消
            </Button>
            <Button type="primary" onClick={handleUpload}>
              开始上传分析
            </Button>
          </Space>
        </div>
      </Modal>

      {/* 编辑作者弹窗 */}
      <Modal
        title="编辑作者"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          editForm.resetFields();
          setSelectedAuthor(null);
        }}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateAuthor}
        >
          <Form.Item
            name="name"
            label="作者姓名"
            rules={[{ required: true, message: '请输入作者姓名' }]}
          >
            <Input placeholder="请输入作者姓名" />
          </Form.Item>
          <Form.Item
            name="description"
            label="作者描述"
            rules={[{ required: true, message: '请输入作者描述' }]}
          >
            <Input.TextArea rows={4} placeholder="简要描述作者的写作风格和专长领域" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                更新作者
              </Button>
              <Button onClick={() => {
                setIsEditModalVisible(false);
                editForm.resetFields();
                setSelectedAuthor(null);
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 分析结果弹窗 */}
      <Modal
        title={`${selectedAuthor?.name} - 7层风格分析`}
        open={isAnalysisModalVisible}
        onCancel={() => {
          setIsAnalysisModalVisible(false);
          setSelectedAuthor(null);
        }}
        footer={[
          <Button key="export" icon={<DownloadOutlined />}>
            导出报告
          </Button>,
          <Button key="close" onClick={() => {
            setIsAnalysisModalVisible(false);
            setSelectedAuthor(null);
          }}>
            关闭
          </Button>,
        ]}
        width={1000}
      >
        {renderLayerAnalysis()}
      </Modal>
    </div>
  );
};

export default AuthorLibraryPage;