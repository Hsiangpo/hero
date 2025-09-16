# 封神挂机录 - 项目文件组织结构
**版本**: 1.0 (单一版本)
**更新日期**: 2025-09-16
**用途**: 为各个AI agents提供明确的文件归属和操作权限

---

## 📁 核心目录结构

### 🎮 Game_Designer_Agent 权限区域
```
specs/                           # 游戏设计文档 (GDD)
├── fengshen-core-gameplay.md   # 封神挂机录核心设计文档 ✅

docs/design/                     # 详细设计文档
├── faction_synergy.md          # 阵营协同机制设计
├── formation_traits.md         # 编队特性设计
└── guild_war_tournament_overview.md # 封域之争周赛设计
```

### 🧪 QA_Tester_Agent 权限区域
```
tests/                          # 测试框架和用例
├── package.json               # Jest配置和测试命令
├── README.md                  # 测试指南
├── TEST_COVERAGE_SUMMARY.md   # 测试覆盖率报告
├── setup.ts                   # 测试环境设置
├── *.test.ts                  # 各系统测试用例 (12个文件)
├── fixtures/                  # 测试数据 (待创建)
└── mocks/                     # 模拟数据 (待创建)
```

### 🎨 Frontend_Agent 权限区域
```
assets/                         # Cocos Creator游戏资源
├── scripts/                   # TypeScript游戏脚本
├── scenes/                    # Cocos Creator场景文件
├── prefabs/                   # 预制体文件
└── art-specs/                 # 美术资源规格说明

src/                           # 前端组件和UI代码
├── components/                # UI组件
└── ui/                        # 用户界面相关代码
```

### 🔧 Backend_Logic_Agent 权限区域
```
src/                           # 核心业务逻辑
├── logic/                     # 游戏核心逻辑
├── services/                  # 服务层
├── models/                    # 数据模型
├── utils/                     # 工具函数
└── types/                     # TypeScript类型定义
```

### 💰 Monetization_Agent 权限区域
```
src/                           # 商业化相关代码
├── monetization/              # 商业化SDK集成
├── payments/                  # 支付系统
└── ads/                       # 广告SDK集成
```

### 🏗️ Backend_Architect_Agent 权限区域
```
docs/architecture/             # 架构设计文档
├── backend-architecture.md   # 后端架构设计 ✅
└── fengshen-pvp-architecture.md # PvP系统架构 ✅

src/                           # 架构相关配置
├── config/                    # 配置文件
└── schemas/                   # 数据库模式定义
```

### 🎨 Art_Director_Agent 权限区域
```
docs/art/                      # 美术设计文档
└── art-style-guide.md        # 美术风格指南 ✅

assets/art-specs/              # 美术资源规格
└── (美术资源规格文件)
```

### 🎵 Sound_Designer_Agent 权限区域
```
docs/audio/                    # 音效设计文档
└── audio-design-guide.md     # 音效设计指南 ✅

assets/audio-specs/            # 音效资源规格
└── (音效资源规格文件)
```

### 📊 Data_Engineer_Analyst_Agent 权限区域
```
docs/analytics/                # 数据分析文档
└── (分析报告和追踪计划)

src/                           # 数据分析代码
├── analytics/                 # 数据分析
└── tracking/                  # 数据追踪
```

### 🎯 LiveOps_Manager_Agent 权限区域
```
docs/liveops/                  # 运营活动文档
└── (活动设计和运营计划)

src/events/                    # 活动系统代码
└── (活动逻辑实现)

packages/content/events/       # 活动配置数据 ✅
├── cycle_rewards.csv         # 三周循环奖励
└── three_week_cycle_activities.json # 三周循环活动配置
```

### 👥 Community_Manager_Agent 权限区域
```
docs/community/                # 社区管理文档
└── (社区管理计划和公告)

.claude/community/             # 社区反馈记录
└── (社区互动记录)
```

### 🔍 Refactor_And_Review_Agent 权限区域
```
docs/reviews/                  # 代码审查报告 (待创建)
└── (代码质量审查报告)

.claude/reviews/               # 内部审查记录 (待创建)
└── (内部代码审查记录)
```

### 📚 Documentation_Agent 权限区域
```
docs/                          # 技术文档
├── api/                       # API文档 (待创建)
└── README.md                  # 项目说明 (待创建)

CLAUDE.md                      # Claude Code操作指南 ✅
```

---

## 🎮 游戏内容配置文件 (所有agents只读，LiveOps_Manager_Agent可写events/)

