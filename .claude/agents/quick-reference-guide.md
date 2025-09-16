# AI Agents 快速参考指南
**版本**: 1.0
**创建日期**: 2025-09-16
**用途**: 为Orchestrator_Agent提供快速参考，确保正确委派任务

---

## 📋 文件操作边界快速查询表

| Agent名称 | 允许写入路径 | 主要职责 | 禁止操作 |
|-----------|-------------|----------|----------|
| **Game_Designer_Agent** | `/specs/`<br>`/docs/design/` | 游戏设计文档 | 源代码、测试文件 |
| **QA_Tester_Agent** | `/tests/`<br>`/tests/fixtures/`<br>`/tests/mocks/` | 测试用例编写 | 源代码实现、设计文档 |
| **Frontend_Agent** | `/assets/scripts/`<br>`/src/components/`<br>`/src/ui/` | Cocos Creator前端 | temp/、library/目录 |
| **Backend_Logic_Agent** | `/src/logic/`<br>`/src/services/`<br>`/src/models/` | 核心业务逻辑 | Cocos Creator资源 |
| **Monetization_Agent** | `/src/monetization/`<br>`/src/payments/`<br>`/src/ads/` | 商业化SDK集成 | 核心游戏逻辑 |
| **Refactor_And_Review_Agent** | `/docs/reviews/`<br>`/.claude/reviews/` | 代码审查报告 | 直接修改源码 |
| **Documentation_Agent** | `/docs/`<br>`/docs/api/` | 技术文档生成 | 游戏设计文档 |
| **Art_Director_Agent** | `/docs/art/`<br>`/assets/art-specs/` | 美术规范指南 | 源代码文件 |
| **Sound_Designer_Agent** | `/docs/audio/`<br>`/assets/audio-specs/` | 音效设计文档 | 脚本代码 |
| **Backend_Architect_Agent** | `/docs/architecture/`<br>`/src/config/` | 架构设计文档 | 游戏资源 |
| **Data_Engineer_Analyst_Agent** | `/src/analytics/`<br>`/docs/analytics/` | 数据分析系统 | 游戏资源 |
| **LiveOps_Manager_Agent** | `/docs/liveops/`<br>`/src/events/` | 运营活动设计 | 核心游戏逻辑 |
| **Community_Manager_Agent** | `/docs/community/`<br>`/.claude/community/` | 社区管理文档 | 所有源代码 |

---

## 🚨 关键安全提醒

### 绝对禁止的操作
```bash
❌ 任何项目外路径操作
❌ 修改 temp/ 和 library/ 目录
❌ 修改 tsconfig.json 的 extends 字段
❌ 删除 .git/ 目录内容
❌ 访问系统敏感目录
```

### 必须检查的关键点
```bash
✅ 文件路径必须以项目根目录开头
✅ Agent必须在授权路径内操作
✅ 受保护文件需要特殊权限
✅ 所有文件操作都要记录日志
```

---

## 📝 标准委派流程

### 1. 确认Agent类型和任务
```markdown
任务: 实现英雄升级系统
需要的Agent: Frontend_Agent + Backend_Logic_Agent + QA_Tester_Agent
```

### 2. 检查文件路径权限
```markdown
Frontend_Agent: ✅ /src/components/HeroUpgrade.ts
Backend_Logic_Agent: ✅ /src/logic/HeroService.ts
QA_Tester_Agent: ✅ /tests/hero-upgrade.test.ts
```

### 3. 使用标准化授权模板
```markdown
复制 orchestrator-authorization-template.md 模板
填写具体的Agent名称和授权路径
添加安全边界警告
```

### 4. 任务执行监控
```markdown
监控文件操作日志
检查是否有越界访问
记录任务完成状态
```

---

## 🛠️ 常见任务场景的Agent组合

### 新功能开发
```
1. Game_Designer_Agent → 创建GDD规格
2. QA_Tester_Agent → 编写测试用例
3. Backend_Logic_Agent → 实现业务逻辑
4. Frontend_Agent → 实现UI组件
5. Refactor_And_Review_Agent → 代码审查
6. Documentation_Agent → 生成技术文档
```

### 系统重构
```
1. Refactor_And_Review_Agent → 分析现有代码
2. Backend_Architect_Agent → 设计新架构
3. Backend_Logic_Agent → 重构业务逻辑
4. QA_Tester_Agent → 更新测试用例
5. Documentation_Agent → 更新文档
```

### 商业化集成
```
1. Game_Designer_Agent → 设计商业化点
2. Monetization_Agent → 集成SDK
3. Data_Engineer_Analyst_Agent → 添加数据追踪
4. QA_Tester_Agent → 测试支付流程
5. Community_Manager_Agent → 准备公告
```

---

## 📊 安全监控仪表板

### 文件操作统计
```typescript
// 每日统计报告
interface DailySecurityReport {
  totalFileOperations: number;
  successfulOperations: number;
  blockedOperations: number;
  agentActivityLevel: Record<string, number>;
  topAccessedPaths: string[];
  securityViolations: SecurityViolation[];
}
```

### 实时监控指标
- 活跃Agent数量
- 文件操作频率
- 权限检查成功率
- 安全违规事件数

---

## 🎯 最佳实践建议

### Orchestrator_Agent应该:
1. **明确任务边界** - 清晰定义每个agent的职责范围
2. **验证路径权限** - 使用此快速查询表确认权限
3. **监控执行过程** - 实时检查文件操作是否合规
4. **处理违规事件** - 根据违规级别采取相应措施

### 各Worker Agent应该:
1. **遵守路径限制** - 严格在授权路径内操作
2. **使用安全验证** - 调用FileSecurityValidator进行检查
3. **记录操作日志** - 详细记录所有文件操作
4. **报告异常情况** - 及时向Orchestrator报告问题

---

**此快速参考指南为Orchestrator_Agent提供了完整的安全边界管理工具，确保所有AI agents在受控环境中安全协作。**