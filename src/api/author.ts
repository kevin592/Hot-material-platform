import request from './request';

export interface Author {
  id: string;
  name: string;
  description: string;
  articleCount: number;
  totalWords: number;
  avgWordsPerArticle: number;
  analysisStatus: 'completed' | 'analyzing' | 'pending';
  styleScore: number;
  tags: string[];
  createdAt: string;
}

export interface CreateAuthorParams {
  name: string;
  description: string;
  tags?: string[];
}

export interface LayerAnalysis {
  language: { score: number; status: string; features: any[] };
  techniques: { score: number; status: string; features: any[] };
  structure: { score: number; status: string; features: any[] };
  viewpoint: { score: number; status: string; features: any[] };
  adaptation: { score: number; status: string; features: any[] };
  interaction: { score: number; status: string; features: any[] };
  fingerprint: { score: number; status: string; features: any[] };
}

export interface AuthorAnalysisResponse {
  author: Author;
  layerAnalysis: LayerAnalysis;
}

// 获取作者列表
export const getAuthors = (params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}) => {
  return request.get('/authors', { params });
};

// 创建作者
export const createAuthor = (data: CreateAuthorParams) => {
  return request.post('/authors', data);
};

// 上传文章
export const uploadArticle = (authorId: string, data: {
  title: string;
  content: string;
}) => {
  return request.post(`/authors/${authorId}/articles`, data);
};

// 获取作者分析结果
export const getAuthorAnalysis = (authorId: string): Promise<AuthorAnalysisResponse> => {
  return request.get(`/authors/${authorId}/analysis`);
};

// 删除作者
export const deleteAuthor = (authorId: string) => {
  return request.delete(`/authors/${authorId}`);
};

// 更新作者
export const updateAuthor = (authorId: string, data: CreateAuthorParams) => {
  return request.put(`/authors/${authorId}`, data);
};