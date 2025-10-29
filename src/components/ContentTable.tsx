import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Button, Space, message, Tooltip } from 'antd';
import { EyeOutlined, LinkOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ContentItem } from '../types';
import { formatNumber, copyToClipboard } from '../utils';
import './ContentTable.css';

interface ContentTableProps {
  data: ContentItem[];
  loading: boolean;
  total: number;
  current: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}

const ContentTable: React.FC<ContentTableProps> = ({
  data,
  loading,
  total,
  current,
  pageSize,
  onPageChange
}) => {
  const navigate = useNavigate();

  const handleCopyLink = async (url: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      message.success('链接已复制到剪贴板');
    } else {
      message.error('复制失败');
    }
  };

  const handleView = (url: string) => {
    window.open(url, '_blank');
  };

  const handleStartCreate = (record: ContentItem) => {
    // 跳转到编辑器页面,携带热点信息
    navigate(`/editor?hotId=${record.gid}&title=${encodeURIComponent(record.title)}`);
  };

  const columns: ColumnsType<ContentItem> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: '30%',
      render: (text: string, record: ContentItem) => (
        <div className="title-cell">
          <Tooltip title={text} placement="topLeft">
            <div className="title-text">{text}</div>
          </Tooltip>
          {record.keywords && record.keywords.length > 0 && (
            <div className="keywords-wrapper">
              <span className="keywords-label">关键词:</span>
              {record.keywords.map((keyword, index) => (
                <React.Fragment key={keyword}>
                  <Tag className="keyword-tag">{keyword}</Tag>
                  {index < record.keywords.length - 1 && <span className="keyword-separator">、</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      title: '作者',
      dataIndex: 'authorName',
      key: 'authorName',
      width: '8%',
      ellipsis: true,
      render: (text: string) => <span style={{ fontSize: '13px', color: '#262626' }}>{text}</span>
    },
    {
      title: '粉丝量',
      dataIndex: 'fans',
      key: 'fans',
      width: '7%',
      sorter: (a, b) => {
        const fansA = parseInt(a.fans.replace(/,/g, ''));
        const fansB = parseInt(b.fans.replace(/,/g, ''));
        return fansA - fansB;
      },
      showSorterTooltip: false,
      render: (text: string) => <span className="number-cell">{formatNumber(text)}</span>
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: '6%',
      render: (text: string) => <Tag className="platform-tag">{text}</Tag>
    },
    {
      title: '领域',
      dataIndex: 'category',
      key: 'category',
      width: '6%',
      render: (text: string) => <Tag className="category-tag">{text}</Tag>
    },
    {
      title: '阅读(播放)',
      dataIndex: 'readCnt',
      key: 'readCnt',
      width: '8%',
      sorter: (a, b) => {
        const readA = parseInt(a.readCnt.replace(/,/g, ''));
        const readB = parseInt(b.readCnt.replace(/,/g, ''));
        return readA - readB;
      },
      showSorterTooltip: false,
      render: (text: string) => <span className="number-cell">{formatNumber(text)}</span>
    },
    {
      title: '评论量',
      dataIndex: 'commentCnt',
      key: 'commentCnt',
      width: '6%',
      sorter: (a, b) => {
        const commentA = parseInt(a.commentCnt.replace(/,/g, ''));
        const commentB = parseInt(b.commentCnt.replace(/,/g, ''));
        return commentA - commentB;
      },
      showSorterTooltip: false,
      render: (text: string) => <span className="number-cell">{formatNumber(text)}</span>
    },
    {
      title: '点赞量',
      dataIndex: 'diggCnt',
      key: 'diggCnt',
      width: '6%',
      sorter: (a, b) => {
        const diggA = parseInt(a.diggCnt.replace(/,/g, ''));
        const diggB = parseInt(b.diggCnt.replace(/,/g, ''));
        return diggA - diggB;
      },
      showSorterTooltip: false,
      render: (text: string) => <span className="number-cell">{formatNumber(text)}</span>
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      key: 'publishTime',
      width: '10%',
      sorter: (a, b) => {
        const timeA = new Date(a.publishTime).getTime();
        const timeB = new Date(b.publishTime).getTime();
        return timeA - timeB;
      },
      showSorterTooltip: false,
      render: (text: string) => <span className="time-cell">{text}</span>
    },
    {
      title: '操作',
      key: 'action',
      width: '17%',
      render: (_: any, record: ContentItem) => (
        <Space size="small" wrap>
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => handleStartCreate(record)}>
            开始创作
          </Button>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record.url)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => handleCopyLink(record.url)}>
            复制链接
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Table
      className="content-table"
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="gid"
      pagination={{
        current,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
        onChange: onPageChange
      }}
    />
  );
};

export default ContentTable;
