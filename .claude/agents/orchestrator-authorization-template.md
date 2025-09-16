# Orchestrator Agent 任务委派授权模板
**版本**: 1.0
**创建日期**: 2025-09-16
**用途**: Orchestrator_Agent委派任务时的标准化模板

---

## 🎯 标准授权提示模板

```markdown
# AUTHORIZATION PROMPT FOR [AGENT_NAME]

## 🔒 文件操作安全边界
**项目根目录**: `D:\Develop\Masterpiece\game\hero-idle-game`
**允许写入路径**:
```
[列出该agent允许的具体路径]
```
**严格禁止路径**:
```
❌ 项目外任何路径 (D:\Develop\Masterpiece\game\hero-idle-game 以外)
❌ 系统目录 (C:\Windows\*, C:\Program Files\*)
❌ 用户目录 (C:\Users\Administrator\Documents\*, Desktop\*)
❌ temp/ 和 library/ 目录（Cocos Creator专用）
```

**⚠️ 安全警告**: 任何越界文件操作将导致任务立即终止！

## 📋 TASK DIRECTIVE
[Clear, concise description of the task and its importance to the project]

## 输入资源 (Input Resources)
1. **功能规格说明**: [Path to relevant GDD file]
2. **相关文档**: [List of all relevant documentation files]
3. **特殊要求**: [Any special requirements or constraints]

## 输出要求 (Output Requirements)
**必须遵守文件路径限制！所有输出文件必须在授权路径内！**

[Detailed description of expected deliverables with specific file paths]

### [Specific sections required in the output]
- **Section 1**: [Description]
- **Section 2**: [Description]
- **Section N**: [Description]

## 质量标准 (Quality Standards)
- 文档必须使用中文撰写
- 严格遵守文件操作边界规范 (参考 .claude/agents/file-boundaries.md)
- [Additional quality requirements specific to the agent]
- [Performance, security, or other technical requirements]

## 成功标准 (Success Criteria)
[Clear definition of what constitutes successful task completion]

## 🚨 文件安全检查清单
在执行任何文件操作前，必须确认：
- [ ] 文件路径以 `D:\Develop\Masterpiece\game\hero-idle-game` 开头
- [ ] 目标路径在该agent的授权范围内
- [ ] 未尝试访问 temp/、library/、或系统目录
- [ ] 未尝试修改关键配置文件的保护字段

请立即开始工作。完成后将结果路径报告给Orchestrator_Agent。
```

---

## 🛡️ 各Agent专用授权路径快速参考

### 游戏设计师 (Game_Designer_Agent)
```
✅ /specs/                    # 游戏设计文档
✅ /docs/design/              # 详细设计说明
```

### QA测试 (QA_Tester_Agent)
```
✅ /tests/                    # 测试文件
✅ /tests/fixtures/           # 测试数据
✅ /tests/mocks/              # 模拟数据
```

### 前端开发 (Frontend_Agent)
```
✅ /assets/scripts/           # TypeScript组件代码
✅ /assets/scenes/            # Cocos Creator场景
✅ /assets/prefabs/           # 预制体文件
✅ /src/components/           # 前端组件
✅ /src/ui/                   # UI相关代码
```

### 后端逻辑 (Backend_Logic_Agent)
```
✅ /src/logic/                # 业务逻辑代码
✅ /src/services/             # 服务层代码
✅ /src/models/               # 数据模型
✅ /src/utils/                # 工具函数
✅ /src/types/                # TypeScript类型定义
```

### 商业化 (Monetization_Agent)
```
✅ /src/monetization/         # 商业化SDK代码
✅ /src/payments/             # 支付相关代码
✅ /src/ads/                  # 广告SDK集成
```

### 重构审查 (Refactor_And_Review_Agent)
```
✅ /docs/reviews/             # 代码审查报告
✅ /.claude/reviews/          # 内部审查记录
```

### 文档 (Documentation_Agent)
```
✅ /docs/                     # 技术文档
✅ /docs/api/                 # API文档
✅ /docs/architecture/        # 架构文档
✅ /README.md                 # 项目说明
```

### 美术指导 (Art_Director_Agent)
```
✅ /docs/art/                 # 美术指南文档
✅ /assets/art-specs/         # 美术规格说明
✅ /.claude/art-assets/       # 美术资源清单
```

### 音效设计 (Sound_Designer_Agent)
```
✅ /docs/audio/               # 音效设计文档
✅ /assets/audio-specs/       # 音效规格说明
✅ /.claude/audio-assets/     # 音效资源清单
```

### 后端架构师 (Backend_Architect_Agent)
```
✅ /docs/architecture/        # 架构设计文档
✅ /docs/database/            # 数据库设计
✅ /src/config/               # 配置文件
✅ /src/schemas/              # 数据库模式定义
```

### 数据分析师 (Data_Engineer_Analyst_Agent)
```
✅ /src/analytics/            # 数据分析代码
✅ /docs/analytics/           # 分析文档
✅ /src/tracking/             # 数据追踪代码
```

### 运营管理 (LiveOps_Manager_Agent)
```
✅ /docs/liveops/             # 运营文档
✅ /src/events/               # 活动系统代码
✅ /content/events/           # 活动配置数据
✅ /packages/content/events/  # 活动内容配置
```

### 社区管理 (Community_Manager_Agent)
```
✅ /docs/community/           # 社区管理文档
✅ /.claude/community/        # 社区反馈记录
```

---

## 📝 使用说明

1. **复制模板**: Orchestrator_Agent使用此模板委派任务
2. **填写agent名称**: 替换 [AGENT_NAME] 为具体agent
3. **指定授权路径**: 从上述快速参考中复制对应路径
4. **添加任务细节**: 填写具体的任务要求和成功标准
5. **强调安全边界**: 确保agent理解文件操作限制

**此模板确保所有任务委派都包含明确的安全边界，防止agents越界操作。**