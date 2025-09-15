# 英雄挂机游戏 - 测试套件说明

## 概述

本测试套件基于《咸鱼之王》级别的游戏机制设计，确保整个英雄挂机游戏系统的功能完整性、性能表现和安全性。测试套件采用严格的TDD（测试驱动开发）原则，所有测试用例当前处于FAILING状态，需要对应的实现代码来使其通过。

## 📋 测试套件结构

### 核心功能测试
- **`hero-management.test.ts`** - 45英雄系统核心功能测试
- **`formation-system.test.ts`** - 5英雄编队战斗系统测试
- **`skill-combination.test.ts`** - 100+技能配合系统测试

### PvP系统测试
- **`salt-field-pvp.test.ts`** - 盐场六边格占点PvP测试
- **`salt-jar-pvp.test.ts`** - 盐罐客厅争夺PvP测试

### 安全与性能测试
- **`security-anti-cheat.test.ts`** - 防作弊与安全系统测试
- **`performance-concurrent.test.ts`** - 1万用户并发性能测试

## 🚀 快速开始

### 环境要求
- Node.js 18.15.0+
- TypeScript 5.0.0+
- Jest 29.5.0+
- Redis (用于缓存测试)
- SQLite (用于数据库测试)

### 安装依赖
```bash
cd tests
npm install
```

### 运行测试

#### 运行所有测试
```bash
npm test
```

#### 分类运行测试
```bash
# 单元测试 (英雄、编队、技能)
npm run test:unit

# 集成测试 (PvP系统)
npm run test:integration

# 安全测试
npm run test:security

# 性能测试 (注意：需要较长时间)
npm run test:load
```

#### 单独运行特定测试
```bash
# 英雄系统测试
npm run test:hero

# 盐场PvP测试
npm run test:saltfield

# 性能测试
npm run test:performance
```

#### 观察模式（开发时使用）
```bash
npm run test:watch
```

#### 生成覆盖率报告
```bash
npm run test:coverage
```

## 📊 测试覆盖范围

### 英雄管理系统 (hero-management.test.ts)
- **45英雄验证**: 三大类别×15英雄的完整性验证
- **稀有度系统**: S/A/B/C四档稀有度机制测试
- **属性计算**: 战力公式和成长曲线验证
- **技能系统**: 4技能类型的完整性和平衡性测试
- **摆烂主题**: 所有英雄的风格一致性验证

### 编队战斗系统 (formation-system.test.ts)
- **5位置配置**: 前排3+后排2的编队机制
- **位置权重**: 前排承伤+30%，后排输出+20%的验证
- **出手顺序**: 基于敏捷度的战斗顺序计算
- **战力计算**: 编队总战力和调整战力的算法验证
- **AI决策**: 自动战斗的智能决策验证

### 技能配合系统 (skill-combination.test.ts)
- **三类配合**: 元素反应、职业协同、生活共鸣
- **多层配合**: 2-5技能的递进伤害倍数验证
- **触发机制**: 5秒窗口期和配合条件检测
- **预览系统**: 配合伤害计算器和推荐系统
- **记录统计**: 配合发现和使用统计功能

### 盐场PvP系统 (salt-field-pvp.test.ts)
- **六边格地图**: 127地块的六边形坐标系验证
- **20俱乐部竞技**: 同时参与的俱乐部机制测试
- **战力衰减**: 精力、疲劳、距离三重衰减系统
- **据点积分**: 每分钟积分结算和排行榜更新
- **500人并发**: 大规模实时战斗负载测试

### 盐罐PvP系统 (salt-jar-pvp.test.ts)
- **客厅访问**: 玩家间客厅访问机制
- **三档盐罐**: 金/银/普通盐罐的差异化设计
- **30秒机制**: 占领到收集的时间控制
- **PvP争夺**: 盐罐争夺战的完整流程
- **每日限制**: 20个盐罐的访问限制验证

