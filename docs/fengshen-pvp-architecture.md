# 《封神挂机录》封域之争PvP系统后端架构设计

## 版本信息
- **文档版本**: V1.0
- **创建日期**: 2025-09-16
- **架构师**: Backend_Architect_Agent
- **项目**: 封神挂机录 - 封域之争PvP系统

---

## 1. 系统概述

### 1.1 业务需求
"封域之争"是《封神挂机录》的核心PvP玩法，要求支持：
- **20宗门同时竞技**，每宗门最多20人，总计400名玩家同时在线
- **六边形地图120格**实时同步，包含主殿、金银铜灵脉、天门、观星台等据点
- **实时延迟<100ms**，确保御云飞行、瞬移神通等操作流畅体验
- **法力衰减系统**防止滚雪球，保证竞技公平性
- **羁绊技能实时计算**，支持师徒情深、父子同心等联手技能

### 1.2 技术挑战
1. **高并发实时通信**：400用户同时在线，频繁位置更新和状态同步
2. **低延迟要求**：PvP战斗要求<100ms响应时间
3. **数据一致性**：多服务器环境下的游戏状态同步
4. **防作弊机制**：服务器权威性验证，防止客户端篡改
5. **可伸缩性**：从MVP的100用户平滑扩展到10,000+用户

---

## 2. 技术选型与架构决策

### 2.1 核心技术栈
| 技术组件 | 选型方案 | 决策理由 |
|---------|----------|----------|
| **实时通信** | Socket.IO + Node.js集群 | 成熟的WebSocket方案，支持自动降级和集群扩展 |
| **缓存层** | Redis Cluster | 支持分片、高性能读写、Sorted Sets天然支持排行榜 |
| **持久化** | MongoDB | 文档数据库适合游戏复杂状态存储，水平扩展能力强 |
| **消息队列** | Redis Streams | 保证消息顺序性，支持消息重放和故障恢复 |
| **负载均衡** | NGINX + Sticky Sessions | 保证WebSocket连接的会话粘性 |
| **容器化** | Docker + Kubernetes | 微服务部署，弹性伸缩 |

### 2.2 架构选型对比

#### 2.2.1 实时通信方案对比
| 方案 | 优势 | 劣势 | 适用场景 |
|-----|------|------|---------|
| **Socket.IO集群** ✅ | 成熟稳定、自动降级、集群支持 | 单点会话粘性 | **当前最佳选择** |
| WebRTC P2P | 超低延迟、去中心化 | 复杂度高、穿透困难 | 小规模对战 |
| 原生WebSocket | 性能最优 | 缺乏降级机制 | 追求极致性能 |

#### 2.2.2 数据存储策略对比
| 策略 | 成本 | 复杂度 | 性能 | 可维护性 | **选择** |
|-----|------|--------|------|----------|---------|
| **混合架构**（推荐） | 中等 | 中等 | 高 | 好 | ✅ **MVP采用** |
| 纯Redis | 高 | 低 | 极高 | 一般 | 后期考虑 |
| 纯MongoDB | 低 | 低 | 中等 | 好 | 不适合实时PvP |

**选择理由**：混合架构在MVP阶段平衡了成本、性能和复杂度，为后续扩展提供清晰升级路径。

---

## 3. 系统架构设计

### 3.1 整体架构图

```
                          [NGINX负载均衡]
                                |
                    +----------+----------+
                    |                     |
            [Socket.IO Node 1]    [Socket.IO Node 2]  ... [Socket.IO Node N]
                    |                     |
                    +----------+----------+
                               |
                    [Redis Cluster (实时状态)]
                               |
                    [MongoDB Cluster (持久化)]
                               |
                    [Redis Streams (消息队列)]
```

### 3.2 微服务架构设计

#### 3.2.1 服务分层
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   客户端层      │    │   网关层        │    │   应用服务层    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ - Cocos Creator │    │ - NGINX         │    │ - 战斗服务      │
│ - WebSocket客户端│    │ - 负载均衡      │    │ - 匹配服务      │
│ - 状态同步      │    │ - SSL终端       │    │ - 排行榜服务    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   数据层        │    │   缓存层        │    │   消息层        │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ - MongoDB主从   │    │ - Redis Cluster │    │ - Redis Streams │
│ - 用户数据      │    │ - 实时状态      │    │ - 事件消息      │
│ - 历史战绩      │    │ - 排行榜缓存    │    │ - 系统通知      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### 3.2.2 核心服务模块

##### A. 战斗服务 (Battle Service)
```javascript
// 核心职责
- 处理玩家移动、攻击、技能释放
- 法力值衰减计算
- 羁绊技能触发判定
- 据点占领状态更新
- 实时积分计算

// 技术实现
- Node.js + Express
- Redis状态缓存
- MongoDB持久化
- 服务器权威性验证
```

##### B. 匹配服务 (Matchmaking Service)
```javascript
// 核心职责
- 宗门实力评估（三维匹配算法）
- 20宗门智能分组
- 战场实例创建和管理
- 玩家断线重连处理

// 匹配算法
1. 战力分区：青铜(100万) → 钻石(2000万+)
2. 氪金分层：低消费(50元) → 高消费(200元+)
3. 活跃度匹配：避免活跃宗门vs不活跃宗门
```

##### C. 排行榜服务 (Leaderboard Service)
```javascript
// 核心职责
- 实时积分更新
- 宗门排名计算
- 个人贡献统计
- 历史战绩查询

// Redis Sorted Sets实现
ZADD leaderboard:battle_123 score sect_id
ZRANGE leaderboard:battle_123 0 19 WITHSCORES  // 获取前20名
ZRANK leaderboard:battle_123 sect_id           // 获取排名
```

---

## 4. 实时通信架构

### 4.1 WebSocket集群方案

#### 4.1.1 Socket.IO集群配置
```javascript
// server.js - Socket.IO集群配置
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const { setupPrimary, NodeClusterEngine } = require('@socket.io/cluster-engine');
const { createClient } = require('redis');

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // 创建Redis连接用于集群通信
  const pubClient = createClient({ host: 'redis-cluster' });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  // 设置集群间通信
  setupPrimaryWithRedis(pubClient, subClient);

  // 启动worker进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Worker进程：运行Socket.IO服务器
  const engine = new NodeClusterEngine();
  const io = new Server();
  io.bind(engine);

  httpServer.listen(3000);
  console.log(`Worker ${process.pid} started`);
}
```

#### 4.1.2 消息路由策略
```javascript
// 房间管理和消息路由
io.on('connection', (socket) => {
  // 加入战场房间
  socket.on('join_battle', (battleId, sectId) => {
    socket.join(`battle_${battleId}`);
    socket.join(`sect_${sectId}`);

    // 广播加入消息
    socket.to(`battle_${battleId}`).emit('player_joined', {
      playerId: socket.userId,
      sectId: sectId
    });
  });

  // 位置更新（高频消息）
  socket.on('player_move', async (data) => {
    // 服务器验证移动合法性
    const isValid = await validateMove(data);
    if (!isValid) return;

    // 更新Redis状态
    await redis.hset(`player:${socket.userId}`, {
      x: data.x,
      y: data.y,
      timestamp: Date.now()
    });

    // 广播给房间内其他玩家
    socket.to(`battle_${data.battleId}`).emit('player_moved', {
      playerId: socket.userId,
      x: data.x,
      y: data.y
    });
  });
});
```

### 4.2 状态同步机制

#### 4.2.1 分层同步策略
```javascript
// 消息分层处理
const MESSAGE_PRIORITIES = {
  HIGH: ['player_move', 'skill_cast', 'damage_dealt'],      // 50ms同步
  MEDIUM: ['resource_update', 'building_captured'],         // 200ms同步
  LOW: ['leaderboard_update', 'battle_log']                 // 1000ms同步
};

// 消息压缩和批处理
class MessageBatcher {
  constructor() {
    this.batches = new Map();
    this.timer = setInterval(() => this.flush(), 50); // 50ms批处理
  }

  add(priority, message) {
    if (!this.batches.has(priority)) {
      this.batches.set(priority, []);
    }
    this.batches.get(priority).push(message);
  }

  flush() {
    for (const [priority, messages] of this.batches) {
      if (messages.length > 0) {
        this.broadcast(priority, messages);
        this.batches.set(priority, []);
      }
    }
  }
}
```

#### 4.2.2 状态压缩算法
```javascript
// Delta压缩：只传输变化的数据
class DeltaCompressor {
  constructor() {
    this.lastStates = new Map();
  }

  compress(playerId, newState) {
    const lastState = this.lastStates.get(playerId) || {};
    const delta = {};

    for (const [key, value] of Object.entries(newState)) {
      if (lastState[key] !== value) {
        delta[key] = value;
      }
    }

    this.lastStates.set(playerId, newState);
    return delta;
  }
}

// 地图区域优化：只向相关区域玩家推送
function getRelevantPlayers(playerPosition, allPlayers) {
  const VISION_RANGE = 5; // 视野范围：5格
  return allPlayers.filter(player => {
    const distance = calculateDistance(playerPosition, player.position);
    return distance <= VISION_RANGE;
  });
}
```

