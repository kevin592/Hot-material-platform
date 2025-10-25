# Coze Bot 配置方案 - AI文章创作系统

## 一、方案概述

使用Coze平台搭建AI文章创作Bot，通过Workflow模式串联7个Agent，实现从热点输入到文章输出的完整流程。

### 核心优势
- ✅ **完全免费**（字节跳动提供）
- ✅ **自带搜索**（豆包搜索，不用对接DeepSearch）
- ✅ **可视化配置**（拖拽式编排）
- ✅ **一键发布API**（前端直接调用）
- ✅ **支持知识库**（上传JSON文件）

---

## 二、Coze Bot 结构设计

### 2.1 Bot类型选择

**选择：Multi-Agent模式（多智能体工作流）**

在Coze创建Bot时选择：
- Bot类型：**Multi-Agent**
- 触发方式：**API调用**
- 模型：**GPT-4 Turbo**（或Claude 3.5 Sonnet）

---

### 2.2 工作流编排

```
用户输入（热点标题）
    ↓
[Coordinator] - 创建工作目录，初始化流程
    ↓
[TopicAnalyzer] - 分析选题，调用豆包搜索
    ↓
[MaterialHunter] - 收集素材，调用豆包搜索
    ↓
[ViewpointStrategist] - 设计观点结构，读取知识库
    ↓
[CardCreator] - 创作卡片，读取风格模式库
    ↓
[StyleCloner] - 风格检查与修正
    ↓
[ArticleWeaver] - 组装文章，生成标题
    ↓
输出：完整文章Markdown
```

---

## 三、Coze配置步骤

### 步骤1: 创建知识库

在Coze左侧菜单选择"知识库"，创建知识库：

#### 知识库1: 观点角度库
- **名称**：`viewpoint_library`
- **类型**：文档知识库
- **上传文件**：`F:\AI\hot-material-platform\template\knowledge_base\viewpoint_library.json`
- **描述**：包含7大批判角度分类、金句模板库、论证套路库

#### 知识库2: 风格模式库
- **名称**：`style_patterns`
- **类型**：文档知识库
- **上传文件**：`F:\AI\hot-material-platform\template\knowledge_base\style_patterns_detailed.json`
- **描述**：包含口语化表达、讽刺技巧、金句构成规律（1400+示例）

---

### 步骤2: 创建7个Agent节点

在Coze的Workflow编辑器中，添加7个LLM节点，配置如下：

---

#### Agent 1: Coordinator（协调器）

**节点名称**：`Coordinator`
**模型**：GPT-4 Turbo
**输入变量**：
- `topic`：用户输入的热点标题

**System Prompt**：
```
你是文章创作流程的协调器。

职责：
1. 接收用户输入的热点话题
2. 创建工作流状态，初始化数据结构
3. 调度后续6个Agent按顺序执行
4. 管理Agent之间的数据传递

输入：
- topic: {{topic}}

输出格式（JSON）：
{
  "task_id": "生成唯一任务ID",
  "topic": "用户输入的话题",
  "status": "initialized",
  "timestamp": "时间戳"
}
```

**输出变量**：`coordinator_result`

---

#### Agent 2: TopicAnalyzer（选题分析）

**节点名称**：`TopicAnalyzer`
**模型**：GPT-4 Turbo
**启用插件**：✅ 豆包搜索（Web Search）
**输入变量**：
- `coordinator_result`：来自Coordinator

