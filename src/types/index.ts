// API 请求参数类型
export interface SearchParams {
  limit: number;
  offset: number;
  postType: number; // 3=低粉爆款, 其他类型暂不支持
  platforms: string[];
  categories: string[];
  searchWord: string;
  sortBy: number; // 1=阅读量, 2=评论量, 3=发布时间, 4=点赞量
  articleGenres: string[];
  endTime: string;
  startTime: string;
  searchId: string;
  fansLimits: string; // 粉丝量范围(低粉爆款用)
  videoDurationLimits: string;
}

// 内容数据项类型
export interface ContentItem {
  title: string;
  platform: string;
  authorName: string;
  category: string;
  readCnt: string;
  commentCnt: string;
  publishTime: string;
  url: string;
  fans: string;
  keywords: string[];
  userId: string;
  gid: string;
  diggCnt: string;
  repostCnt: string;
  favoriteCnt: string;
  aiGenCnt: string;
}

// API 响应类型
export interface ApiResponse {
  code: number;
  message: string;
  total: number;
  list: ContentItem[];
  searchId: string;
}

// 筛选条件类型
export interface FilterParams {
  platform?: string;
  contentType?: string;
  categories?: string[];
  fansLimit?: string;
  timeRange?: string;
  customTimeRange?: [string, string];
  sortBy?: number;
  searchWord?: string;
}

// 排序字段映射
export const SORT_FIELD_MAP: Record<string, number> = {
  'fans': 5,        // 粉丝量排序(暂时用5,需要确认后端是否支持)
  'readCnt': 1,     // 阅读量排序
  'commentCnt': 2,  // 评论量排序
  'diggCnt': 4,     // 点赞量排序
  'publishTime': 3  // 发布时间排序
};

// 平台选项
export const PLATFORMS = ['今日头条', '百家号', '微博', '小红书', '公众号'];

// 内容类型选项
export const CONTENT_TYPES = ['短图文', '文章', '视频'];

// 内容领域选项
export const CATEGORIES = [
  '全部', '生活', '影视', '体育', '情感', '娱乐', '财经', '三农',
  '国际', '军事', '搞笑', '美食', '汽车', '时尚', '旅游', '音乐',
  '健康', '历史', '游戏', '教育', '法律', '养老', '育儿', '房产',
  '科普', '综艺', '摄影', '动漫', '运动健身', '职业职场', '时政社会',
  '人文社科', '动物宠物', '科学科技', '家居家装', '其他'
];

// 粉丝量范围选项
export const FANS_LIMITS = [
  { label: '全部', value: '' },
  { label: '1k~3k', value: '1000-3000' },
  { label: '3k~5k', value: '3000-5000' },
  { label: '5k~1w', value: '5000-10000' },
  { label: '1w~5w', value: '10000-50000' }
];

// 发布时间选项
export const TIME_RANGES = [
  { label: '3小时内', value: '3h' },
  { label: '12小时内', value: '12h' },
  { label: '1天内', value: '1d' },
  { label: '2天内', value: '2d' },
  { label: '7天内', value: '7d' }
];

// 排序选项
export const SORT_OPTIONS = [
  { label: '阅读(播放)量排序', value: 1 },
  { label: '评论量排序', value: 2 },
  { label: '发布时间排序', value: 3 },
  { label: '点赞量排序', value: 4 }
];
