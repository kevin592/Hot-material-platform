const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';

/**
 * 调用DeepSeek API
 */
async function callDeepSeek(messages, options = {}) {
  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: options.model || 'deepseek-chat',
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30秒超时
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API调用失败:', error.response?.data || error.message);
    throw new Error('AI服务调用失败: ' + (error.response?.data?.error?.message || error.message));
  }
}

/**
 * 分析标题 - 拆解成元素和心理分析
 */
async function analyzeTitle(title) {
  const messages = [
    {
      role: 'system',
      content: '你是一个爆款标题分析专家。你的任务是将标题拆解为可复用的元素，并分析点击心理。'
    },
    {
      role: 'user',
      content: `请分析以下标题，并按照JSON格式返回结果：

标题: ${title}

请输出以下JSON格式（不要有任何其他文字）：
{
  "psychology": [
    "心理分析1：具体说明某个元素如何影响用户心理",
    "心理分析2：具体说明某个元素如何影响用户心理",
    "心理分析3：具体说明某个元素如何影响用户心理"
  ],
  "elements": [
    {
      "text": "元素文本（从标题中提取的具体片段）",
      "category": "分类（降低门槛/制造紧迫感/增强可信度/引发好奇/击中人群/制造对比/承诺结果）",
      "explain": "作用说明（这个元素为什么有效，如何影响用户）"
    }
  ],
  "routine": "核心套路总结（例如：数字降门槛 + 速度刺激 + 结果可量化）",
  "scenario": "适用场景说明（什么类型的内容适合用这个标题套路）"
}`
    }
  ];

  const result = await callDeepSeek(messages);

  // 提取JSON（处理可能的markdown代码块）
  let jsonStr = result.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```\n?/g, '');
  }

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('JSON解析失败，原始返回:', result);
    throw new Error('AI返回格式错误，无法解析');
  }
}

/**
 * 基于文章内容和元素库生成标题
 */
async function generateTitles(articleContent, elements, count = 5) {
  const messages = [
    {
      role: 'system',
      content: '你是一个爆款标题生成专家。你的任务是基于文章内容和元素库，生成吸引人的标题。'
    },
    {
      role: 'user',
      content: `请基于以下文章内容和可用元素，生成${count}个爆款标题。

# 文章内容
${articleContent.substring(0, 2000)} ${articleContent.length > 2000 ? '...' : ''}

# 可用元素库
${JSON.stringify(elements.slice(0, 20), null, 2)}

# 要求
1. 从元素库中选择3-5个最适合的元素
2. 组合生成${count}个不同风格的标题
3. 每个标题都要吸引人、有点击欲望

请输出以下JSON格式（不要有任何其他文字）：
[
  {
    "title": "生成的标题",
    "usedElements": ["元素1", "元素2", "元素3"],
    "reason": "为什么这样组合（简短说明）"
  }
]`
    }
  ];

  const result = await callDeepSeek(messages);

  // 提取JSON
  let jsonStr = result.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```\n?/g, '');
  }

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('JSON解析失败，原始返回:', result);
    throw new Error('AI返回格式错误，无法解析');
  }
}

module.exports = {
  analyzeTitle,
  generateTitles,
  callDeepSeek
};