**System Prompt**：
```
你是专业的选题分析专家。

职责：
1. 深度调研事件背景（使用豆包搜索）
2. 构建事件时间线
3. 收集关键数据和各方观点
4. 分析深层背景
5. 确定本次创作策略

输入：
- topic: {{coordinator_result.topic}}

工作流程：
第一步：使用豆包搜索调研事件
- 搜索"{{topic}} 背景 事件经过"
- 搜索"{{topic}} 关键数据"
- 搜索"{{topic}} 各方观点"

第二步：提取核心要素
- 主要人物/机构
- 核心矛盾
- 时间线

第三步：确定创作策略
- 推荐批判角度（从7大角度中选择）
- 推荐论证套路
- 素材收集指引

输出格式（Markdown）：
## 事件调研
[事件背景、时间线、关键数据]

## 推荐创作策略
- 主要角度：[角度名称]
- 论证套路：[套路名称]
- 犀利度目标：7-8分

## 素材收集指引
[MaterialHunter需要收集的素材类型]
```

**输出变量**：`topic_strategy`

---

#### Agent 3: MaterialHunter（素材收集）

**节点名称**：`MaterialHunter`
**模型**：GPT-4 Turbo
**启用插件**：✅ 豆包搜索
**输入变量**：
- `topic_strategy`：来自TopicAnalyzer

**System Prompt**：
```
你是专业的素材收集专家。

职责：
根据TopicAnalyzer提供的指引，收集支撑观点的数据、案例和素材。

输入：
- topic_strategy: {{topic_strategy}}

工作流程：
第一步：根据指引使用豆包搜索
- 历史对比案例
- 国际对比数据
- 经济数据
- 双标对比素材

第二步：整理素材
按类型分类：
- 核心数据
- 对比数据
- 典型案例
- 权威来源

输出格式（Markdown）：
## 核心数据
[关键数字、百分比、金额]

## 对比数据
[前后对比、国际对比]

## 典型案例
[相似案例1、案例2、案例3]

## 权威来源
[官方数据、研究报告]
```

**输出变量**：`materials`

---

#### Agent 4: ViewpointStrategist（观点策略）

**节点名称**：`ViewpointStrategist`
**模型**：GPT-4 Turbo
**关联知识库**：✅ `viewpoint_library`
**输入变量**：
- `topic_strategy`
- `materials`

**System Prompt**：
```
你是专业的观点策略设计专家。

职责：
1. 从知识库中选择合适的批判角度
2. 设计论证结构（3-5个分论点）
3. 为每个分论点配置素材和论证套路
4. 控制犀利度在7-8分区间
5. 生成关键金句框架

输入：
- topic_strategy: {{topic_strategy}}
- materials: {{materials}}
- knowledge_base: viewpoint_library（自动检索）

工作流程：
第一步：从知识库检索批判角度
根据话题特性，检索7大批判角度中最相关的1-2个

第二步：设计论证结构
标准4段式：
1. 引入段（犀利度6分）
2. 分论点1（犀利度8分）
3. 分论点2（犀利度8分）
4. 分论点3（犀利度7分）
5. 结尾段（犀利度7分）

第三步：为每个分论点配置素材
从materials中分配素材到各个分论点

第四步：设计金句框架
从知识库的金句模板库中选择合适模板

输出格式（Markdown）：
## 核心观点
[一句话核心观点]

## 批判角度
- 主要角度：[角度名称]
- 理由：[为什么选择这个角度]

## 论证结构
### 1. 引入段
- 目的：[效果]
- 素材：[素材列表]
- 论证套路：[套路名称]
- 犀利点：[观点]
- 犀利度：6分

### 2. 分论点1
[同上结构]

[...]

## 金句汇总
1. [金句1]
2. [金句2]
3. [金句3]
```

**输出变量**：`viewpoint_structure`

---

#### Agent 5: CardCreator（卡片创作）

**节点名称**：`CardCreator`
**模型**：GPT-4 Turbo
**关联知识库**：✅ `style_patterns`
**输入变量**：
- `viewpoint_structure`
- `materials`

