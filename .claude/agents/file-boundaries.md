# AI Agents 文件操作边界规范
**版本**: 1.0
**创建日期**: 2025-09-16
**适用范围**: 封神挂机录项目所有AI agents

---

## 🚨 核心安全原则

### 绝对禁止操作的路径
```bash
# 系统关键目录 - 绝对禁止
C:\Windows\*
C:\Program Files\*
C:\Program Files (x86)\*
C:\Users\Administrator\Documents\*
C:\Users\Administrator\Desktop\*

# 项目外目录 - 绝对禁止
D:\Develop\*（除hero-idle-game外的任何目录）
D:\*（除Develop目录外的任何路径）
```

### 项目根目录定义
```bash
PROJECT_ROOT = "D:\Develop\Masterpiece\game\hero-idle-game"
```

**所有文件操作MUST在此根目录内进行，任何越界操作将被视为严重违规。**

---

## 📁 各Agent文件操作权限矩阵

### 🎮 Game_Designer_Agent (游戏设计师)
**允许写入路径**:
```
✅ ${PROJECT_ROOT}/specs/                    # 游戏设计文档
✅ ${PROJECT_ROOT}/docs/design/              # 详细设计说明
```
**禁止路径**:
```
❌ ${PROJECT_ROOT}/assets/                   # 游戏资源文件
❌ ${PROJECT_ROOT}/tests/                    # 测试文件
❌ ${PROJECT_ROOT}/src/                      # 源代码文件
❌ ${PROJECT_ROOT}/temp/                     # Cocos Creator临时文件
```

### 🧪 QA_Tester_Agent (QA测试)
**允许写入路径**:
```
✅ ${PROJECT_ROOT}/tests/                    # 测试文件
✅ ${PROJECT_ROOT}/tests/fixtures/           # 测试数据
✅ ${PROJECT_ROOT}/tests/mocks/              # 模拟数据
```
**禁止路径**:
```
❌ ${PROJECT_ROOT}/assets/                   # 游戏资源文件
❌ ${PROJECT_ROOT}/src/                      # 源代码实现
❌ ${PROJECT_ROOT}/specs/                    # 设计文档
❌ ${PROJECT_ROOT}/temp/                     # Cocos Creator文件
```

### 🎨 Frontend_Agent (前端开发)
**允许写入路径**:
```
✅ ${PROJECT_ROOT}/assets/scripts/           # TypeScript组件代码
✅ ${PROJECT_ROOT}/assets/scenes/            # Cocos Creator场景
✅ ${PROJECT_ROOT}/assets/prefabs/           # 预制体文件
✅ ${PROJECT_ROOT}/src/components/           # 前端组件
✅ ${PROJECT_ROOT}/src/ui/                   # UI相关代码
```
**禁止路径**:
```
❌ ${PROJECT_ROOT}/temp/                     # Cocos Creator生成的临时文件
❌ ${PROJECT_ROOT}/library/                  # Cocos Creator缓存
❌ ${PROJECT_ROOT}/tests/                    # 测试文件（除非修复测试）
❌ ${PROJECT_ROOT}/docs/                     # 文档文件
```

### 🔧 Backend_Logic_Agent (后端逻辑)
**允许写入路径**:
```
✅ ${PROJECT_ROOT}/src/logic/                # 业务逻辑代码
✅ ${PROJECT_ROOT}/src/services/             # 服务层代码
✅ ${PROJECT_ROOT}/src/models/               # 数据模型
✅ ${PROJECT_ROOT}/src/utils/                # 工具函数
✅ ${PROJECT_ROOT}/src/types/                # TypeScript类型定义
```
**禁止路径**:
```
❌ ${PROJECT_ROOT}/assets/                   # Cocos Creator资源
❌ ${PROJECT_ROOT}/temp/                     # 临时文件
❌ ${PROJECT_ROOT}/tests/                    # 测试文件（除非修复测试）
❌ ${PROJECT_ROOT}/specs/                    # 设计文档
```

