import dayjs from 'dayjs';

/**
 * 根据时间范围获取开始和结束时间
 */
export const getTimeRange = (range: string): [string, string] => {
  const now = dayjs();
  let startTime: dayjs.Dayjs;

  switch (range) {
    case '3h':
      startTime = now.subtract(3, 'hour');
      break;
    case '12h':
      startTime = now.subtract(12, 'hour');
      break;
    case '1d':
      startTime = now.subtract(1, 'day');
      break;
    case '2d':
      startTime = now.subtract(2, 'day');
      break;
    case '7d':
      startTime = now.subtract(7, 'day');
      break;
    default:
      startTime = now.subtract(1, 'day');
  }

  return [
    startTime.format('YYYY-MM-DD HH:mm:ss'),
    now.format('YYYY-MM-DD HH:mm:ss')
  ];
};

/**
 * 格式化数字,添加千位分隔符
 */
export const formatNumber = (num: string | number): string => {
  const n = typeof num === 'string' ? parseInt(num, 10) : num;
  if (isNaN(n)) return '0';
  return n.toLocaleString('zh-CN');
};

/**
 * 复制文本到剪贴板
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('复制失败:', error);
    return false;
  }
};