---

## 5. 数据存储设计

### 5.1 数据分层存储策略

#### 5.1.1 存储层划分
```
┌─────────────────────────────────────────────────────────┐
│                  Redis 热数据层 (内存)                  │
├─────────────────────────────────────────────────────────┤
│ • 实时战斗状态 (TTL: 2小时)                             │
│ • 玩家位置信息 (TTL: 10分钟)                            │
│ • 实时排行榜 (Sorted Sets)                              │
│ • 法力值状态 (Hash)                                     │
│ • 据点控制信息 (Hash)                                   │
└─────────────────────────────────────────────────────────┘
                              ↓ 异步同步
┌─────────────────────────────────────────────────────────┐
│                MongoDB 温数据层 (SSD)                   │
├─────────────────────────────────────────────────────────┤
│ • 用户基础信息                                          │
│ • 宗门数据                                              │
│ • 历史战绩                                              │
│ • 羁绊配置                                              │
│ • 角色装备信息                                          │
└─────────────────────────────────────────────────────────┘
                              ↓ 定期归档
┌─────────────────────────────────────────────────────────┐
│              对象存储 冷数据层 (归档)                   │
├─────────────────────────────────────────────────────────┤
│ • 历史日志 (>30天)                                      │
│ • 战斗录像                                              │
│ • 统计报表                                              │
└─────────────────────────────────────────────────────────┘
```

#### 5.1.2 Redis数据结构设计

##### A. 实时排行榜 (Sorted Sets)
```redis
# 战场实时积分排行榜
ZADD battle:123:leaderboard 8456 "昆仑派"
ZADD battle:123:leaderboard 7233 "截教门"
ZADD battle:123:leaderboard 6890 "阐教"

# 查询操作
ZRANGE battle:123:leaderboard 0 19 WITHSCORES REV    # 前20名
ZRANK battle:123:leaderboard "昆仑派"                 # 获取排名
ZSCORE battle:123:leaderboard "昆仑派"                # 获取分数
ZINCRBY battle:123:leaderboard 100 "昆仑派"           # 增加分数
```

##### B. 玩家状态 (Hash)
```redis
# 玩家实时状态
HSET player:12345 x 150 y 200 hp 850 mp 65 last_update 1695123456
HMGET player:12345 x y hp mp                         # 批量获取
HINCRBY player:12345 mp -10                          # 法力值消耗
EXPIRE player:12345 600                              # 10分钟TTL
```

##### C. 据点控制状态 (Hash)
```redis
# 据点控制信息
HSET battlefield:123:point:5 controller "昆仑派" capture_time 1695123456 point_type "金灵脉"
HGETALL battlefield:123:point:5                      # 获取据点信息
```

##### D. 法力衰减系统 (Hash + Sorted Sets)
```redis
# 玩家法力值状态
HSET mana:player:12345 current 65 max 100 last_recovery 1695123456

# 法力恢复队列（按时间排序）
ZADD mana:recovery:queue 1695123516 "player:12345"   # 60秒后恢复
```

#### 5.1.3 MongoDB数据模型设计

##### A. 用户集合 (users)
```javascript
{
  _id: ObjectId("..."),
  userId: "player_12345",
  username: "哪吒三太子",
  level: 45,
  vipLevel: 3,
  sectId: "kunlun_sect",
  heroes: [
    {
      heroId: "nezha",
      level: 50,
      equipment: [...],
      skills: [...]
    }
  ],
  stats: {
    totalBattles: 156,
    victories: 89,
    defeats: 67,
    avgScore: 2340
  },
  createdAt: ISODate("..."),
  lastLoginAt: ISODate("...")
}
```

##### B. 宗门集合 (sects)
```javascript
{
  _id: ObjectId("..."),
  sectId: "kunlun_sect",
  name: "昆仑仙宗",
  level: 4,
  leaderId: "player_12345",
  members: [
    {
      playerId: "player_12345",
      role: "leader",
      joinedAt: ISODate("..."),
      contribution: 15600
    }
  ],
  buildings: {
    hall: { level: 4, upgradingUntil: null },
    library: { level: 3, upgradingUntil: ISODate("...") },
    forge: { level: 2, upgradingUntil: null }
  },
  stats: {
    totalPower: 8234567,
    weeklyActive: 85,
    battleRecord: {
      weekly: { battles: 8, victories: 5 },
      monthly: { battles: 32, victories: 20 }
    }
  }
}
```

##### C. 战斗记录集合 (battles)
```javascript
{
  _id: ObjectId("..."),
  battleId: "battle_123",
  type: "weekly_pvp",
  startTime: ISODate("..."),
  endTime: ISODate("..."),
  participants: [
    {
      sectId: "kunlun_sect",
      players: ["player_12345", "player_12346"],
      finalScore: 8456,
      rank: 1
    }
  ],
  events: [
    {
      timestamp: ISODate("..."),
      type: "point_captured",
      data: {
        pointId: "golden_vein_1",
        capturedBy: "kunlun_sect",
        score: 120
      }
    }
  ],
  result: {
    winner: "kunlun_sect",
    finalRankings: [...]
  }
}
```

### 5.2 数据分片策略

#### 5.2.1 Redis Cluster分片方案
```javascript
// Redis集群配置：6节点 (3主3从)
const redisCluster = {
  nodes: [
    { host: 'redis-1', port: 7000 },  // 主节点1: hash slots 0-5460
    { host: 'redis-2', port: 7001 },  // 主节点2: hash slots 5461-10922
    { host: 'redis-3', port: 7002 },  // 主节点3: hash slots 10923-16383
    { host: 'redis-4', port: 7003 },  // 从节点1
    { host: 'redis-5', port: 7004 },  // 从节点2
    { host: 'redis-6', port: 7005 }   // 从节点3
  ],
  options: {
    enableReadyCheck: false,
    redisOptions: {
      password: process.env.REDIS_PASSWORD
    }
  }
};

// 分片键设计原则
const SHARD_KEYS = {
  // 按战场ID分片：同一战场数据在同一分片
  BATTLE_STATE: 'battle:{battleId}:state',
  PLAYER_STATE: 'battle:{battleId}:player:{playerId}',
  LEADERBOARD: 'battle:{battleId}:leaderboard',

  // 按用户ID分片：用户相关数据在同一分片
  USER_SESSION: 'user:{userId}:session',
  USER_PROFILE: 'user:{userId}:profile'
};
```

#### 5.2.2 MongoDB分片策略
```javascript
// MongoDB分片配置
sh.enableSharding("fengshen_game");

// 用户集合分片：按userId哈希分片
sh.shardCollection("fengshen_game.users", { "userId": "hashed" });

// 战斗记录分片：按battleId哈希分片
sh.shardCollection("fengshen_game.battles", { "battleId": "hashed" });

// 宗门集合分片：按sectId范围分片
sh.shardCollection("fengshen_game.sects", { "sectId": 1 });
```

---

## 6. 战斗逻辑服务设计

### 6.1 法力值衰减系统实现

#### 6.1.1 衰减算法实现
```javascript
class ManaSystem {
  constructor(redis) {
    this.redis = redis;
    this.DECAY_COEFFICIENT = 0.95;
    this.MIN_POWER_RATIO = 0.5;
    this.DECAY_THRESHOLD = 10; // 每10点法力值一个衰减档次
  }

  // 计算战力系数
  calculatePowerRatio(currentMana) {
    if (currentMana >= 100) return 1.0;

    const k = Math.floor((100 - currentMana) / this.DECAY_THRESHOLD);
    const decayRatio = Math.pow(this.DECAY_COEFFICIENT, k);

    return Math.max(this.MIN_POWER_RATIO, decayRatio);
  }

  // 应用法力衰减到战力
  async applyManaPenalty(playerId, basePower) {
    const mana = await this.redis.hget(`mana:${playerId}`, 'current');
    const powerRatio = this.calculatePowerRatio(parseInt(mana));
    const effectivePower = Math.floor(basePower * powerRatio);

    // 更新Redis中的有效战力
    await this.redis.hset(`player:${playerId}`, 'effectivePower', effectivePower);

    return {
      basePower,
      currentMana: parseInt(mana),
      powerRatio,
      effectivePower
    };
  }

  // 法力值恢复处理
  async processManaRecovery() {
    const now = Date.now();
    const recoveringPlayers = await this.redis.zrangebyscore(
      'mana:recovery:queue', 0, now, 'WITHSCORES'
    );

    for (let i = 0; i < recoveringPlayers.length; i += 2) {
      const playerId = recoveringPlayers[i];
      const recoveryTime = parseInt(recoveringPlayers[i + 1]);

      if (recoveryTime <= now) {
        await this.recoverMana(playerId);
        await this.redis.zrem('mana:recovery:queue', playerId);
      }
    }
  }

  // 单个玩家法力恢复
  async recoverMana(playerId) {
    const manaData = await this.redis.hmget(`mana:${playerId}`, 'current', 'max');
    const current = parseInt(manaData[0]);
    const max = parseInt(manaData[1]);

    if (current < max) {
      const newMana = Math.min(max, current + 1);
      await this.redis.hset(`mana:${playerId}`, 'current', newMana);

      // 如果还没满，继续排队恢复
      if (newMana < max) {
        const nextRecoveryTime = Date.now() + 60000; // 60秒后恢复1点
        await this.redis.zadd('mana:recovery:queue', nextRecoveryTime, playerId);
      }
    }
  }
}
```