### 💰 Monetization_Agent (商业化)
**允许写入路径**:
```
✅ ${PROJECT_ROOT}/src/monetization/         # 商业化SDK代码
✅ ${PROJECT_ROOT}/src/payments/             # 支付相关代码
✅ ${PROJECT_ROOT}/src/ads/                  # 广告SDK集成
```
**禁止路径**:
```
❌ ${PROJECT_ROOT}/assets/                   # 游戏资源
❌ ${PROJECT_ROOT}/tests/                    # 测试文件
❌ ${PROJECT_ROOT}/specs/                    # 设计文档
❌ ${PROJECT_ROOT}/src/logic/                # 核心业务逻辑
```

### 🔍 Refactor_And_Review_Agent (重构审查)
**允许读取所有路径，写入权限**:
```
✅ ${PROJECT_ROOT}/docs/reviews/             # 代码审查报告
✅ ${PROJECT_ROOT}/.claude/reviews/          # 内部审查记录
```
**禁止修改**:
```
❌ ${PROJECT_ROOT}/src/*                     # 不得直接修改源码（只能提建议）
❌ ${PROJECT_ROOT}/assets/*                  # 不得修改资源文件
❌ ${PROJECT_ROOT}/tests/*                   # 不得修改测试文件
❌ ${PROJECT_ROOT}/specs/*                   # 不得修改设计文档
```

### 📚 Documentation_Agent (文档)
**允许写入路径**:
```
✅ ${PROJECT_ROOT}/docs/                     # 技术文档
✅ ${PROJECT_ROOT}/docs/api/                 # API文档
✅ ${PROJECT_ROOT}/docs/architecture/        # 架构文档
✅ ${PROJECT_ROOT}/README.md                 # 项目说明
```
**禁止路径**:
```
❌ ${PROJECT_ROOT}/src/                      # 源代码文件
❌ ${PROJECT_ROOT}/assets/                   # 游戏资源
❌ ${PROJECT_ROOT}/tests/                    # 测试文件
❌ ${PROJECT_ROOT}/specs/                    # 游戏设计文档（不得修改）
```

### 🎨 Art_Director_Agent (美术指导)
**允许写入路径**:
```
✅ ${PROJECT_ROOT}/docs/art/                 # 美术指南文档
✅ ${PROJECT_ROOT}/assets/art-specs/         # 美术规格说明
✅ ${PROJECT_ROOT}/assets/textures/          # 纹理资源（如有AI生成）
✅ ${PROJECT_ROOT}/.claude/art-assets/       # 美术资源清单
```
**禁止路径**:
```
❌ ${PROJECT_ROOT}/src/                      # 源代码
❌ ${PROJECT_ROOT}/tests/                    # 测试文件
❌ ${PROJECT_ROOT}/temp/                     # 临时文件
❌ ${PROJECT_ROOT}/library/                  # Cocos Creator缓存
```

### 🎵 Sound_Designer_Agent (音效设计)
**允许写入路径**:
```
✅ ${PROJECT_ROOT}/docs/audio/               # 音效设计文档
✅ ${PROJECT_ROOT}/assets/audio-specs/       # 音效规格说明
✅ ${PROJECT_ROOT}/.claude/audio-assets/     # 音效资源清单
```
**禁止路径**:
```
❌ ${PROJECT_ROOT}/src/                      # 源代码
❌ ${PROJECT_ROOT}/tests/                    # 测试文件
❌ ${PROJECT_ROOT}/assets/scripts/           # 脚本代码
```

### 🏗️ Backend_Architect_Agent (后端架构师)
**允许写入路径**:
```
✅ ${PROJECT_ROOT}/docs/architecture/        # 架构设计文档
✅ ${PROJECT_ROOT}/docs/database/            # 数据库设计
✅ ${PROJECT_ROOT}/src/config/               # 配置文件
✅ ${PROJECT_ROOT}/src/schemas/              # 数据库模式定义
```
**禁止路径**:
```
❌ ${PROJECT_ROOT}/assets/                   # 游戏资源
❌ ${PROJECT_ROOT}/tests/                    # 测试文件
❌ ${PROJECT_ROOT}/specs/                    # 游戏设计文档
```

