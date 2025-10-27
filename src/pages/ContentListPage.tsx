import React, { useState, useEffect } from 'react';
import { message, Empty, Button, Result } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import FilterPanel from '../components/FilterPanel';
import ContentTable from '../components/ContentTable';
import { searchHotContent } from '../api/request';
import type { FilterParams, ContentItem, SearchParams } from '../types';
import { getTimeRange } from '../utils';

interface ContentListPageProps {
  postType: number; // 3=低粉爆款
}

const ContentListPage: React.FC<ContentListPageProps> = ({ postType }) => {
  const [filters, setFilters] = useState<FilterParams>({
    platform: '今日头条',
    contentType: '短图文',
    categories: ['全部'],
    fansLimit: '',
    timeRange: '1d',
    sortBy: 1,
    searchWord: ''
  });

  const [data, setData] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchId, setSearchId] = useState('');
  const [error, setError] = useState<{ type: string; message: string } | null>(null);

  // 构建搜索参数
  const buildSearchParams = (): SearchParams => {
    const [startTime, endTime] = filters.customTimeRange || getTimeRange(filters.timeRange || '1d');

    // 处理分类
    const categories = filters.categories?.includes('全部') ? [] : (filters.categories || []);

    return {
      limit: pageSize,
      offset: (current - 1) * pageSize,
      postType,
      platforms: [filters.platform || '今日头条'],
      categories,
      searchWord: filters.searchWord || '',
      sortBy: filters.sortBy || 1,
      articleGenres: [filters.contentType || '短图文'],
      endTime,
      startTime,
      searchId,
      fansLimits: filters.fansLimit || '',
      videoDurationLimits: ''
    };
  };

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    setError(null); // 清除之前的错误
    try {
      const params = buildSearchParams();
      const response = await searchHotContent(params);
      setData(response.list);
      setTotal(response.total);
      setSearchId(response.searchId);
    } catch (error: any) {
      console.error('加载数据失败:', error);

      // 设置错误状态
      setError({
        type: error.type || 'unknown',
        message: error.message || '加载数据失败'
      });

      // 只在非网络错误时显示 message (网络错误已经在 axios 拦截器中提示过)
      if (error.type !== 'network') {
        message.error(error.message || '加载数据失败', 3);
      }
    } finally {
      setLoading(false);
    }
  };

  // 监听筛选条件变化
  useEffect(() => {
    setCurrent(1); // 重置页码
    loadData();
  }, [filters]);

  // 监听分页变化
  useEffect(() => {
    if (current > 1) {
      loadData();
    }
  }, [current, pageSize]);

  const handleFilterChange = (newFilters: FilterParams) => {
    setFilters(newFilters);
  };

  const handleReset = () => {
    setFilters({
      platform: '今日头条',
      contentType: '短图文',
      categories: ['全部'],
      fansLimit: '',
      timeRange: '1d',
      sortBy: 1,
      searchWord: ''
    });
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setCurrent(page);
    setPageSize(pageSize);
  };

  return (
    <div>
      <FilterPanel
        postType={postType}
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
      />
      <div style={{
        padding: '16px',
        background: 'var(--bg-color)',
        marginTop: '8px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        transition: 'all 0.3s ease'
      }}>
        {error ? (
          // 错误状态展示
          <Result
            status={error.type === 'network' ? 'warning' : 'error'}
            title={error.type === 'network' ? '网络连接失败' : '加载失败'}
            subTitle={error.message}
            extra={
              <Button type="primary" icon={<ReloadOutlined />} onClick={loadData}>
                重新加载
              </Button>
            }
          />
        ) : data.length === 0 && !loading ? (
          // 空状态展示
          <Empty
            description="暂无数据"
            style={{ padding: '60px 0' }}
          >
            <Button type="primary" onClick={loadData}>
              刷新数据
            </Button>
          </Empty>
        ) : (
          // 正常数据展示
          <ContentTable
            data={data}
            loading={loading}
            total={total}
            current={current}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};

export default ContentListPage;