#### 6.1.2 多段式衰减优化
```javascript
// 根据GDD中的优化设计
class OptimizedManaSystem extends ManaSystem {
  constructor(redis) {
    super(redis);

    // 多段式衰减系数
    this.DECAY_STAGES = [
      { range: [90, 100], ratio: 1.0 },    // 无衰减
      { range: [70, 89], ratio: 0.95 },    // 轻度衰减
      { range: [50, 69], ratio: 0.85 },    // 中度衰减
      { range: [30, 49], ratio: 0.70 },    // 重度衰减
      { range: [0, 29], ratio: 0.50 }      // 严重衰减（保底）
    ];
  }

  calculatePowerRatio(currentMana) {
    for (const stage of this.DECAY_STAGES) {
      if (currentMana >= stage.range[0] && currentMana <= stage.range[1]) {
        return stage.ratio;
      }
    }
    return this.MIN_POWER_RATIO;
  }

  // 动态恢复加速机制
  async calculateRecoveryBonus(playerId, battleState) {
    let recoveryBonus = 1.0;

    // 控制据点数量少时：恢复+50%
    const controlledPoints = await this.getControlledPoints(playerId, battleState);
    if (controlledPoints < 2) {
      recoveryBonus += 0.5;
    }

    // 连败3次以上：恢复+30%
    const recentDefeats = await this.getRecentDefeats(playerId);
    if (recentDefeats >= 3) {
      recoveryBonus += 0.3;
    }

    // 队友复活时：获得10点法力值
    const teamMateRespawned = await this.checkTeamMateRespawn(playerId);
    if (teamMateRespawned) {
      await this.redis.hincrby(`mana:${playerId}`, 'current', 10);
    }

    return recoveryBonus;
  }
}
```

### 6.2 羁绊技能系统实现

#### 6.2.1 羁绊检测与触发
```javascript
class BondSkillSystem {
  constructor(redis, mongodb) {
    this.redis = redis;
    this.mongodb = mongodb;

    // 羁绊配置表
    this.BOND_CONFIGS = {
      'master_disciple': {
        name: '师徒情深',
        requiredHeroes: ['jiangziya', 'yangjian'],
        level: 'legend',
        skillId: 'fengshen_summon',
        effects: {
          damageMultiplier: 2.0,
          areaRange: 'fullscreen',
          cooldown: 45000 // 45秒
        }
      },
      'father_son': {
        name: '父子同心',
        requiredHeroes: ['lijing', 'nezha'],
        level: 'legend',
        skillId: 'tower_suppress',
        effects: {
          controlDuration: 3000, // 3秒控制
          trueDamage: 3000, // 每秒3000真实伤害
          cooldown: 60000 // 60秒
        }
      }
    };
  }

  // 检测羁绊是否可用
  async checkBondAvailability(sectId, bondId) {
    const sectMembers = await this.getSectActiveMembers(sectId);
    const bondConfig = this.BOND_CONFIGS[bondId];

    if (!bondConfig) return false;

    // 检查必需角色是否都在场
    const requiredHeroes = bondConfig.requiredHeroes;
    const availableHeroes = sectMembers.map(member => member.currentHero);

    const hasAllHeroes = requiredHeroes.every(hero =>
      availableHeroes.includes(hero)
    );

    if (!hasAllHeroes) return false;

    // 检查冷却时间
    const lastUsed = await this.redis.hget(`sect:${sectId}:bonds`, bondId);
    const now = Date.now();

    if (lastUsed && (now - parseInt(lastUsed)) < bondConfig.effects.cooldown) {
      return false;
    }

    // 检查好感度（从MongoDB获取）
    const friendshipLevels = await this.getFriendshipLevels(sectMembers, requiredHeroes);
    const minFriendship = Math.min(...friendshipLevels);

    return minFriendship >= 3; // 要求好感度至少3级
  }

  // 触发羁绊技能
  async triggerBondSkill(sectId, bondId, targetArea) {
    const bondConfig = this.BOND_CONFIGS[bondId];
    const battleId = await this.getCurrentBattle(sectId);

    // 记录技能使用
    await this.redis.hset(`sect:${sectId}:bonds`, bondId, Date.now());

    // 计算技能伤害
    const sectMembers = await this.getSectActiveMembers(sectId);
    const totalAttack = sectMembers.reduce((sum, member) => sum + member.attack, 0);
    const bondDamage = totalAttack * bondConfig.effects.damageMultiplier;

    // 获取技能影响范围内的敌方目标
    const enemyTargets = await this.getEnemiesInRange(battleId, targetArea, bondConfig.effects.areaRange);

    // 应用技能效果
    const skillResult = {
      bondId,
      sectId,
      damage: bondDamage,
      targets: enemyTargets.length,
      effects: []
    };

    for (const enemy of enemyTargets) {
      const damage = await this.applyBondDamage(enemy.playerId, bondDamage);
      skillResult.effects.push({
        playerId: enemy.playerId,
        damage,
        eliminated: damage.eliminated
      });
    }

    // 广播羁绊技能效果
    await this.broadcastBondSkill(battleId, skillResult);

    return skillResult;
  }

  // 计算羁绊伤害（考虑五行相克）
  async applyBondDamage(targetPlayerId, baseDamage) {
    const targetInfo = await this.redis.hmget(`player:${targetPlayerId}`, 'hp', 'element', 'defense');
    const currentHp = parseInt(targetInfo[0]);
    const targetElement = targetInfo[1];
    const defense = parseInt(targetInfo[2]);

    // 五行相克计算
    const elementBonus = this.calculateElementBonus('mixed', targetElement); // 羁绊技能为混合属性
    const finalDamage = Math.floor((baseDamage * elementBonus) - defense);
    const actualDamage = Math.max(finalDamage, baseDamage * 0.1); // 最低10%伤害

    const newHp = Math.max(0, currentHp - actualDamage);
    await this.redis.hset(`player:${targetPlayerId}`, 'hp', newHp);

    return {
      damage: actualDamage,
      newHp,
      eliminated: newHp === 0
    };
  }
}
```

### 6.3 三维匹配算法实现

#### 6.3.1 宗门实力评估
```javascript
class MatchmakingSystem {
  constructor(redis, mongodb) {
    this.redis = redis;
    this.mongodb = mongodb;
  }

  // 三维匹配算法
  async findBalancedMatch(sectId) {
    const sectInfo = await this.getSectInfo(sectId);
    const sectRating = await this.calculateSectRating(sectInfo);

    // 查找相似实力的宗门
    const candidates = await this.findSimilarSects(sectRating);

    // 应用匹配过滤器
    const filtered = this.applyMatchFilters(candidates, sectInfo);

    // 选择最佳20个宗门
    const selectedSects = this.selectOptimalMatch(filtered, 20);

    return selectedSects;
  }

  // 计算宗门综合评分
  async calculateSectRating(sectInfo) {
    const powerRating = this.calculatePowerRating(sectInfo.totalPower);
    const spendingRating = this.calculateSpendingRating(sectInfo.monthlySpending);
    const activityRating = this.calculateActivityRating(sectInfo.weeklyActivity);

    return {
      power: powerRating,
      spending: spendingRating,
      activity: activityRating,
      overall: (powerRating + spendingRating + activityRating) / 3
    };
  }

  // 战力分区计算
  calculatePowerRating(totalPower) {
    if (totalPower < 1000000) return 1; // 青铜
    if (totalPower < 3000000) return 2; // 白银
    if (totalPower < 8000000) return 3; // 黄金
    if (totalPower < 20000000) return 4; // 铂金
    return 5; // 钻石
  }

  // 氪金分层计算
  calculateSpendingRating(monthlySpending) {
    if (monthlySpending < 50) return 1; // 低消费
    if (monthlySpending < 200) return 2; // 中消费
    return 3; // 高消费
  }

  // 活跃度评分
  calculateActivityRating(weeklyActivity) {
    if (weeklyActivity < 50) return 1; // 低活跃
    if (weeklyActivity < 70) return 2; // 中活跃
    return 3; // 高活跃
  }

  // 匹配过滤器
  applyMatchFilters(candidates, targetSect) {
    return candidates.filter(candidate => {
      // 避免实力差距过大
      const powerDiff = Math.abs(candidate.rating.power - targetSect.rating.power);
      if (powerDiff > 1) return false;

      // 避免氪金层级差距过大
      const spendingDiff = Math.abs(candidate.rating.spending - targetSect.rating.spending);
      if (spendingDiff > 1) return false;

      // 避免活跃度差距过大
      const activityDiff = Math.abs(candidate.rating.activity - targetSect.rating.activity);
      if (activityDiff > 1) return false;

      return true;
    });
  }
}
```

