// Coze API服务
// 配置说明：需要在Coze平台配置完成后，替换以下参数

// COZE_CONFIG 暂时未使用，待启用真实API时取消注释
// const COZE_CONFIG = {
//   apiEndpoint: 'https://api.coze.com/v1/workflow/run',
//   botId: 'YOUR_BOT_ID', // 替换为你的Bot ID
//   apiKey: 'YOUR_API_KEY', // 替换为你的API Key
// };

// CozeRequest 和 CozeResponse 接口暂时未使用，待启用真实API时取消注释
// interface CozeRequest {
//   bot_id: string;
//   user_id: string;
//   stream: boolean;
//   parameters: {
//     topic: string;
//   };
// }

// interface CozeResponse {
//   code: number;
//   msg: string;
//   data: {
//     output: {
//       final_article: string;
//     };
//   };
// }

/**
 * 调用Coze API创作文章
 * @param topic 热点话题标题
 * @returns 生成的Markdown文章
 */
export const createArticle = async (topic: string): Promise<string> => {
  // 临时使用模拟数据进行测试
  console.log('使用模拟数据进行AI创作');
  console.log('主题:', topic);
  return mockCreateArticle(topic);

  /*
  // 正式使用时取消下面的注释，并注释掉上面的 return mockCreateArticle(topic);

  // 检查配置
  if (COZE_CONFIG.botId === 'YOUR_BOT_ID' || COZE_CONFIG.apiKey === 'YOUR_API_KEY') {
    throw new Error('请先在 cozeService.ts 中配置 Bot ID 和 API Key');
  }

  const requestBody: CozeRequest = {
    bot_id: COZE_CONFIG.botId,
    user_id: 'user_' + Date.now(),
    stream: false,
    parameters: {
      topic
    }
  };

  try {
    const response = await fetch(COZE_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COZE_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const data: CozeResponse = await response.json();

    if (data.code !== 0) {
      throw new Error(data.msg || 'API返回错误');
    }

    return data.data.output.final_article;

  } catch (error: any) {
    console.error('Coze API调用失败:', error);
    throw new Error(error.message || 'AI创作服务暂时不可用');
  }
  */
};

/**
 * 模拟创作（用于测试）
 * @param topic
 * @returns
 */
/**
 * 生成多个标题选项
 * @param topic 主题
 * @param count 生成数量
 * @returns 标题数组
 */
export const generateTitles = async (topic: string, count: number = 10): Promise<string[]> => {
  // 临时使用模拟数据
  console.log('使用模拟数据生成标题');
  console.log('主题:', topic);
  console.log('数量:', count);
  return mockGenerateTitles(topic, count);

  /*
  // 正式使用时取消注释
  const requestBody = {
    bot_id: COZE_CONFIG.botId, // 使用专门的标题生成Bot
    user_id: 'user_' + Date.now(),
    stream: false,
    parameters: {
      topic,
      content: content || '',
      count
    }
  };

  try {
    const response = await fetch(COZE_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COZE_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(data.msg || 'API返回错误');
    }

    return data.data.output.titles;
  } catch (error: any) {
    console.error('标题生成失败:', error);
    throw new Error(error.message || '标题生成服务暂时不可用');
  }
  */
};

/**
 * 模拟生成标题
 */
export const mockGenerateTitles = async (topic: string, count: number): Promise<string[]> => {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const titleTemplates = [
    `${topic}：真相比你想的更复杂`,
    `${topic}背后的3个关键问题`,
    `关于${topic}，99%的人都理解错了`,
    `${topic}：一场被忽视的变革`,
    `深度解读：${topic}的前世今生`,
    `${topic}引发热议，专家这样说`,
    `${topic}：机遇还是陷阱？`,
    `揭秘${topic}：你不知道的内幕`,
    `${topic}，这次真的不一样了`,
    `为什么${topic}会引爆全网？`,
    `${topic}：一场精心策划的骗局？`,
    `${topic}的真相，终于藏不住了`,
  ];

  return titleTemplates.slice(0, count);
};

export const mockCreateArticle = async (topic: string): Promise<string> => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 3000));

  return `# ${topic}

**摘要:** 这是一篇AI生成的示例文章

这是引入段落，介绍话题背景...

1

这是第一个分论点的内容。

通过详细的论证和数据支撑，**我们可以得出重要结论**。

2

这是第二个分论点的内容。

继续深入分析，揭示更多细节。

3

这是第三个分论点，也是高潮段！

**最犀利的观点往往在这里出现！**

这是结尾段落，总结全文观点。

---

近期部分精品文章：

[待人工补充]

---

扫描识别下方二维码关注我

和青木一起，每天成长一点点

---

结束语：大量读者还没养成点赞的习惯，如果认可这篇文章，希望大家阅读后在右下边"在看"处点个赞，以示鼓励！长期坚持原创真的很不容易，多次想放弃。坚持是一种信仰，专注是一种态度！`;
};
