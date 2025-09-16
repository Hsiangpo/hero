# AI Agents 边界规范文档索引
**版本**: 1.0
**更新日期**: 2025-09-16
**用途**: 为Orchestrator_Agent和所有Worker Agents提供完整的文件操作边界规范

---

## 📚 文档结构概览

```
.claude/agents/
├── README.md                              # 本索引文件
├── file-boundaries.md                     # 详细的文件操作边界规范
├── orchestrator-authorization-template.md # 任务委派标准模板
├── file-security-validator.md             # 安全验证机制和代码
└── quick-reference-guide.md              # 快速参考查询表
```

---

## 🎯 各文档用途说明

### 📄 file-boundaries.md
**目标用户**: 所有AI Agents
**核心内容**:
- 每个Agent的详细文件操作权限矩阵
- 绝对禁止访问的路径列表
- 项目根目录定义和安全原则
- 违规处理机制

### 📄 orchestrator-authorization-template.md
**目标用户**: Orchestrator_Agent
**核心内容**:
- 标准化的任务委派模板
- 每个Agent的授权路径快速参考
- 安全检查清单
- 模板使用说明

### 📄 file-security-validator.md
**目标用户**: 开发者和高级Agents
**核心内容**:
- TypeScript安全验证类完整代码
- 文件路径验证逻辑
- 安全监控和报警机制
- 应急响应程序

### 📄 quick-reference-guide.md
**目标用户**: Orchestrator_Agent
**核心内容**:
- Agent权限快速查询表
- 常见任务场景的Agent组合
- 安全监控指标
- 最佳实践建议

---

## 🚀 快速开始指南

### 对于Orchestrator_Agent:
1. **委派任务前**: 查阅 `quick-reference-guide.md` 确认Agent权限
2. **发送指令时**: 使用 `orchestrator-authorization-template.md` 模板
3. **监控执行**: 参考安全检查清单进行实时监控

### 对于Worker Agents:
1. **接收任务后**: 查阅 `file-boundaries.md` 了解操作边界
2. **执行操作前**: 使用 `file-security-validator.md` 中的验证机制
3. **遇到问题时**: 查看相应的违规处理程序

---

## 🔒 核心安全原则回顾

### 项目根目录定义
```
PROJECT_ROOT = "D:\Develop\Masterpiece\game\hero-idle-game"
```

### 绝对禁止操作
```bash
❌ 任何项目外路径（PROJECT_ROOT之外）
❌ 系统关键目录（C:\Windows\*, C:\Program Files\*）
❌ 用户敏感目录（Desktop, Documents）
❌ Cocos Creator专用目录（temp/, library/）
❌ 版本控制目录（.git/）
```

### 权限验证流程
```
1. 检查路径是否在项目根目录内
2. 验证Agent是否有该路径的操作权限
3. 确认是否为受保护的文件
4. 记录操作日志
5. 执行文件操作
```

---

## 📊 安全统计和监控

### 实时监控指标
- **活跃Agent数量**: 当前执行任务的Agent统计
- **文件操作频率**: 每分钟/小时的文件操作次数
- **权限检查成功率**: 通过安全验证的操作比例
- **违规事件统计**: 按严重程度分类的违规统计

### 每日安全报告
- 各Agent的活跃度统计
- 最常访问的文件路径
- 安全违规详细记录
- 系统健康状况评估

---

## 🛠️ 维护和更新

### 定期检查事项
- [ ] 验证所有Agent的权限设置是否最新
- [ ] 检查是否有新的安全威胁需要防范
- [ ] 更新文档中的路径和权限配置
- [ ] 审查安全日志和违规记录

### 文档更新流程
1. **发现问题**: 通过监控或Agent反馈发现边界问题
2. **分析影响**: 评估需要调整的权限和路径
3. **更新文档**: 修改相应的边界规范文档
4. **通知各Agent**: 确保所有Agent了解新的边界规定
5. **验证效果**: 监控新规范的执行效果

---

## 📞 支持和联系

### 遇到问题时的处理流程
1. **查阅文档**: 首先查看相关的边界规范文档
2. **检查日志**: 查看安全验证日志了解具体错误
3. **报告问题**: 向Orchestrator_Agent报告详细情况
4. **等待指导**: 接收进一步的操作指导

### 紧急情况处理
- **严重违规**: 立即停止操作，报告Orchestrator
- **系统异常**: 激活应急响应程序
- **数据安全**: 优先保护项目数据完整性

---

## 📝 版本历史

| 版本 | 日期 | 更新内容 | 更新者 |
|------|------|----------|--------|
| 1.0 | 2025-09-16 | 初始版本，完整的边界规范体系 | Assistant |

---

**此边界规范文档体系为封神挂机录项目提供了完整的AI Agent安全管理框架，确保所有自动化开发工作在安全可控的环境中进行。**