---

## 7. 防作弊与安全机制

### 7.1 服务器权威性设计

#### 7.1.1 状态验证机制
```javascript
class AntiCheatSystem {
  constructor(redis) {
    this.redis = redis;
    this.MAX_MOVE_SPEED = 2; // 每秒最大移动格数
    this.MAX_ATTACK_RANGE = 3; // 最大攻击范围
    this.MIN_ACTION_INTERVAL = 100; // 最小操作间隔(ms)
  }

  // 移动验证
  async validateMove(playerId, newPosition, timestamp) {
    const lastState = await this.redis.hmget(`player:${playerId}`, 'x', 'y', 'last_update');
    const lastX = parseInt(lastState[0]);
    const lastY = parseInt(lastState[1]);
    const lastUpdate = parseInt(lastState[2]);

    // 时间间隔检查
    const timeDelta = timestamp - lastUpdate;
    if (timeDelta < this.MIN_ACTION_INTERVAL) {
      return { valid: false, reason: 'TOO_FREQUENT' };
    }

    // 移动距离检查
    const distance = Math.sqrt(
      Math.pow(newPosition.x - lastX, 2) +
      Math.pow(newPosition.y - lastY, 2)
    );
    const maxDistance = (this.MAX_MOVE_SPEED * timeDelta) / 1000;

    if (distance > maxDistance) {
      return { valid: false, reason: 'SPEED_HACKING' };
    }

    // 地图边界检查
    if (!this.isWithinBounds(newPosition)) {
      return { valid: false, reason: 'OUT_OF_BOUNDS' };
    }

    return { valid: true };
  }

  // 攻击验证
  async validateAttack(attackerId, targetId, timestamp) {
    const attacker = await this.redis.hmget(`player:${attackerId}`, 'x', 'y', 'last_attack', 'mp');
    const target = await this.redis.hmget(`player:${targetId}`, 'x', 'y', 'hp');

    // 冷却时间检查
    const lastAttack = parseInt(attacker[2]);
    if (timestamp - lastAttack < 1000) { // 1秒攻击冷却
      return { valid: false, reason: 'ATTACK_COOLDOWN' };
    }

    // 法力值检查
    const currentMana = parseInt(attacker[3]);
    if (currentMana < 10) { // 攻击消耗10法力
      return { valid: false, reason: 'INSUFFICIENT_MANA' };
    }

    // 攻击距离检查
    const distance = Math.sqrt(
      Math.pow(parseInt(attacker[0]) - parseInt(target[0]), 2) +
      Math.pow(parseInt(attacker[1]) - parseInt(target[1]), 2)
    );

    if (distance > this.MAX_ATTACK_RANGE) {
      return { valid: false, reason: 'OUT_OF_RANGE' };
    }

    // 目标存活检查
    if (parseInt(target[2]) <= 0) {
      return { valid: false, reason: 'TARGET_DEAD' };
    }

    return { valid: true };
  }

  // 技能释放验证
  async validateSkillCast(playerId, skillId, targets, timestamp) {
    const skillConfig = await this.getSkillConfig(skillId);
    const playerState = await this.redis.hmget(`player:${playerId}`, 'mp', 'last_skill', 'skills');

    // 法力值检查
    const currentMana = parseInt(playerState[0]);
    if (currentMana < skillConfig.manaCost) {
      return { valid: false, reason: 'INSUFFICIENT_MANA' };
    }

    // 技能冷却检查
    const lastSkillUse = parseInt(playerState[1]);
    if (timestamp - lastSkillUse < skillConfig.cooldown) {
      return { valid: false, reason: 'SKILL_COOLDOWN' };
    }

    // 技能拥有检查
    const playerSkills = JSON.parse(playerState[2] || '[]');
    if (!playerSkills.includes(skillId)) {
      return { valid: false, reason: 'SKILL_NOT_OWNED' };
    }

    // 目标数量检查
    if (targets.length > skillConfig.maxTargets) {
      return { valid: false, reason: 'TOO_MANY_TARGETS' };
    }

    return { valid: true };
  }
}
```

#### 7.1.2 异常行为检测
```javascript
class BehaviorMonitor {
  constructor(redis) {
    this.redis = redis;
    this.suspiciousActions = new Map();
  }

  // 记录可疑行为
  async recordSuspiciousAction(playerId, actionType, severity) {
    const key = `suspicious:${playerId}`;
    const current = await this.redis.hget(key, actionType) || 0;
    const newCount = parseInt(current) + severity;

    await this.redis.hset(key, actionType, newCount);
    await this.redis.expire(key, 3600); // 1小时窗口

    // 检查是否达到处罚阈值
    await this.checkPunishmentThreshold(playerId);
  }

  // 检查处罚阈值
  async checkPunishmentThreshold(playerId) {
    const suspiciousData = await this.redis.hgetall(`suspicious:${playerId}`);
    let totalScore = 0;

    for (const [actionType, count] of Object.entries(suspiciousData)) {
      totalScore += this.getActionWeight(actionType) * parseInt(count);
    }

    // 处罚等级
    if (totalScore >= 100) {
      await this.applyPunishment(playerId, 'BAN', 86400); // 24小时封禁
    } else if (totalScore >= 50) {
      await this.applyPunishment(playerId, 'MUTE', 3600); // 1小时禁言
    } else if (totalScore >= 20) {
      await this.applyPunishment(playerId, 'WARNING'); // 警告
    }
  }

  // 行为权重配置
  getActionWeight(actionType) {
    const weights = {
      'SPEED_HACKING': 25,     // 速度作弊
      'DAMAGE_HACKING': 30,    // 伤害作弊
      'RESOURCE_HACKING': 35,  // 资源作弊
      'TOO_FREQUENT': 5,       // 操作过快
      'OUT_OF_BOUNDS': 15,     // 越界行为
      'INVALID_STATE': 20      // 状态异常
    };
    return weights[actionType] || 10;
  }

  // 应用处罚
  async applyPunishment(playerId, type, duration = 0) {
    const punishment = {
      type,
      startTime: Date.now(),
      duration,
      endTime: duration > 0 ? Date.now() + duration * 1000 : null
    };

    await this.redis.hset(`punishment:${playerId}`, type, JSON.stringify(punishment));

    // 记录处罚日志
    await this.logPunishment(playerId, punishment);

    // 如果是封禁，立即断开连接
    if (type === 'BAN') {
      await this.disconnectPlayer(playerId);
    }
  }
}
```

### 7.2 数据加密与传输安全

#### 7.2.1 消息加密
```javascript
class MessageSecurity {
  constructor() {
    this.crypto = require('crypto');
    this.algorithm = 'aes-256-gcm';
  }

  // 加密消息
  encryptMessage(message, key) {
    const iv = this.crypto.randomBytes(16);
    const cipher = this.crypto.createCipher(this.algorithm, key, iv);

    let encrypted = cipher.update(JSON.stringify(message), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // 解密消息
  decryptMessage(encryptedData, key) {
    const decipher = this.crypto.createDecipher(this.algorithm, key, Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  // 生成消息签名
  signMessage(message, secretKey) {
    const hmac = this.crypto.createHmac('sha256', secretKey);
    hmac.update(JSON.stringify(message));
    return hmac.digest('hex');
  }

  // 验证消息签名
  verifySignature(message, signature, secretKey) {
    const expectedSignature = this.signMessage(message, secretKey);
    return this.crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}
```

---

## 8. 性能优化方案

### 8.1 数据分片优化

#### 8.1.1 智能分片策略
```javascript
class IntelligentSharding {
  constructor() {
    this.shardMap = new Map();
    this.loadStats = new Map();
  }

  // 动态分片分配
  async assignOptimalShard(battleId) {
    const currentLoad = await this.getCurrentShardLoads();

    // 选择负载最低的分片
    let optimalShard = null;
    let minLoad = Infinity;

    for (const [shardId, load] of currentLoad) {
      if (load < minLoad) {
        minLoad = load;
        optimalShard = shardId;
      }
    }

    // 记录分片分配
    this.shardMap.set(battleId, optimalShard);

    return optimalShard;
  }

  // 分片负载监控
  async monitorShardLoad() {
    const shards = await this.getAllShards();

    for (const shard of shards) {
      const metrics = await this.getShardMetrics(shard);

      // 检查是否需要重新平衡
      if (metrics.cpuUsage > 80 || metrics.memoryUsage > 85) {
        await this.rebalanceShard(shard);
      }
    }
  }

  // 分片重新平衡
  async rebalanceShard(overloadedShard) {
    const battles = await this.getBattlesOnShard(overloadedShard);
    const targetShard = await this.findLeastLoadedShard();

    // 迁移负载较低的战场
    const battlesToMigrate = battles
      .sort((a, b) => a.playerCount - b.playerCount)
      .slice(0, Math.ceil(battles.length * 0.3));

    for (const battle of battlesToMigrate) {
      await this.migrateBattle(battle.id, overloadedShard, targetShard);
    }
  }
}
```

