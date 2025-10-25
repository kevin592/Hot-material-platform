import axios, { AxiosError } from 'axios';
import type { SearchParams, ApiResponse } from '../types';
import { message } from 'antd';

// 创建 axios 实例
const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 重试配置
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 判断是否应该重试
const shouldRetry = (error: AxiosError): boolean => {
  // 网络错误或超时错误才重试
  if (!error.response) {
    return true; // 网络错误
  }

  const status = error.response.status;
  // 5xx 服务器错误重试
  return status >= 500 && status < 600;
};

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { data } = response;
    if (data.code === 0) {
      return data;
    } else {
      // 业务错误
      const error: any = new Error(data.message || '请求失败');
      error.type = 'business';
      error.code = data.code;
      return Promise.reject(error);
    }
  },
  async (error: AxiosError) => {
    const config: any = error.config;

    // 如果没有配置重试次数,初始化为0
    if (!config.retryCount) {
      config.retryCount = 0;
    }

    // 判断是否需要重试
    if (config.retryCount < MAX_RETRIES && shouldRetry(error)) {
      config.retryCount += 1;

      // 显示重试提示
      message.warning(`请求失败,正在重试 (${config.retryCount}/${MAX_RETRIES})...`, 2);

      // 等待后重试
      await delay(RETRY_DELAY * config.retryCount);

      return request(config);
    }

    // 构造友好的错误信息
    let errorMessage = '请求失败';
    let errorType = 'unknown';

    if (!error.response) {
      // 网络错误
      errorType = 'network';
      if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时,请检查网络连接';
      } else if (error.message === 'Network Error') {
        errorMessage = '网络连接失败,请检查网络';
      } else {
        errorMessage = '网络异常,请稍后重试';
      }
    } else {
      // HTTP 错误
      errorType = 'http';
      const status = error.response.status;

      switch (status) {
        case 400:
          errorMessage = '请求参数错误';
          break;
        case 401:
          errorMessage = '未授权,请重新登录';
          break;
        case 403:
          errorMessage = '访问被禁止';
          break;
        case 404:
          errorMessage = '请求的资源不存在';
          break;
        case 500:
          errorMessage = '服务器内部错误';
          break;
        case 502:
          errorMessage = '网关错误';
          break;
        case 503:
          errorMessage = '服务暂时不可用';
          break;
        case 504:
          errorMessage = '网关超时';
          break;
        default:
          errorMessage = `请求失败 (${status})`;
      }
    }

    // 构造错误对象
    const customError: any = new Error(errorMessage);
    customError.type = errorType;
    customError.originalError = error;

    return Promise.reject(customError);
  }
);

// 搜索热门内容
export const searchHotContent = (params: SearchParams): Promise<ApiResponse> => {
  return request.post('/hots/search', params);
};

export default request;