```
packages/content/              # 结构化游戏内容配置
├── campaign/                  # 战役系统配置
│   ├── chapters.json         # 章节配置
│   ├── idle_system.json      # 挂机系统配置
│   ├── progression_rewards.json # 进度奖励
│   ├── stages.json           # 关卡配置
│   └── sweep_system.json     # 扫荡系统配置
├── dungeons/                  # 副本系统配置
│   ├── dream_realm_drops.csv # 幻境掉落配置
│   └── dream_realm_system.json # 幻境系统配置
├── events/                    # 活动配置 (LiveOps_Manager_Agent可写)
│   ├── cycle_rewards.csv     # 循环奖励
│   └── three_week_cycle_activities.json # 三周循环活动
├── guild_war/                 # 公会战配置
│   ├── anti_cheat_system.json # 反作弊系统
│   ├── battlefield_system.json # 战场系统
│   ├── black_market_system.json # 黑市系统
│   ├── registration_system.json # 报名系统
│   ├── rewards_system.json   # 奖励系统
│   ├── skin_shop_system.json # 皮肤商店
│   ├── spectator_system.json # 观战系统
│   └── tournament_system.json # 锦标赛系统
├── modes/                     # 游戏模式配置
│   ├── daily_trials.json     # 日常试炼
│   ├── faction_challenges.json # 阵营挑战
│   └── fengshen_tower.json   # 封神塔
├── pvp/                       # PvP系统配置
│   ├── arena_defense.json    # 竞技场防守
│   ├── arena_rewards.json    # 竞技场奖励
│   ├── arena_system.json     # 竞技场系统
│   ├── battle_pass.json      # 战斗通行证
│   └── ranking_system.json   # 排名系统
├── roles/                     # 角色配置
│   ├── heroes.csv           # 英雄数据
│   └── skills.csv           # 技能数据
└── shop/                      # 商店配置
    ├── black_market_items.csv # 黑市物品
    ├── promotional_events.json # 促销活动
    └── skin_catalog.csv      # 皮肤目录
```

---

## 🚫 受保护区域 (所有agents禁止修改)

```
temp/                          # Cocos Creator临时文件
library/                       # Cocos Creator缓存
.git/                         # Git版本控制
profiles/                     # Cocos Creator配置
settings/                     # Cocos Creator设置
.creator/                     # Cocos Creator元数据
```

---

## 🛠️ 项目配置文件

```
package.json                   # 项目依赖 (uuid字段受保护)
tsconfig.json                 # TypeScript配置 (extends字段受保护)
.gitignore                    # Git忽略配置
API_DESIGN_GUIDE.md           # API设计指南
CODING_STYLE_GUIDE.md         # 代码风格指南
GIT_WORKFLOW.md               # Git工作流指南
```

---

## 📋 文件操作权限总结

### 📝 可写权限
- **Game_Designer_Agent**: `specs/`, `docs/design/`
- **QA_Tester_Agent**: `tests/`
- **Frontend_Agent**: `assets/scripts/`, `src/components/`, `src/ui/`
- **Backend_Logic_Agent**: `src/logic/`, `src/services/`, `src/models/`
- **Monetization_Agent**: `src/monetization/`, `src/payments/`, `src/ads/`
- **Backend_Architect_Agent**: `docs/architecture/`, `src/config/`, `src/schemas/`
- **Art_Director_Agent**: `docs/art/`, `assets/art-specs/`
- **Sound_Designer_Agent**: `docs/audio/`, `assets/audio-specs/`
- **Data_Engineer_Analyst_Agent**: `docs/analytics/`, `src/analytics/`, `src/tracking/`
- **LiveOps_Manager_Agent**: `docs/liveops/`, `src/events/`, `packages/content/events/`
- **Community_Manager_Agent**: `docs/community/`, `.claude/community/`
- **Refactor_And_Review_Agent**: `docs/reviews/`, `.claude/reviews/`
- **Documentation_Agent**: `docs/`, `CLAUDE.md`, `README.md`

### 👁️ 只读权限
- **所有agents**: `packages/content/` (除events/目录)
- **Refactor_And_Review_Agent**: 可读取所有源代码文件进行审查

### ❌ 禁止访问
- **所有agents**: `temp/`, `library/`, `.git/`, 项目外路径

---

**此文件组织结构确保每个AI agent都有明确的工作区域，避免文件冲突，提高协作效率。所有文件均为单一版本，无版本后缀。**