#### 8.1.2 地图区域分割
```javascript
class MapRegionOptimizer {
  constructor() {
    this.regionSize = 20; // 20x20格为一个区域
    this.regions = new Map();
  }

  // 计算玩家所在区域
  getPlayerRegion(x, y) {
    const regionX = Math.floor(x / this.regionSize);
    const regionY = Math.floor(y / this.regionSize);
    return `${regionX}_${regionY}`;
  }

  // 获取相邻区域
  getAdjacentRegions(regionId) {
    const [x, y] = regionId.split('_').map(Number);
    const adjacent = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        adjacent.push(`${x + dx}_${y + dy}`);
      }
    }

    return adjacent;
  }

  // 区域化消息广播
  async broadcastToRegion(battleId, regionId, message, excludePlayer = null) {
    const playersInRegion = await this.getPlayersInRegion(battleId, regionId);

    for (const playerId of playersInRegion) {
      if (playerId !== excludePlayer) {
        await this.sendMessageToPlayer(playerId, message);
      }
    }
  }

  // 玩家移动区域更新
  async updatePlayerRegion(playerId, oldRegion, newRegion) {
    if (oldRegion !== newRegion) {
      // 从旧区域移除
      await this.redis.srem(`region:${oldRegion}:players`, playerId);

      // 添加到新区域
      await this.redis.sadd(`region:${newRegion}:players`, playerId);

      // 通知区域变更
      await this.handleRegionTransition(playerId, oldRegion, newRegion);
    }
  }
}
```

### 8.2 状态压缩算法

#### 8.2.1 差分压缩
```javascript
class DifferentialCompression {
  constructor() {
    this.playerStates = new Map();
  }

  // 计算状态差异
  calculateStateDelta(playerId, newState) {
    const lastState = this.playerStates.get(playerId) || {};
    const delta = {};

    // 位置压缩：只传输移动超过阈值的变化
    if (this.hasSignificantMovement(lastState, newState)) {
      delta.position = {
        x: newState.x,
        y: newState.y
      };
    }

    // 属性压缩：只传输变化的属性
    const attributes = ['hp', 'mp', 'status'];
    for (const attr of attributes) {
      if (lastState[attr] !== newState[attr]) {
        delta[attr] = newState[attr];
      }
    }

    // 更新状态缓存
    this.playerStates.set(playerId, newState);

    return Object.keys(delta).length > 0 ? delta : null;
  }

  // 检查是否有显著移动
  hasSignificantMovement(lastState, newState) {
    if (!lastState.x || !lastState.y) return true;

    const distance = Math.sqrt(
      Math.pow(newState.x - lastState.x, 2) +
      Math.pow(newState.y - lastState.y, 2)
    );

    return distance >= 0.5; // 移动超过0.5格才传输
  }

  // 批量压缩多个玩家状态
  compressBatchStates(playerStates) {
    const batch = {
      timestamp: Date.now(),
      updates: []
    };

    for (const [playerId, state] of Object.entries(playerStates)) {
      const delta = this.calculateStateDelta(playerId, state);
      if (delta) {
        batch.updates.push({
          id: playerId,
          data: delta
        });
      }
    }

    return batch.updates.length > 0 ? batch : null;
  }
}
```

#### 8.2.2 协议优化
```javascript
class ProtocolOptimizer {
  constructor() {
    // 消息类型映射：缩短消息头
    this.messageTypes = {
      PLAYER_MOVE: 'pm',
      PLAYER_ATTACK: 'pa',
      SKILL_CAST: 'sc',
      POINT_CAPTURED: 'pc',
      LEADERBOARD_UPDATE: 'lu'
    };

    // 字段映射：缩短字段名
    this.fieldMappings = {
      playerId: 'pid',
      position: 'pos',
      health: 'hp',
      mana: 'mp',
      damage: 'dmg',
      timestamp: 'ts'
    };
  }

  // 压缩消息
  compressMessage(messageType, data) {
    const compressedType = this.messageTypes[messageType] || messageType;
    const compressedData = this.compressFields(data);

    return {
      t: compressedType,
      d: compressedData
    };
  }

  // 压缩字段名
  compressFields(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.compressFields(item));
    }

    if (typeof data === 'object' && data !== null) {
      const compressed = {};
      for (const [key, value] of Object.entries(data)) {
        const shortKey = this.fieldMappings[key] || key;
        compressed[shortKey] = this.compressFields(value);
      }
      return compressed;
    }

    return data;
  }

  // 解压消息
  decompressMessage(compressedMessage) {
    const fullType = this.getFullMessageType(compressedMessage.t);
    const fullData = this.decompressFields(compressedMessage.d);

    return {
      type: fullType,
      data: fullData
    };
  }
}
```

### 8.3 缓存策略优化

#### 8.3.1 多级缓存架构
```javascript
class MultiLevelCache {
  constructor() {
    // L1缓存：应用内存（最快）
    this.l1Cache = new Map();
    this.l1MaxSize = 1000;
    this.l1TTL = 60000; // 1分钟

    // L2缓存：Redis（快）
    this.redis = new Redis();
    this.l2TTL = 300000; // 5分钟

    // L3缓存：MongoDB（慢但持久）
    this.mongodb = new MongoDB();
  }

  // 获取数据（多级缓存查找）
  async get(key) {
    // L1缓存查找
    const l1Data = this.l1Cache.get(key);
    if (l1Data && !this.isExpired(l1Data)) {
      return l1Data.value;
    }

    // L2缓存查找
    const l2Data = await this.redis.get(key);
    if (l2Data) {
      const value = JSON.parse(l2Data);
      this.setL1(key, value); // 回填L1缓存
      return value;
    }

    // L3缓存查找
    const l3Data = await this.mongodb.findOne({ _id: key });
    if (l3Data) {
      await this.setL2(key, l3Data); // 回填L2缓存
      this.setL1(key, l3Data); // 回填L1缓存
      return l3Data;
    }

    return null;
  }

  // 设置数据（写穿策略）
  async set(key, value, ttl = this.l2TTL) {
    // 同时写入所有级别
    this.setL1(key, value);
    await this.setL2(key, value, ttl);
    await this.setL3(key, value);
  }

  // L1缓存管理
  setL1(key, value) {
    // LRU淘汰策略
    if (this.l1Cache.size >= this.l1MaxSize) {
      const firstKey = this.l1Cache.keys().next().value;
      this.l1Cache.delete(firstKey);
    }

    this.l1Cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  // 预热缓存
  async warmupCache(battleId) {
    const players = await this.mongodb.find({ battleId }).toArray();

    for (const player of players) {
      await this.set(`player:${player._id}`, player);
    }

    console.log(`Warmed up cache for ${players.length} players in battle ${battleId}`);
  }
}
```

---

## 9. API接口设计

### 9.1 RESTful API设计

#### 9.1.1 API概览表
| HTTP方法 | 端点 | 描述 | 请求体 | 成功响应 | 错误响应 |
|---------|------|------|--------|----------|----------|
| **战斗相关** | | | | | |
| GET | `/api/v1/battles/active` | 获取活跃战场列表 | - | `{battles: [...]}` | `{error: "内部错误"}` |
| POST | `/api/v1/battles/{battleId}/join` | 加入战场 | `{sectId, players}` | `{success: true, battleInfo}` | `{error: "战场已满"}` |
| DELETE | `/api/v1/battles/{battleId}/leave` | 离开战场 | `{playerId}` | `{success: true}` | `{error: "玩家不在战场"}` |
| GET | `/api/v1/battles/{battleId}/state` | 获取战场状态 | - | `{battleState, leaderboard}` | `{error: "战场不存在"}` |
| **玩家相关** | | | | | |
| PUT | `/api/v1/players/{playerId}/position` | 更新玩家位置 | `{x, y, timestamp}` | `{success: true}` | `{error: "移动速度异常"}` |
| POST | `/api/v1/players/{playerId}/attack` | 发起攻击 | `{targetId, skillId}` | `{damage, result}` | `{error: "目标超出范围"}` |
| POST | `/api/v1/players/{playerId}/skill` | 释放技能 | `{skillId, targets, area}` | `{skillResult}` | `{error: "法力值不足"}` |
| GET | `/api/v1/players/{playerId}/status` | 获取玩家状态 | - | `{hp, mp, position, buffs}` | `{error: "玩家不存在"}` |
| **宗门相关** | | | | | |
| GET | `/api/v1/sects/{sectId}/members` | 获取宗门成员 | - | `{members: [...]}` | `{error: "宗门不存在"}` |
| POST | `/api/v1/sects/{sectId}/bond` | 触发羁绊技能 | `{bondId, targetArea}` | `{bondResult}` | `{error: "羁绊冷却中"}` |
| GET | `/api/v1/sects/{sectId}/stats` | 获取宗门统计 | - | `{totalPower, ranking}` | `{error: "权限不足"}` |
| **排行榜相关** | | | | | |
| GET | `/api/v1/leaderboard/{battleId}` | 获取战场排行榜 | - | `{rankings: [...]}` | `{error: "战场不存在"}` |
| GET | `/api/v1/leaderboard/{battleId}/sect/{sectId}` | 获取宗门排名 | - | `{rank, score, trend}` | `{error: "宗门未参战"}` |
| **匹配相关** | | | | | |
| POST | `/api/v1/matchmaking/find` | 寻找匹配 | `{sectId, preferences}` | `{matchId, estimatedWait}` | `{error: "宗门不符合条件"}` |
| DELETE | `/api/v1/matchmaking/{matchId}` | 取消匹配 | - | `{success: true}` | `{error: "匹配不存在"}` |

