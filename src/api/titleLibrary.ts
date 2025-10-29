import request from './request';
import type { TitleItem, Element, GeneratedTitle } from '../types';

// 获取标题列表
export const getTitles = (params?: { status?: string; limit?: number; offset?: number }) => {
  return request.get<any, { code: number; message: string; data: { list: TitleItem[]; total: number } }>('/titles', { params });
};

// 添加标题并AI分析
export const analyzeTitle = (data: { title: string; source?: string }) => {
  return request.post<any, { code: number; message: string; data: TitleItem }>('/titles/analyze', data);
};

// 审核通过标题
export const approveTitle = (id: number, data: Partial<TitleItem>) => {
  return request.post(`/titles/${id}/approve`, data);
};

// 更新标题
export const updateTitle = (id: number, data: Partial<TitleItem>) => {
  return request.put(`/titles/${id}`, data);
};

// 删除标题
export const deleteTitle = (id: number) => {
  return request.delete(`/titles/${id}`);
};

// 批量删除标题
export const batchDeleteTitles = (ids: number[]) => {
  return request.post('/titles/batch-delete', { ids });
};

// 获取元素列表
export const getElements = (params?: { category?: string; limit?: number; offset?: number }) => {
  return request.get<any, { code: number; message: string; data: { list: Element[] } }>('/elements', { params });
};

// 添加元素
export const addElement = (data: Partial<Element>) => {
  return request.post('/elements', data);
};

// 生成标题
export const generateTitles = (data: { article: string; count?: number }) => {
  return request.post<any, { code: number; message: string; data: { titles: GeneratedTitle[] } }>('/generate/titles', data);
};