### 安全防护系统 (security-anti-cheat.test.ts)
- **数值篡改检测**: 战力、金币、经验值异常检测
- **技能作弊防范**: 非法技能组合和冷却操纵检测
- **PvP作弊检测**: 连胜模式、胜率异常、位置瞬移检测
- **输入验证**: SQL注入、XSS攻击、恶意输入防护
- **频率限制**: API调用、操作频率的智能限制

### 性能并发系统 (performance-concurrent.test.ts)
- **1万用户并发**: 登录、在线、操作的大规模并发测试
- **500人战斗**: 盐场大规模实时战斗性能验证
- **数据库优化**: 查询性能、连接池、索引效率测试
- **缓存系统**: Redis缓存命中率和性能提升验证
- **网络传输**: WebSocket连接管理和消息队列性能

## 🎯 关键验收标准

### 功能完整性
- [ ] 45个英雄全部通过属性和技能验证
- [ ] 100+技能配合组合可正确触发和计算
- [ ] 盐场六边格地图支持20俱乐部竞技
- [ ] 盐罐系统支持完整的PvP争夺流程

### 性能指标
- [ ] 45英雄数据加载时间 < 2秒
- [ ] 编队配置响应时间 < 0.5秒
- [ ] 技能配合计算延迟 < 100ms
- [ ] 支持1万用户并发在线
- [ ] 支持500人同时战斗

### 安全保障
- [ ] 数值篡改检出率 > 95%
- [ ] 恶意输入100%被拦截
- [ ] PvP作弊行为实时检测
- [ ] 系统稳定性 > 99.9%

## 📈 测试报告

运行 `npm run test:coverage` 后，将在 `coverage/` 目录生成详细的测试覆盖率报告：

- **HTML报告**: `coverage/index.html`
- **LCOV报告**: `coverage/lcov.info`
- **文本报告**: 控制台输出

### 目标覆盖率
- **语句覆盖率**: > 90%
- **分支覆盖率**: > 85%
- **函数覆盖率**: > 95%
- **行覆盖率**: > 90%

## 🔧 测试配置

### Jest配置
- **测试环境**: Node.js
- **预设**: ts-jest (TypeScript支持)
- **超时时间**: 30秒 (适应性能测试)
- **并发控制**: 50% CPU核心数

### 自定义匹配器
```typescript
expect(heroId).toBeValidHeroId(); // 验证英雄ID格式
expect(formation).toBeValidFormation(); // 验证编队有效性
expect(value).toBeBetween(min, max); // 验证数值范围
expect(time).toBeWithinPerformanceLimit(maxTime); // 验证性能要求
```

## 🐛 调试指南

### 常见测试失败原因
1. **数据库连接失败**: 确保测试数据库可访问
2. **Redis连接失败**: 确保Redis服务运行在测试端口
3. **性能测试超时**: 可能需要更强的硬件环境
4. **并发测试不稳定**: 调整并发数量和超时时间

### 调试技巧
```bash
# 运行单个测试文件并显示详细输出
npm test tests/hero-management.test.ts -- --verbose

# 运行特定测试用例
npm test -- --testNamePattern="应该正确加载所有45个英雄"

# 在CI环境运行
npm run test:ci
```

## 🔄 持续集成

### GitHub Actions配置示例
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd tests && npm ci
      - run: cd tests && npm run test:ci
```

## 📝 贡献指南

### 添加新测试
1. 按照现有测试结构编写测试用例
2. 使用中文注释说明测试目的
3. 确保测试用例名称清晰描述期望行为
4. 包含正常流程、边界条件和错误处理测试

### 测试命名规范
- 测试套件：`describe('系统名称测试', () => {})`
- 测试用例：`test('应该[期望行为]', async () => {})`
- 中文描述：使用中文清晰描述测试目的和期望结果

---

**注意**: 本测试套件基于TDD原则设计，所有测试当前应该处于FAILING状态。这是正常的，因为对应的实现代码尚未编写。测试套件的目的是为开发团队提供明确的实现目标和验收标准。

📞 **支持**: 如有测试相关问题，请联系QA团队或查看项目文档。