#### 9.1.2 WebSocket事件定义

##### A. 客户端→服务器事件
```javascript
// 连接管理
socket.emit('join_battle', {
  battleId: 'battle_123',
  sectId: 'kunlun_sect',
  playerId: 'player_12345',
  token: 'jwt_token'
});

socket.emit('leave_battle', {
  battleId: 'battle_123',
  playerId: 'player_12345'
});

// 玩家操作
socket.emit('player_move', {
  battleId: 'battle_123',
  playerId: 'player_12345',
  x: 150,
  y: 200,
  timestamp: 1695123456789
});

socket.emit('player_attack', {
  battleId: 'battle_123',
  attackerId: 'player_12345',
  targetId: 'player_67890',
  skillId: 'basic_attack',
  timestamp: 1695123456789
});

socket.emit('cast_skill', {
  battleId: 'battle_123',
  casterId: 'player_12345',
  skillId: 'nezha_fire_spear',
  targetArea: { x: 100, y: 150, radius: 50 },
  timestamp: 1695123456789
});

// 羁绊技能
socket.emit('trigger_bond', {
  battleId: 'battle_123',
  sectId: 'kunlun_sect',
  bondId: 'master_disciple',
  targetArea: { x: 100, y: 100, width: 200, height: 200 }
});
```

##### B. 服务器→客户端事件
```javascript
// 战场状态更新
socket.on('battle_state_update', (data) => {
  // data: { battleId, leaderboard, timeRemaining, currentPhase }
});

socket.on('player_joined', (data) => {
  // data: { playerId, sectId, position, heroInfo }
});

socket.on('player_left', (data) => {
  // data: { playerId, reason }
});

// 玩家状态同步
socket.on('player_moved', (data) => {
  // data: { playerId, x, y, timestamp }
});

socket.on('player_attacked', (data) => {
  // data: { attackerId, targetId, damage, newHp, skillEffect }
});

socket.on('player_eliminated', (data) => {
  // data: { playerId, eliminatedBy, respawnIn }
});

// 据点控制
socket.on('point_captured', (data) => {
  // data: { pointId, newController, captureTime, scoreChange }
});

socket.on('point_lost', (data) => {
  // data: { pointId, lostBy, newController }
});

// 羁绊技能效果
socket.on('bond_skill_cast', (data) => {
  // data: { bondId, sectId, effect, affectedPlayers, animation }
});

// 排行榜更新
socket.on('leaderboard_update', (data) => {
  // data: { rankings, changes, timestamp }
});

// 系统消息
socket.on('system_message', (data) => {
  // data: { type, message, priority, displayTime }
});

// 错误消息
socket.on('error', (data) => {
  // data: { code, message, action }
});
```

### 9.2 API版本控制策略

#### 9.2.1 版本控制设计
```javascript
// API版本控制中间件
class APIVersionController {
  constructor() {
    this.versions = {
      'v1': {
        supportedUntil: '2025-12-31',
        features: ['basic_pvp', 'leaderboard', 'matchmaking']
      },
      'v2': {
        supportedUntil: '2026-12-31',
        features: ['basic_pvp', 'leaderboard', 'matchmaking', 'advanced_bonds', 'spectator_mode']
      }
    };
  }

  // 版本检查中间件
  checkVersion(req, res, next) {
    const requestedVersion = req.headers['api-version'] || 'v1';
    const clientVersion = req.headers['client-version'];

    if (!this.versions[requestedVersion]) {
      return res.status(400).json({
        error: 'UNSUPPORTED_API_VERSION',
        message: '不支持的API版本',
        supportedVersions: Object.keys(this.versions)
      });
    }

    // 检查客户端版本兼容性
    if (this.requiresClientUpdate(requestedVersion, clientVersion)) {
      return res.status(426).json({
        error: 'CLIENT_UPDATE_REQUIRED',
        message: '客户端版本过低，请更新',
        minimumVersion: this.getMinimumClientVersion(requestedVersion)
      });
    }

    req.apiVersion = requestedVersion;
    next();
  }

  // 向后兼容性处理
  handleBackwardCompatibility(req, res, next) {
    if (req.apiVersion === 'v1') {
      // V1版本的数据格式转换
      const originalSend = res.send;
      res.send = function(data) {
        const convertedData = convertToV1Format(data);
        originalSend.call(this, convertedData);
      };
    }

    next();
  }
}
```

#### 9.2.2 限流策略
```javascript
class RateLimiter {
  constructor(redis) {
    this.redis = redis;

    // 不同接口的限流配置
    this.limits = {
      // 高频操作：移动、攻击
      'POST:/api/v1/players/*/position': { rpm: 600, burst: 10 },
      'POST:/api/v1/players/*/attack': { rpm: 60, burst: 5 },

      // 中频操作：技能、状态查询
      'POST:/api/v1/players/*/skill': { rpm: 30, burst: 3 },
      'GET:/api/v1/players/*/status': { rpm: 120, burst: 10 },

      // 低频操作：匹配、宗门管理
      'POST:/api/v1/matchmaking/find': { rpm: 10, burst: 2 },
      'POST:/api/v1/sects/*/bond': { rpm: 5, burst: 1 }
    };
  }

  // 限流中间件
  async rateLimit(req, res, next) {
    const key = this.getEndpointKey(req);
    const limit = this.limits[key] || { rpm: 60, burst: 5 };

    const userId = req.user.id;
    const now = Date.now();
    const window = 60000; // 1分钟窗口

    // 滑动窗口计数器
    const redisKey = `rate_limit:${userId}:${key}`;
    const requests = await this.redis.zcount(redisKey, now - window, now);

    if (requests >= limit.rpm) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((window - (now % window)) / 1000)
      });
    }

    // 记录请求
    await this.redis.zadd(redisKey, now, `${now}_${Math.random()}`);
    await this.redis.expire(redisKey, Math.ceil(window / 1000));

    // 设置响应头
    res.set({
      'X-Rate-Limit-Limit': limit.rpm,
      'X-Rate-Limit-Remaining': limit.rpm - requests - 1,
      'X-Rate-Limit-Reset': Math.ceil((now + window) / 1000)
    });

    next();
  }
}
```

---

## 10. 监控与运维

### 10.1 性能监控指标

#### 10.1.1 核心监控指标
```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      // 实时性能指标
      latency: {
        websocket_ping: { target: 50, warning: 80, critical: 100 }, // ms
        api_response: { target: 200, warning: 500, critical: 1000 },
        database_query: { target: 10, warning: 50, critical: 100 }
      },

      // 并发指标
      concurrency: {
        active_players: { target: 400, warning: 450, critical: 500 },
        websocket_connections: { target: 400, warning: 450, critical: 500 },
        battle_instances: { target: 20, warning: 25, critical: 30 }
      },

      // 资源使用指标
      resources: {
        cpu_usage: { target: 70, warning: 80, critical: 90 }, // %
        memory_usage: { target: 75, warning: 85, critical: 95 },
        redis_memory: { target: 80, warning: 90, critical: 95 },
        mongodb_connections: { target: 80, warning: 90, critical: 95 }
      },

      // 业务指标
      business: {
        average_battle_duration: { target: 3600, warning: 4500, critical: 5400 }, // 秒
        player_dropout_rate: { target: 5, warning: 10, critical: 15 }, // %
        matchmaking_success_rate: { target: 95, warning: 90, critical: 85 }
      }
    };
  }

  // 收集实时指标
  async collectMetrics() {
    const metrics = {
      timestamp: Date.now(),
      websocket: await this.getWebSocketMetrics(),
      database: await this.getDatabaseMetrics(),
      battle: await this.getBattleMetrics(),
      system: await this.getSystemMetrics()
    };

    // 发送到监控系统
    await this.sendToMonitoring(metrics);

    // 检查告警条件
    await this.checkAlerts(metrics);

    return metrics;
  }

  // WebSocket连接指标
  async getWebSocketMetrics() {
    return {
      activeConnections: io.engine.clientsCount,
      messagesPerSecond: this.getMessageRate(),
      averagePing: await this.calculateAveragePing(),
      connectionErrors: this.getConnectionErrors()
    };
  }

  // 数据库性能指标
  async getDatabaseMetrics() {
    const redisInfo = await redis.info();
    const mongoStats = await mongodb.admin().serverStatus();

    return {
      redis: {
        memoryUsage: redisInfo.used_memory_human,
        connectedClients: redisInfo.connected_clients,
        opsPerSecond: redisInfo.instantaneous_ops_per_sec,
        hitRate: redisInfo.keyspace_hits / (redisInfo.keyspace_hits + redisInfo.keyspace_misses)
      },
      mongodb: {
        connections: mongoStats.connections.current,
        operations: mongoStats.opcounters,
        memory: mongoStats.mem.resident,
        locks: mongoStats.locks
      }
    };
  }

  // 战斗相关指标
  async getBattleMetrics() {
    const activeBattles = await redis.scard('active_battles');
    const totalPlayers = await redis.zcard('global_players');

    return {
      activeBattles,
      totalPlayers,
      averagePlayersPerBattle: totalPlayers / activeBattles,
      battleCompletionRate: await this.getBattleCompletionRate(),
      averageBattleDuration: await this.getAverageBattleDuration()
    };
  }
}
```

