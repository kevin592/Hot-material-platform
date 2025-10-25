import React, { useState } from 'react';
import { Radio, Button, DatePicker, Space, Select, Row, Col, Card, Divider } from 'antd';
import { ReloadOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import type { FilterParams } from '../types';
import {
  PLATFORMS,
  CONTENT_TYPES,
  CATEGORIES,
  FANS_LIMITS,
  TIME_RANGES
} from '../types';
import dayjs from 'dayjs';
import './FilterPanel.css';

const { RangePicker } = DatePicker;

interface FilterPanelProps {
  postType: number; // 3=低粉爆款
  filters: FilterParams;
  onChange: (filters: FilterParams) => void;
  onReset: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  onReset
}) => {
  const [expanded, setExpanded] = useState(false);
  const handlePlatformChange = (e: any) => {
    onChange({ ...filters, platform: e.target.value });
  };

  const handleContentTypeChange = (e: any) => {
    onChange({ ...filters, contentType: e.target.value });
  };

  const handleCategoryChange = (checkedValues: any) => {
    let newCategories = checkedValues;

    // 如果选中了"全部"，则清空其他选项
    if (checkedValues.includes('全部') && !filters.categories?.includes('全部')) {
      newCategories = ['全部'];
    }
    // 如果之前选中了"全部"，现在选中了其他选项，则取消"全部"
    else if (filters.categories?.includes('全部') && checkedValues.length > 1) {
      newCategories = checkedValues.filter((c: string) => c !== '全部');
    }
    // 如果取消了所有选项，默认选中"全部"
    else if (checkedValues.length === 0) {
      newCategories = ['全部'];
    }

    onChange({ ...filters, categories: newCategories });
  };

  const handleFansLimitChange = (e: any) => {
    onChange({ ...filters, fansLimit: e.target.value });
  };

  const handleTimeRangeChange = (e: any) => {
    onChange({ ...filters, timeRange: e.target.value, customTimeRange: undefined });
  };

  const handleCustomTimeChange = (dates: any) => {
    if (dates) {
      onChange({
        ...filters,
        customTimeRange: [
          dates[0].format('YYYY-MM-DD HH:mm:ss'),
          dates[1].format('YYYY-MM-DD HH:mm:ss')
        ],
        timeRange: undefined
      });
    } else {
      onChange({ ...filters, customTimeRange: undefined });
    }
  };

  // 根据 postType 决定显示的平台选项
  // postType 3=低粉爆款(不包含公众号)
  const platformOptions = PLATFORMS.filter(p => p !== '公众号');

  // 将分类转换为 Select 选项
  const categoryOptions = CATEGORIES.map(cat => ({ label: cat, value: cat }));

  return (
    <div className="filter-panel">
      <Card bordered={false} className="filter-card">
        {/* 筛选头部 - 常用筛选(始终可见) */}
        <div className="filter-header">
          <Row gutter={[16, 12]} style={{ flex: 1 }}>
            <Col span={12}>
              <div className="filter-item">
                <div className="filter-label">平台</div>
                <Radio.Group value={filters.platform} onChange={handlePlatformChange} buttonStyle="solid" size="small">
                  {platformOptions.map(platform => (
                    <Radio.Button key={platform} value={platform}>{platform}</Radio.Button>
                  ))}
                </Radio.Group>
              </div>
            </Col>
            <Col span={12}>
              <div className="filter-item">
                <div className="filter-label">类型</div>
                <Radio.Group value={filters.contentType} onChange={handleContentTypeChange} buttonStyle="solid" size="small">
                  {CONTENT_TYPES.map(type => (
                    <Radio.Button key={type} value={type}>{type}</Radio.Button>
                  ))}
                </Radio.Group>
              </div>
            </Col>
          </Row>

          <Button
            className="toggle-btn"
            onClick={() => setExpanded(!expanded)}
            icon={expanded ? <UpOutlined /> : <DownOutlined />}
            size="small"
          >
            {expanded ? '收起筛选' : '展开更多筛选'}
          </Button>
        </div>

        {/* 可折叠的高级筛选区域 */}
        <div className={`filter-content ${expanded ? 'expanded' : ''}`}>
          <Row gutter={[16, 12]}>
            {/* 内容领域 */}
            <Col span={24}>
              <div className="filter-item">
                <div className="filter-label">内容领域</div>
                <Select
                  mode="multiple"
                  value={filters.categories}
                  onChange={handleCategoryChange}
                  options={categoryOptions}
                  placeholder="选择内容领域"
                  style={{ width: '100%' }}
                  maxTagCount={8}
                  allowClear
                  size="small"
                />
              </div>
            </Col>

            {/* 粉丝量 */}
            <Col span={12}>
              <div className="filter-item">
                <div className="filter-label">粉丝量</div>
                <Radio.Group value={filters.fansLimit} onChange={handleFansLimitChange} buttonStyle="solid" size="small">
                  {FANS_LIMITS.map(item => (
                    <Radio.Button key={item.value} value={item.value}>{item.label}</Radio.Button>
                  ))}
                </Radio.Group>
              </div>
            </Col>

            {/* 发布时间 */}
            <Col span={12}>
              <div className="filter-item">
                <div className="filter-label">发布时间</div>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Radio.Group value={filters.timeRange} onChange={handleTimeRangeChange} buttonStyle="solid" size="small">
                    {TIME_RANGES.map(item => (
                      <Radio.Button key={item.value} value={item.value}>{item.label}</Radio.Button>
                    ))}
                  </Radio.Group>
                  <RangePicker
                    showTime
                    value={filters.customTimeRange ? [
                      dayjs(filters.customTimeRange[0]),
                      dayjs(filters.customTimeRange[1])
                    ] : null}
                    onChange={handleCustomTimeChange}
                    placeholder={['开始日期', '结束日期']}
                    style={{ width: '100%' }}
                    size="small"
                  />
                </Space>
              </div>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          {/* 操作按钮 */}
          <Space size="small">
            <Button icon={<ReloadOutlined />} onClick={onReset} size="small">重置</Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default FilterPanel;