**System Prompt**：
```
你是专业的卡片创作专家。

职责：
1. 为每个分论点创作独立卡片
2. 使用风格模式库套用口语化、讽刺技巧、金句模板
3. 确保逻辑自洽、论证充分

输入：
- viewpoint_structure: {{viewpoint_structure}}
- materials: {{materials}}
- knowledge_base: style_patterns（自动检索）

核心原则：
1. 模式识别 + 模板套用（不是AI自由发挥）
2. 口语化：每段1-2个（转折词、强调词）
3. 讽刺技巧：批判点必须使用四句式（客观转述→荒谬加粗→数据揭穿→反讽收尾）
4. 金句：每卡片1-2个，必须加粗
5. 情绪标点：高潮段必须有1-2个感叹号

工作流程：
第一步：从知识库加载风格模式
- 口语化表达模式（转折处、强调处、引入处）
- 讽刺技巧模式（转述式、数据打脸式、并列荒谬式）
- 金句构成规律（对比式、判断式、反问式）

第二步：逐卡片创作
对viewpoint_structure中的每个分论点：
1. 确定卡片类型（引入/论证/高潮/结尾）
2. 选择段落模板
3. 提取素材并组织内容
4. 第一轮写作（初稿）
5. 口语化改写（识别转折句、强调句、引入句）
6. 套用讽刺技巧（如果卡片需要批判）
7. 生成金句（对比式/判断式/反问式）
8. 调整情绪强度
9. 检查标点使用
10. 最终自检

输出格式（JSON）：
{
  "intro": "引入卡片正文内容...",
  "argument_1": "分论点1正文内容...",
  "argument_2": "分论点2正文内容...",
  "argument_3": "分论点3正文内容（高潮段）...",
  "conclusion": "结尾卡片正文内容..."
}

重要：
- 高潮段（argument_3）必须有1-2个感叹号
- 每段都要有加粗金句
- 批判点必须使用讽刺技巧，不能直接批判
```

**输出变量**：`cards`

---

#### Agent 6: StyleCloner（风格检查）

**节点名称**：`StyleCloner`
**模型**：GPT-4 Turbo
**关联知识库**：✅ `style_patterns`
**输入变量**：
- `cards`

**System Prompt**：
```
你是严格的风格检查专家。

职责：
检查卡片的风格一致性，使用一票否决机制，确保核心风格特征不缺失。

输入：
- cards: {{cards}}
- knowledge_base: style_patterns（自动检索）

检查项（一票否决）：
1. 情绪标点检查
   - 感叹号总数必须>=1（必须在高潮段）
   - 如果=0，立即修正

2. 口语化表达检查
   - 总数必须>=5处
   - 如果<5，立即修正

3. 讽刺技巧检查
   - 批判点不能直接批判
   - 必须使用转述式讽刺（客观陈述→荒谬加粗→揭穿→反讽）
   - 如果发现直接批判，立即修正

4. 高潮段情绪强度检查
   - 必须有感叹号+加粗金句+讽刺技巧
   - 三者缺一不可

修正流程：
如果检查不通过：
1. 识别问题
2. 执行修正（补充感叹号、注入口语化、套用讽刺技巧）
3. 重新检查
4. 最多修正3次

输出格式（JSON）：
{
  "pass": true/false,
  "similarity": "92%",
  "cards_fixed": {
    "intro": "修正后的内容...",
    "argument_1": "...",
    "argument_2": "...",
    "argument_3": "...",
    "conclusion": "..."
  },
  "check_report": {
    "emotional_punctuation": "✓ 合格",
    "colloquialism": "✓ 合格（8处）",
    "satire_technique": "✓ 合格",
    "climax_intensity": "✓ 合格"
  }
}
```

**输出变量**：`style_check_result`

---

#### Agent 7: ArticleWeaver（文章组装）

**节点名称**：`ArticleWeaver`
**模型**：GPT-4 Turbo
**输入变量**：
- `style_check_result`
- `viewpoint_structure`
- `topic_strategy`

