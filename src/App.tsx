import React, { useState } from 'react';
import { Layout, Menu, ConfigProvider } from 'antd';
import {
  FireOutlined,
  FolderOutlined,
  EditOutlined,
  FolderOpenOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  WechatOutlined,
  TeamOutlined,
  BulbFilled,
  TagOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import ContentListPage from './pages/ContentListPage';
import './App.css';

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

// 占位页面组件
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    fontSize: '18px',
    color: '#495057'
  }}>
    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
    <div>{title}</div>
    <div style={{ fontSize: '14px', marginTop: '8px' }}>功能开发中...</div>
  </div>
);

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('discover');

  // 主题配置 - 固定为浅色主题
  const themeConfig = {
    token: {
      colorPrimary: '#228be6',
      colorBgContainer: '#ffffff',
      colorBorder: '#dee2e6',
      colorText: '#212529',
      colorTextSecondary: '#495057',
      colorBgElevated: '#ffffff',
      borderRadius: 8,
      fontSize: 14,
    },
    components: {
      Layout: {
        headerBg: '#ffffff',
        siderBg: '#ffffff',
        bodyBg: '#f8f9fa',
      },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: '#228be6',
        itemSelectedColor: '#ffffff',
        itemHoverBg: '#f8f9fa',
        itemHoverColor: '#212529',
        itemColor: '#495057',
      },
      Button: {
        primaryColor: '#ffffff',
      },
      Radio: {
        buttonSolidCheckedBg: '#228be6',
        buttonSolidCheckedColor: '#ffffff',
        colorPrimary: '#228be6',
      },
      Table: {
        colorText: '#212529',
        colorTextHeading: '#212529',
        headerBg: '#f8f9fa',
      },
    },
  };

  const menuItems: MenuItem[] = [
    {
      key: 'workflow-group',
      label: '工作流',
      type: 'group',
    },
    {
      key: 'discover',
      icon: <FireOutlined />,
      label: '发现热点',
    },
    {
      key: 'inspiration',
      icon: <FolderOutlined />,
      label: '灵感库',
    },
    {
      key: 'creating',
      icon: <EditOutlined />,
      label: '创作中',
    },
    {
      key: 'works',
      icon: <FolderOpenOutlined />,
      label: '作品库',
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: '数据分析',
    },
    {
      type: 'divider',
    },
    {
      key: 'account-group',
      label: '账号管理',
      type: 'group',
    },
    {
      key: 'toutiao-accounts',
      icon: <ThunderboltOutlined />,
      label: '今日头条',
    },
    {
      key: 'wechat-accounts',
      icon: <WechatOutlined />,
      label: '公众号',
    },
    {
      type: 'divider',
    },
    {
      key: 'knowledge-group',
      label: '知识库',
      type: 'group',
    },
    {
      key: 'author-library',
      icon: <TeamOutlined />,
      label: '作者库',
    },
    {
      key: 'golden-sentences',
      icon: <BulbFilled />,
      label: '金句库',
    },
    {
      key: 'title-formulas',
      icon: <TagOutlined />,
      label: '标题公式',
    },
    {
      key: 'content-templates',
      icon: <FileTextOutlined />,
      label: '内容模板',
    },
  ];

  const handleMenuClick = (e: { key: string }) => {
    setSelectedKey(e.key);
  };

  const renderContent = () => {
    switch (selectedKey) {
      case 'discover':
        return <ContentListPage key="discover-hot" postType={3} />;
      case 'inspiration':
        return <PlaceholderPage title="灵感库" />;
      case 'creating':
        return <PlaceholderPage title="创作中" />;
      case 'works':
        return <PlaceholderPage title="作品库" />;
      case 'analytics':
        return <PlaceholderPage title="数据分析" />;
      case 'toutiao-accounts':
        return <PlaceholderPage title="今日头条账号管理" />;
      case 'wechat-accounts':
        return <PlaceholderPage title="公众号账号管理" />;
      case 'author-library':
        return <PlaceholderPage title="作者库" />;
      case 'golden-sentences':
        return <PlaceholderPage title="金句库" />;
      case 'title-formulas':
        return <PlaceholderPage title="标题公式" />;
      case 'content-templates':
        return <PlaceholderPage title="内容模板" />;
      default:
        return <ContentListPage key="discover-hot" postType={3} />;
    }
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <Layout className="app-layout">
        {/* 顶部导航栏 */}
        <Header className="top-navbar">
          <div className="navbar-content">
            <div className="navbar-logo">
              <FireOutlined className="logo-icon" />
              <span className="logo-text">热门素材管理平台</span>
            </div>
          </div>
        </Header>

        {/* 主体布局 */}
        <Layout className="main-layout">
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            className="app-sider"
            width={220}
          >
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
              onClick={handleMenuClick}
              className="sidebar-menu"
            />
          </Sider>
          <Content className="app-content">
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