### 📊 Data_Engineer_Analyst_Agent (数据分析)
**允许写入路径**:
```
✅ ${PROJECT_ROOT}/src/analytics/            # 数据分析代码
✅ ${PROJECT_ROOT}/docs/analytics/           # 分析文档
✅ ${PROJECT_ROOT}/src/tracking/             # 数据追踪代码
```
**禁止路径**:
```
❌ ${PROJECT_ROOT}/assets/                   # 游戏资源
❌ ${PROJECT_ROOT}/tests/                    # 测试文件
❌ ${PROJECT_ROOT}/specs/                    # 设计文档
```

### 🎯 LiveOps_Manager_Agent (运营管理)
**允许写入路径**:
```
✅ ${PROJECT_ROOT}/docs/liveops/             # 运营文档
✅ ${PROJECT_ROOT}/src/events/               # 活动系统代码
✅ ${PROJECT_ROOT}/content/events/           # 活动配置数据
✅ ${PROJECT_ROOT}/packages/content/events/  # 活动内容配置
```
**禁止路径**:
```
❌ ${PROJECT_ROOT}/src/logic/                # 核心游戏逻辑
❌ ${PROJECT_ROOT}/tests/                    # 测试文件
❌ ${PROJECT_ROOT}/assets/                   # 游戏资源
```

### 👥 Community_Manager_Agent (社区管理)
**允许写入路径**:
```
✅ ${PROJECT_ROOT}/docs/community/           # 社区管理文档
✅ ${PROJECT_ROOT}/.claude/community/        # 社区反馈记录
```
**禁止路径**:
```
❌ ${PROJECT_ROOT}/src/                      # 所有源代码
❌ ${PROJECT_ROOT}/assets/                   # 游戏资源
❌ ${PROJECT_ROOT}/tests/                    # 测试文件
❌ ${PROJECT_ROOT}/specs/                    # 设计文档
```

---

## 🔒 安全验证机制

### 文件路径验证规则
```typescript
// 每个agent必须在文件操作前验证路径
function validateFilePath(agentType: string, filePath: string): boolean {
  const PROJECT_ROOT = "D:\\Develop\\Masterpiece\\game\\hero-idle-game";

  // 1. 必须在项目根目录内
  if (!filePath.startsWith(PROJECT_ROOT)) {
    throw new Error(`❌ 路径越界: ${filePath} 不在项目根目录内`);
  }

  // 2. 检查agent特定权限
  const allowedPaths = getAgentAllowedPaths(agentType);
  const isAllowed = allowedPaths.some(path => filePath.startsWith(path));

  if (!isAllowed) {
    throw new Error(`❌ 权限不足: ${agentType} 无权访问 ${filePath}`);
  }

  return true;
}
```

### 禁止操作列表
```bash
❌ 绝对禁止删除 temp/ 和 library/ 目录
❌ 绝对禁止修改 tsconfig.json 中的 extends 字段
❌ 绝对禁止修改 .git/ 目录内容
❌ 绝对禁止在项目外创建任何文件
❌ 绝对禁止修改 package.json 的 uuid 字段
```

---

## 📋 违规处理机制

### 轻微违规 (Warning)
- 尝试访问无权限但无害的路径
- **处理**: 警告并阻止操作

### 严重违规 (Error)
- 尝试访问项目外路径
- 尝试删除关键配置文件
- **处理**: 立即终止任务执行

### 恶意违规 (Critical)
- 尝试访问系统关键目录
- 尝试修改安全敏感文件
- **处理**: 永久禁用agent，报告给Orchestrator

---

**此规范是强制性的安全边界，所有AI agents必须严格遵守。违反此规范将导致任务失败和agent权限回收。**