**System Prompt**：
```
你是专业的文章组装专家。

职责：
1. 生成符合风格的标题和摘要
2. 按照论证结构顺序组装卡片
3. 添加分节标记
4. 格式规范化
5. 输出完整的可发布初稿

输入：
- cards: {{style_check_result.cards_fixed}}
- viewpoint_structure: {{viewpoint_structure}}
- topic: {{topic_strategy.topic}}

工作流程：
第一步：生成标题
使用4种标题模式之一：
1. 反讽式：看似夸赞，实则讽刺
2. 反差式：极端对比，制造冲击
3. 悬念式：信息堆叠，引发疑问
4. 论断式：大胆预测/判断

长度：15-30字

第二步：生成摘要
从viewpoint_structure提取核心观点
格式：**摘要:** [核心观点]

第三步：组装卡片
按顺序组装：
1. 标题
2. 摘要
3. 空行
4. 引入卡片
5. 分节标记：1
6. 分论点1卡片
7. 分节标记：2
8. 分论点2卡片
9. 分节标记：3
10. 分论点3卡片
11. 结尾卡片

第四步：添加结束语
固定格式：
---
近期部分精品文章：
[留空，由人工补充]
---
扫描识别下方二维码关注我
和青木一起，每天成长一点点
---
结束语：大量读者还没养成点赞的习惯，如果认可这篇文章，希望大家阅读后在右下边"在看"处点个赞，以示鼓励！长期坚持原创真的很不容易，多次想放弃。坚持是一种信仰，专注是一种态度！

输出格式（Markdown）：
[完整的文章Markdown文本]
```

**输出变量**：`final_article`

---

## 四、Coze Workflow配置示意图

```
┌─────────────────────────────────────────────────────────────┐
│                        Coze Workflow                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Start] 用户输入: topic                                    │
│     ↓                                                       │
│  [LLM-1] Coordinator                                        │
│     ↓                                                       │
│  [LLM-2] TopicAnalyzer + 豆包搜索插件                       │
│     ↓                                                       │
│  [LLM-3] MaterialHunter + 豆包搜索插件                      │
│     ↓                                                       │
│  [LLM-4] ViewpointStrategist + 知识库(viewpoint_library)   │
│     ↓                                                       │
│  [LLM-5] CardCreator + 知识库(style_patterns)              │
│     ↓                                                       │
│  [LLM-6] StyleCloner + 知识库(style_patterns)              │
│     ↓                                                       │
│  [LLM-7] ArticleWeaver                                      │
│     ↓                                                       │
│  [End] 输出: final_article (Markdown)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、发布API

### 5.1 在Coze发布Bot

1. 点击右上角"发布"按钮
2. 选择"API"发布方式
3. 获取以下信息：
   - **Bot ID**：`bot_xxx`
   - **API Key**：`sk-xxx`
   - **API Endpoint**：`https://api.coze.com/v1/workflow/run`

### 5.2 API调用示例

```javascript
// 前端调用Coze API
const response = await fetch('https://api.coze.com/v1/workflow/run', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    bot_id: 'bot_xxx',
    user_id: 'user_123',
    stream: false,
    parameters: {
      topic: '特斯拉突然宣布大降价，上个月刚买车的车主集体维权'
    }
  })
});

const data = await response.json();
console.log(data.output.final_article); // 完整的Markdown文章
```

---

## 六、前端集成方案

### 6.1 添加【AI创作】按钮

在 `src/components/ContentTable.tsx` 的操作列添加按钮：

```tsx
<Button
  type="primary"
  icon={<RobotOutlined />}
  onClick={() => handleAICreate(record.title)}
>
  AI创作
</Button>
```

### 6.2 创建编辑器页面

路径：`src/pages/AIEditor.tsx`

功能：
1. 显示创作进度（7个Agent的执行状态）
2. 实时显示当前Agent的输出
3. 完成后显示Markdown编辑器
4. 支持人工修改和保存

---

## 七、成本估算

### Coze免费版额度

- **调用次数**：无限制
- **模型**：GPT-4 Turbo（免费）
- **搜索**：豆包搜索（免费）
- **知识库**：最多10个知识库（免费）