#### 10.1.2 告警机制
```javascript
class AlertSystem {
  constructor() {
    this.alertChannels = {
      email: ['ops@company.com', 'backend@company.com'],
      webhook: ['https://hooks.slack.com/services/...'],
      sms: ['+86-12345678901'] // 仅限Critical级别
    };

    this.alertRules = [
      {
        name: 'WebSocket延迟过高',
        condition: (metrics) => metrics.websocket.averagePing > 100,
        severity: 'CRITICAL',
        message: 'WebSocket平均延迟超过100ms，当前：${metrics.websocket.averagePing}ms'
      },
      {
        name: '在线玩家超载',
        condition: (metrics) => metrics.battle.totalPlayers > 450,
        severity: 'WARNING',
        message: '在线玩家数量接近上限，当前：${metrics.battle.totalPlayers}'
      },
      {
        name: 'Redis内存使用过高',
        condition: (metrics) => metrics.database.redis.memoryUsage > 85,
        severity: 'WARNING',
        message: 'Redis内存使用率过高：${metrics.database.redis.memoryUsage}%'
      },
      {
        name: '匹配成功率过低',
        condition: (metrics) => metrics.business.matchmaking_success_rate < 85,
        severity: 'CRITICAL',
        message: '匹配成功率过低：${metrics.business.matchmaking_success_rate}%'
      }
    ];
  }

  async checkAndSendAlerts(metrics) {
    for (const rule of this.alertRules) {
      if (rule.condition(metrics)) {
        await this.sendAlert(rule, metrics);
      }
    }
  }

  async sendAlert(rule, metrics) {
    const alert = {
      id: this.generateAlertId(),
      rule: rule.name,
      severity: rule.severity,
      message: this.interpolateMessage(rule.message, metrics),
      timestamp: new Date().toISOString(),
      metrics: metrics
    };

    // 防止重复告警
    if (await this.isDuplicateAlert(alert)) {
      return;
    }

    // 发送告警
    await Promise.all([
      this.sendEmailAlert(alert),
      this.sendWebhookAlert(alert),
      rule.severity === 'CRITICAL' ? this.sendSMSAlert(alert) : null
    ].filter(Boolean));

    // 记录告警历史
    await this.recordAlert(alert);
  }
}
```

### 10.2 日志管理

#### 10.2.1 结构化日志设计
```javascript
class StructuredLogger {
  constructor() {
    this.winston = require('winston');

    this.logger = this.winston.createLogger({
      level: 'info',
      format: this.winston.format.combine(
        this.winston.format.timestamp(),
        this.winston.format.errors({ stack: true }),
        this.winston.format.json()
      ),
      defaultMeta: { service: 'fengshen-pvp' },
      transports: [
        new this.winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new this.winston.transports.File({ filename: 'logs/combined.log' }),
        new this.winston.transports.Console({
          format: this.winston.format.simple()
        })
      ]
    });
  }

  // 玩家操作日志
  logPlayerAction(playerId, action, details) {
    this.logger.info('PLAYER_ACTION', {
      playerId,
      action,
      details,
      timestamp: Date.now(),
      category: 'gameplay'
    });
  }

  // 战斗事件日志
  logBattleEvent(battleId, event, data) {
    this.logger.info('BATTLE_EVENT', {
      battleId,
      event,
      data,
      timestamp: Date.now(),
      category: 'battle'
    });
  }

  // 性能日志
  logPerformance(operation, duration, details) {
    this.logger.info('PERFORMANCE', {
      operation,
      duration,
      details,
      timestamp: Date.now(),
      category: 'performance'
    });
  }

  // 安全事件日志
  logSecurityEvent(playerId, event, severity, details) {
    this.logger.warn('SECURITY_EVENT', {
      playerId,
      event,
      severity,
      details,
      timestamp: Date.now(),
      category: 'security'
    });
  }

  // 错误日志
  logError(error, context) {
    this.logger.error('ERROR', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      category: 'error'
    });
  }
}
```

#### 10.2.2 日志分析和查询
```javascript
class LogAnalyzer {
  constructor(elasticsearch) {
    this.es = elasticsearch;
  }

  // 查询玩家行为模式
  async analyzePlayerBehavior(playerId, timeRange) {
    const query = {
      index: 'fengshen-logs-*',
      body: {
        query: {
          bool: {
            must: [
              { term: { playerId } },
              { range: { timestamp: timeRange } }
            ]
          }
        },
        aggs: {
          actions_by_type: {
            terms: { field: 'action' }
          },
          actions_over_time: {
            date_histogram: {
              field: 'timestamp',
              interval: '1m'
            }
          }
        }
      }
    };

    return await this.es.search(query);
  }

  // 检测异常行为
  async detectAnomalies(timeRange) {
    const query = {
      index: 'fengshen-logs-*',
      body: {
        query: {
          bool: {
            must: [
              { term: { category: 'security' } },
              { range: { timestamp: timeRange } }
            ]
          }
        },
        aggs: {
          suspicious_players: {
            terms: {
              field: 'playerId',
              size: 100,
              order: { _count: 'desc' }
            }
          }
        }
      }
    };

    return await this.es.search(query);
  }

  // 性能分析
  async analyzePerformance(operation, timeRange) {
    const query = {
      index: 'fengshen-logs-*',
      body: {
        query: {
          bool: {
            must: [
              { term: { operation } },
              { term: { category: 'performance' } },
              { range: { timestamp: timeRange } }
            ]
          }
        },
        aggs: {
          avg_duration: { avg: { field: 'duration' } },
          max_duration: { max: { field: 'duration' } },
          percentiles: {
            percentiles: {
              field: 'duration',
              percents: [50, 90, 95, 99]
            }
          }
        }
      }
    };

    return await this.es.search(query);
  }
}
```

---

## 11. 部署架构

### 11.1 容器化部署

#### 11.1.1 Docker配置
```dockerfile
# Node.js应用容器
FROM node:18-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS development
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS production
COPY . .
EXPOSE 3000
USER node
CMD ["npm", "start"]
```

#### 11.1.2 Kubernetes部署配置
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fengshen-pvp-api
  labels:
    app: fengshen-pvp
    tier: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fengshen-pvp
      tier: api
  template:
    metadata:
      labels:
        app: fengshen-pvp
        tier: api
    spec:
      containers:
      - name: api
        image: fengshen-pvp:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: fengshen-secrets
              key: redis-url
        - name: MONGODB_URL
          valueFrom:
            secretKeyRef:
              name: fengshen-secrets
              key: mongodb-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: fengshen-pvp-service
spec:
  selector:
    app: fengshen-pvp
    tier: api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer

---
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: fengshen-pvp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: fengshen-pvp-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 11.2 CI/CD流水线

#### 11.2.1 GitLab CI配置
```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy-staging
  - deploy-production

variables:
  DOCKER_REGISTRY: registry.company.com
  IMAGE_NAME: fengshen-pvp
  KUBECTL_VERSION: v1.27.0

# 测试阶段
test:
  stage: test
  image: node:18-alpine
  services:
    - redis:7-alpine
    - mongo:6
  script:
    - npm ci
    - npm run test:unit
    - npm run test:integration
    - npm run test:e2e
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

# 构建阶段
build:
  stage: build
  image: docker:20.10.16
  services:
    - docker:20.10.16-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $DOCKER_REGISTRY/$IMAGE_NAME:$CI_COMMIT_SHA .
    - docker push $DOCKER_REGISTRY/$IMAGE_NAME:$CI_COMMIT_SHA
    - docker tag $DOCKER_REGISTRY/$IMAGE_NAME:$CI_COMMIT_SHA $DOCKER_REGISTRY/$IMAGE_NAME:latest
    - docker push $DOCKER_REGISTRY/$IMAGE_NAME:latest
  only:
    - main
    - develop

# 部署到测试环境
deploy-staging:
  stage: deploy-staging
  image: alpine/kubectl:$KUBECTL_VERSION
  script:
    - kubectl config use-context staging-cluster
    - kubectl set image deployment/fengshen-pvp-api api=$DOCKER_REGISTRY/$IMAGE_NAME:$CI_COMMIT_SHA
    - kubectl rollout status deployment/fengshen-pvp-api
    - kubectl get services
  environment:
    name: staging
    url: https://staging-api.fengshen.com
  only:
    - develop

# 部署到生产环境
deploy-production:
  stage: deploy-production
  image: alpine/kubectl:$KUBECTL_VERSION
  script:
    - kubectl config use-context production-cluster
    - kubectl set image deployment/fengshen-pvp-api api=$DOCKER_REGISTRY/$IMAGE_NAME:$CI_COMMIT_SHA
    - kubectl rollout status deployment/fengshen-pvp-api
    - kubectl get services
  environment:
    name: production
    url: https://api.fengshen.com
  when: manual
  only:
    - main
```