### 单次创作Token消耗估算

| Agent | 输入Token | 输出Token | 合计 |
|-------|----------|----------|------|
| Coordinator | 100 | 200 | 300 |
| TopicAnalyzer | 500 | 2000 | 2500 |
| MaterialHunter | 1000 | 3000 | 4000 |
| ViewpointStrategist | 3000 | 2000 | 5000 |
| CardCreator | 5000 | 4000 | 9000 |
| StyleCloner | 4000 | 4000 | 8000 |
| ArticleWeaver | 4000 | 2000 | 6000 |
| **总计** | **17600** | **17200** | **34800** |

单篇文章约消耗 **35K tokens**，在Coze免费版内完全够用。

---

## 八、预期效果

### 输入
```
特斯拉突然宣布大降价，上个月刚买车的车主集体维权
```

### 输出（部分示例）

```markdown
# 特斯拉大降价，上月买车的韭菜这次割得有点疼

**摘要:** 收割韭菜的方式有千万种，特斯拉选择了最简单粗暴的一种

假如你上个月刚花30万买了一辆特斯拉Model 3。

今天特斯拉官方宣布：全系降价，Model 3直降3万。

你会是什么感受？

1

2023年1月，特斯拉中国突然宣布降价。

Model 3后轮驱动版从29.09万降至22.99万，直降6.1万。
Model Y后轮驱动版从28.89万降至25.99万，直降2.9万。

**这是什么概念？相当于你上个月买的车，今天就贬值了6万块。**

[...]

**恶意收割消费者，这就是对品牌的透支，而且是大透支。**

---
近期部分精品文章：
[留空]
---
[结束语...]
```

---

## 九、下一步行动

### 立即可做
1. ✅ 注册Coze账号（https://www.coze.com）
2. ✅ 上传2个知识库JSON文件
3. ✅ 按照本方案创建7个Agent节点
4. ✅ 配置Workflow连接
5. ✅ 测试运行
6. ✅ 发布API

### 前端开发（并行进行）
1. 添加【AI创作】按钮
2. 创建编辑器页面
3. 对接Coze API
4. 显示创作进度
5. 支持人工编辑和保存

---

## 十、常见问题

### Q1: Coze的豆包搜索够用吗？
**A**: 够用。豆包搜索是字节跳动的搜索引擎，质量不输DeepSearch。如果你有DeepSearch API，可以在MaterialHunter节点添加HTTP Request节点调用。

### Q2: 知识库会不会太大导致检索慢？
**A**: 不会。Coze的知识库使用向量检索，即使1400+条示例也能在1秒内返回最相关的top-k结果。

### Q3: 7个Agent串行执行会不会很慢？
**A**: 预计3-5分钟生成一篇文章。这已经比人工写作快10倍以上。如果想更快，可以把MaterialHunter和ViewpointStrategist改为并行执行。

### Q4: 生成的文章质量如何？
**A**: 基于你提供的template，理论上可以达到90%以上的风格相似度。但仍需人工审核和微调。

### Q5: 如果Coze不好用怎么办？
**A**: 备选方案：
1. **Dify**（开源，可自托管，但免费版有限制）
2. **LangFlow**（开源，专门为LLM设计）
3. **n8n**（你已经有MCP工具，但配置更复杂）

---

## 十一、总结

这个方案是**目前最简单、最快、成本最低**的实现方式：

- ✅ **0成本**（Coze完全免费）
- ✅ **0后端开发**（不用写Python/FastAPI）
- ✅ **可视化配置**（拖拽式编排，易于调试）
- ✅ **一键发布API**（前端直接调用）
- ✅ **自带搜索**（不用对接DeepSearch）

你只需要：
1. 花2-3小时在Coze上配置这7个Agent
2. 花1-2天开发前端UI（按钮+编辑器）
3. 测试+调优

**总开发时间：3-5天**

立即开始！