---

## 12. 成本估算与扩展规划

### 12.1 MVP阶段成本估算

#### 12.1.1 基础设施成本（月）
| 资源类型 | 配置 | 数量 | 单价(USD) | 小计(USD) | 用途说明 |
|---------|------|------|----------|-----------|----------|
| **计算资源** | | | | | |
| ECS实例 | 4核8GB | 3台 | $45 | $135 | API服务器集群 |
| Redis集群 | 16GB内存 | 3节点 | $120 | $360 | 实时状态缓存 |
| MongoDB | 4核16GB | 1主2从 | $80 | $240 | 持久化存储 |
| **网络资源** | | | | | |
| 负载均衡器 | ALB | 1个 | $25 | $25 | 流量分发 |
| CDN流量 | 1TB | 1个 | $50 | $50 | 静态资源加速 |
| **监控运维** | | | | | |
| 日志存储 | 100GB | 1个 | $20 | $20 | ELK Stack |
| 监控告警 | CloudWatch | 1个 | $30 | $30 | 性能监控 |
| **总计** | | | | **$860** | **约¥6,200/月** |

#### 12.1.2 人力成本估算
| 角色 | 人数 | 月薪(¥) | 参与度 | 成本(¥) |
|-----|------|---------|--------|---------|
| 后端开发工程师 | 2 | 25,000 | 100% | 50,000 |
| 运维工程师 | 1 | 20,000 | 50% | 10,000 |
| 测试工程师 | 1 | 18,000 | 50% | 9,000 |
| **总计** | | | | **¥69,000/月** |

### 12.2 扩展规划

#### 12.2.1 用户增长阶段
```
阶段1: MVP (0-1K用户)
├── 当前架构足够支撑
├── 单Redis实例 + 3个API节点
└── 成本: ¥6,200/月

阶段2: 成长期 (1K-10K用户)
├── Redis集群扩展到6节点
├── API节点扩展到6个
├── MongoDB分片集群
└── 成本: ¥18,000/月

阶段3: 扩张期 (10K-50K用户)
├── 多区域部署
├── CDN全球加速
├── 微服务进一步拆分
└── 成本: ¥45,000/月

阶段4: 成熟期 (50K+用户)
├── 多云部署
├── 智能运维
├── 大数据分析平台
└── 成本: ¥100,000+/月
```

#### 12.2.2 技术架构演进路径
```
当前架构 (MVP)
└── 单体应用 + Redis + MongoDB

第一次演进 (1K-10K用户)
├── 微服务拆分
│   ├── 战斗服务
│   ├── 匹配服务
│   └── 排行榜服务
└── 服务发现 + API网关

第二次演进 (10K-50K用户)
├── 事件驱动架构
├── CQRS模式
├── 分布式缓存
└── 异步消息队列

第三次演进 (50K+用户)
├── Serverless计算
├── 边缘计算节点
├── AI智能运维
└── 大数据实时分析
```

---

## 13. 总结与建议

### 13.1 架构优势

1. **高性能实时通信**
   - Socket.IO集群支持400并发用户
   - WebSocket延迟<100ms，满足PvP需求
   - 多级缓存架构，热数据毫秒级响应

2. **可扩展的数据架构**
   - Redis分片+MongoDB集群，支持线性扩展
   - 混合存储策略，平衡性能与成本
   - 清晰的数据分层，便于维护和优化

3. **完善的防作弊机制**
   - 服务器权威性验证，杜绝客户端作弊
   - 实时行为监控，智能异常检测
   - 多重安全防护，保障竞技公平性

4. **强大的运维能力**
   - 容器化部署，快速扩缩容
   - 完整监控体系，主动故障预警
   - 结构化日志，便于问题追踪

### 13.2 实施建议

#### 13.2.1 分阶段实施计划
```
Phase 1: 核心功能开发 (4-6周)
├── 基础WebSocket通信
├── Redis状态管理
├── 基本战斗逻辑
└── 简单防作弊机制

Phase 2: 功能完善 (4-6周)
├── 法力衰减系统
├── 羁绊技能系统
├── 三维匹配算法
└── 性能优化

Phase 3: 运维完善 (2-4周)
├── 监控告警系统
├── 日志分析平台
├── 部署自动化
└── 压力测试

Phase 4: 上线准备 (2-3周)
├── 安全测试
├── 性能调优
├── 灾备演练
└── 文档完善
```

#### 13.2.2 关键风险与应对

| 风险项 | 影响程度 | 发生概率 | 应对策略 |
|--------|----------|----------|----------|
| **WebSocket连接不稳定** | 高 | 中 | 多重连接保障+自动重连机制 |
| **Redis内存不足** | 高 | 中 | 动态扩容+数据分层清理 |
| **MongoDB性能瓶颈** | 中 | 低 | 分片集群+读写分离 |
| **DDoS攻击** | 高 | 中 | WAF防护+流量清洗 |
| **大量并发突发** | 高 | 高 | HPA自动扩容+降级机制 |

#### 13.2.3 性能优化建议

1. **WebSocket优化**
   - 启用消息压缩（permessage-deflate）
   - 实施心跳检测，及时清理无效连接
   - 使用Sticky Sessions保证会话一致性

2. **Redis优化**
   - 开启Pipeline批量操作
   - 合理设置TTL，避免内存泄漏
   - 监控慢查询，优化数据结构

3. **MongoDB优化**
   - 建立复合索引，提升查询性能
   - 使用聚合管道，减少数据传输
   - 配置读关注级别，平衡一致性与性能

### 13.3 技术债务管理

#### 13.3.1 代码质量保障
- 代码覆盖率目标：85%+
- 静态代码分析：ESLint + SonarQube
- API文档自动生成：OpenAPI 3.0
- 技术债务定期Review，每月清理

#### 13.3.2 监控指标体系
- **SLI指标**：可用性99.9%，延迟P99<100ms
- **SLO目标**：月度停机时间<43分钟
- **错误预算**：月度0.1%错误率预算

---

## 14. 附录

### 14.1 技术选型对比表

| 技术域 | 备选方案1 | 备选方案2 | **选定方案** | 选择理由 |
|--------|-----------|-----------|--------------|----------|
| **实时通信** | 原生WebSocket | WebRTC | **Socket.IO** | 成熟稳定，自动降级 |
| **缓存数据库** | Memcached | **Redis** | Redis Cluster | 丰富数据结构，集群支持 |
| **文档数据库** | **MongoDB** | CouchDB | MongoDB | 查询能力强，分片成熟 |
| **消息队列** | Apache Kafka | **Redis Streams** | Redis Streams | 轻量级，延迟低 |
| **容器编排** | Docker Swarm | **Kubernetes** | Kubernetes | 生态完善，扩展性强 |

### 14.2 部署检查清单

#### 14.2.1 上线前检查项
- [ ] 所有服务健康检查通过
- [ ] 数据库连接池配置正确
- [ ] Redis集群状态正常
- [ ] 负载均衡配置验证
- [ ] SSL证书有效期检查
- [ ] 监控告警规则测试
- [ ] 备份恢复流程验证
- [ ] 安全扫描通过
- [ ] 性能压测达标
- [ ] 灾备切换演练

#### 14.2.2 运维手册要点
1. **日常巡检清单**
2. **故障应急响应流程**
3. **性能调优参数指南**
4. **扩容缩容操作手册**
5. **数据备份恢复指南**

### 14.3 相关文档链接
- [Socket.IO官方文档](https://socket.io/docs/)
- [Redis集群配置指南](https://redis.io/topics/cluster-tutorial)
- [MongoDB分片集群](https://docs.mongodb.com/manual/sharding/)
- [Kubernetes部署最佳实践](https://kubernetes.io/docs/concepts/overview/)

---

**文档结束**

> 本架构设计文档将作为"封域之争"PvP系统开发的技术蓝图，所有开发团队成员应严格按照此文档进行系统实现。如有技术方案调整，需经过架构评审委员会批准并更新此文档。

**联系方式**：Backend_Architect_Agent
**最后更新**：2025-09-16
**下次评审**：2025-09-30