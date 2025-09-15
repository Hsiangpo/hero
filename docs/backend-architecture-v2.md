# Hero Idle Game 后端架构设计文档 V2.0
**版本**: 2.0 (重构版)
**日期**: 2025-09-16
**架构师**: Backend_Architect_Agent
**项目**: 代号：英雄挂机啦 (英雄主题 + 咸鱼之王PvP机制)

---

## 📋 架构重构概述

### 重构目标
基于全新的英雄挂机核心玩法GDD，重构整个游戏的技术架构，重点支持《咸鱼之王》的盐场/盐罐PvP机制，特别是盐场的俱乐部大地图占点玩法。目标支持1万用户规模的并发访问。

### 核心PvP机制支持
- **盐场系统**: 六边格大地图占点，20个俱乐部同图竞技
- **盐罐系统**: 客厅访问机制，轻度PvP资源争夺
- **英雄觉醒系统**: 三品质觉醒石的时效和状态管理
- **实时战斗计算**: 精力衰减、属性递减、连杀机制

---

## 1. 数据持久化策略重构 (Data Persistence Strategy V2.0)

### 1.1 架构决策：混合数据存储方案

**决策声明**: 采用**Local Storage + 轻量云存储**的混合架构，以支持PvP功能的同时控制成本。

### 1.2 混合架构设计对比

| 数据类型 | 存储策略 | 理由 | 同步机制 |
|---------|---------|------|---------|
| **单人游戏数据** | Local Storage | 零延迟，成本最低 | 定期云端备份 |
| **PvP状态数据** | 云数据库 | 必须实时同步 | WebSocket实时更新 |
| **排行榜数据** | 云数据库 | 全局共享数据 | 定时批量更新 |
| **俱乐部数据** | 云数据库 | 多人共享数据 | 事件驱动更新 |
| **盐场地图状态** | Redis + 云数据库 | 高频读写优化 | 分布式锁 + 实时广播 |

### 1.3 存储架构分层设计

```typescript
// 数据分层架构
interface HybridDataArchitecture {
  // 本地存储层 (MVP兼容)
  localLayer: {
    heroData: HeroData;           // 英雄属性和等级
    playerProgress: GameProgress; // 关卡进度和金币
    awakingStones: AwakeningInventory; // 觉醒石背包
    settings: GameSettings;       // 游戏设置
  };

  // 云同步层 (PvP支持)
  cloudLayer: {
    userProfile: UserProfile;     // 用户基础信息
    clubMembership: ClubData;     // 俱乐部成员信息
    pvpRecord: PvPHistory;        // PvP战绩记录
    friendsList: SocialData;      // 好友和社交数据
  };

  // 实时状态层 (盐场专用)
  realtimeLayer: {
    saltFieldMap: SaltFieldState; // 盐场地图实时状态
    battleQueue: BattleQueue;     // 战斗队列管理
    onlineStatus: OnlineStatus;   // 用户在线状态
    liveEvents: EventStream;      // 实时事件流
  };
}
```

### 1.4 数据同步策略

**本地优先 + 云端校验模式:**
```typescript
class HybridDataManager {
  // 数据读取优先级
  async getData(key: string): Promise<any> {
    // 1. 优先读取本地缓存
    const localData = await this.getFromLocal(key);

    // 2. 对于PvP相关数据，必须云端校验
    if (this.isPvPData(key)) {
      const cloudData = await this.getFromCloud(key);
      return this.mergeAndValidate(localData, cloudData);
    }

    return localData;
  }

  // 写入策略
  async setData(key: string, data: any): Promise<void> {
    // 1. 立即写入本地
    await this.setToLocal(key, data);

    // 2. 异步同步到云端
    this.syncToCloud(key, data).catch(this.handleSyncError);
  }
}
```

---

## 2. 盐场系统架构设计 (Salt Field System)

### 2.1 六边格地图数据结构

```typescript
// 盐场地图核心数据模型
interface SaltFieldMap {
  mapId: string;              // 地图唯一标识
  season: number;             // 当前赛季
  clubs: ClubParticipant[];   // 参与俱乐部列表(20个)
  hexagons: HexagonTile[];    // 六边形地块数组
  battleQueue: BattleEvent[]; // 战斗队列
  weeklySchedule: WeeklyEvent; // 每周六20:00-21:00赛制
  lastUpdateTime: number;     // 最后更新时间戳
}

// 六边形地块定义
interface HexagonTile {
  tileId: string;           // 地块ID
  coordinates: HexCoords;   // 六边形坐标系
  tileType: TileType;       // 地块类型
  currentOwner?: string;    // 当前占领俱乐部ID
  occupationTime: number;   // 占领时间戳
  pointValue: number;       // 积分价值
  defenseBonus: number;     // 防御加成
  neighborTiles: string[];  // 相邻地块ID列表
}

// 地块类型枚举(参考咸鱼之王)
enum TileType {
  CORE = 'core',           // 核心据点 (最高积分)
  GOLD = 'gold',           // 金矿据点 (高积分)
  SILVER = 'silver',       // 银矿据点 (中积分)
  COPPER = 'copper',       // 铜矿据点 (基础积分)
  FORTRESS = 'fortress',   // 堡垒据点 (防御特化)
  SPAWN = 'spawn'          // 出生点 (保护区域)
}
```

### 2.2 实时战斗计算引擎

```typescript
// 盐场战斗计算系统
class SaltFieldBattleEngine {
  // 战斗力衰减系统(防刷分机制)
  calculateCombatPower(hero: HeroData, battleHistory: BattleRecord[]): number {
    const basePower = this.getBaseCombatPower(hero);

    // 精力衰减计算
    const energyDecay = this.calculateEnergyDecay(battleHistory);

    // 连续战斗衰减
    const fatigueDecay = this.calculateFatigueDecay(battleHistory);

    // 距离衰减(远征惩罚)
    const distanceDecay = this.calculateDistanceDecay(hero.currentPosition);

    return basePower * energyDecay * fatigueDecay * distanceDecay;
  }

  // 战斗结果计算
  async resolveBattle(attacker: HeroData, defender: HeroData, tile: HexagonTile): Promise<BattleResult> {
    const attackerPower = this.calculateCombatPower(attacker, attacker.recentBattles);
    const defenderPower = this.calculateCombatPower(defender, defender.recentBattles) * (1 + tile.defenseBonus);

    // 随机性因子 (±20%)
    const randomFactor = 0.8 + Math.random() * 0.4;

    const finalAttackerPower = attackerPower * randomFactor;

    return {
      victory: finalAttackerPower > defenderPower,
      damageDealt: Math.floor(finalAttackerPower * 0.3),
      experienceGained: Math.floor(defenderPower * 0.1),
      pointsAwarded: tile.pointValue,
      newOwner: finalAttackerPower > defenderPower ? attacker.clubId : defender.clubId
    };
  }
}
```

### 2.3 积分系统与排行榜

```typescript
// 盐场积分计算系统
interface ClubScoring {
  clubId: string;
  clubName: string;
  totalPoints: number;        // 总积分
  currentTerritories: number; // 当前占领地块数
  memberContributions: MemberScore[]; // 成员贡献
  weeklyRanking: number;      // 周排名
  seasonRanking: number;      // 赛季排名
}

// 积分实时计算
class ScoringSystem {
  // 每分钟积分结算
  async calculateMinutelyPoints(): Promise<void> {
    for (const tile of this.getAllOccupiedTiles()) {
      const pointsThisMinute = this.getPointValue(tile.tileType);

      await this.awardPointsToClub(tile.currentOwner, pointsThisMinute);

      // 个人贡献记录
      await this.recordMemberContribution(tile.occupiedBy, pointsThisMinute);
    }

    // 更新排行榜
    await this.updateRealTimeRankings();
  }
}
```

---

## 3. 盐罐系统架构设计 (Salt Jar System)

### 3.1 客厅访问机制

```typescript
// 盐罐客厅系统
interface PlayerLobby {
  playerId: string;
  lobbyLevel: number;         // 客厅等级
  saltJars: SaltJar[];        // 盐罐列表
  lastRefreshTime: number;    // 最后刷新时间
  dailyVisitors: string[];    // 今日访客列表
  defenseLog: DefenseRecord[]; // 防守记录
}

// 盐罐定义
interface SaltJar {
  jarId: string;
  jarType: SaltJarType;       // 盐罐品质
  status: JarStatus;          // 当前状态
  occupiedBy?: string;        // 占领者ID
  occupationStartTime: number; // 占领开始时间
  rewardValue: JarReward;     // 奖励内容
  collectionTime: number;     // 收集所需时间(30秒)
}

// 盐罐品质系统
enum SaltJarType {
  GOLD = 'gold',     // 金罐：每天限1个，高价值奖励
  SILVER = 'silver', // 银罐：每天限1个，中价值奖励
  NORMAL = 'normal'  // 普通：不限制，基础奖励
}

enum JarStatus {
  AVAILABLE = 'available',   // 可占领
  OCCUPIED = 'occupied',     // 被占领中
  COLLECTING = 'collecting', // 收集中
  COLLECTED = 'collected'    // 已收集
}
```

### 3.2 盐罐刷新与奖励机制

```typescript
class SaltJarManager {
  // 每4小时刷新盐罐
  async refreshSaltJars(playerId: string): Promise<void> {
    const lobby = await this.getPlayerLobby(playerId);
    const playerLevel = await this.getPlayerLevel(playerId);

    // 根据玩家等级和VIP等级决定盐罐配置
    const jarConfig = this.calculateJarConfiguration(playerLevel, lobby.vipLevel);

    lobby.saltJars = [
      this.generateJar(SaltJarType.GOLD, jarConfig.goldReward),
      this.generateJar(SaltJarType.SILVER, jarConfig.silverReward),
      ...Array(3).fill(null).map(() => this.generateJar(SaltJarType.NORMAL, jarConfig.normalReward))
    ];

    lobby.lastRefreshTime = Date.now();
    await this.saveLobby(lobby);
  }

  // 访问他人客厅
  async visitLobby(visitorId: string, hostId: string): Promise<LobbyVisitResult> {
    const hostLobby = await this.getPlayerLobby(hostId);
    const visitorStats = await this.getVisitorDailyStats(visitorId);

    // 检查每日访问限制(20个盐罐上限)
    if (visitorStats.collectedJarsToday >= 20) {
      return { success: false, reason: "今日盐罐收集已达上限" };
    }

    return {
      success: true,
      availableJars: hostLobby.saltJars.filter(jar => jar.status === JarStatus.AVAILABLE),
      occupiedJars: hostLobby.saltJars.filter(jar => jar.status === JarStatus.OCCUPIED)
    };
  }
}
```

---

## 4. 英雄觉醒系统升级 (Enhanced Awakening System)

### 4.1 觉醒石时效管理

```typescript
// 觉醒石增强系统
interface AwakeningStone {
  stoneId: string;
  stoneType: AwakeningType;    // 铜/银/金品质
  effectModifiers: EffectModifier[]; // 效果修正值
  duration: number;            // 持续时间(秒)
  remainingTime: number;       // 剩余时间
  pausedTime?: number;         // 离线暂停时间点
  activationTime: number;      // 激活时间戳
  stackable: boolean;          // 是否可叠加
}

// 觉醒效果计算引擎
class AwakeningEffectEngine {
  // PvP中的觉醒效果实时计算
  calculatePvPEffects(hero: HeroData, activeStones: AwakeningStone[]): HeroStats {
    let modifiedStats = { ...hero.baseStats };

    for (const stone of activeStones) {
      // 战斗速度加成
      if (stone.effectModifiers.battleSpeed) {
        modifiedStats.attackInterval *= (1 - stone.effectModifiers.battleSpeed);
      }

      // 暴击率加成(PvP关键)
      if (stone.effectModifiers.criticalRate) {
        modifiedStats.criticalRate += stone.effectModifiers.criticalRate;
      }

      // 金币获取加成(对盐罐收益影响)
      if (stone.effectModifiers.goldBonus) {
        modifiedStats.goldMultiplier *= (1 + stone.effectModifiers.goldBonus);
      }
    }

    return modifiedStats;
  }

  // 离线时暂停，上线后继续
  async resumeAwakeningEffects(playerId: string): Promise<void> {
    const activeStones = await this.getActiveAwakeningStones(playerId);
    const currentTime = Date.now();

    for (const stone of activeStones) {
      if (stone.pausedTime) {
        // 计算离线时间，觉醒石不消耗
        const offlineTime = currentTime - stone.pausedTime;
        stone.pausedTime = null;

        // 重新开始计时
        stone.activationTime = currentTime;
      }
    }

    await this.saveAwakeningStones(playerId, activeStones);
  }
}
```

---

## 5. 实时通信架构 (Real-time Communication)

### 5.1 WebSocket连接管理

```typescript
// WebSocket连接管理器
class RealtimeConnectionManager {
  private connections: Map<string, WebSocketConnection> = new Map();

  // 连接分级管理
  async establishConnection(userId: string, connectionType: ConnectionType): Promise<void> {
    const connection = new WebSocketConnection(userId);

    // 根据用户活动类型分配不同的连接优先级
    switch (connectionType) {
      case ConnectionType.SALT_FIELD_ACTIVE:
        // 盐场活跃用户：高频率更新
        connection.updateInterval = 1000; // 1秒更新
        await this.subscribeToSaltFieldEvents(connection);
        break;

      case ConnectionType.LOBBY_VISITOR:
        // 客厅访问者：中等频率
        connection.updateInterval = 5000; // 5秒更新
        await this.subscribeToLobbyEvents(connection);
        break;

      case ConnectionType.IDLE_PLAYER:
        // 挂机玩家：低频率推送
        connection.updateInterval = 30000; // 30秒更新
        await this.subscribeToBasicEvents(connection);
        break;
    }

    this.connections.set(userId, connection);
  }

  // 广播盐场状态更新
  async broadcastSaltFieldUpdate(mapUpdate: SaltFieldUpdate): Promise<void> {
    const affectedUsers = this.getAffectedUsers(mapUpdate.affectedTiles);

    for (const userId of affectedUsers) {
      const connection = this.connections.get(userId);
      if (connection && connection.type === ConnectionType.SALT_FIELD_ACTIVE) {
        await connection.send({
          type: 'SALT_FIELD_UPDATE',
          data: mapUpdate,
          timestamp: Date.now()
        });
      }
    }
  }
}
```

### 5.2 事件驱动架构

```typescript
// 事件驱动系统
class GameEventBus {
  // 盐场占领事件
  async onTileOccupied(event: TileOccupiedEvent): Promise<void> {
    // 1. 更新地图状态
    await this.updateTileOwnership(event.tileId, event.newOwnerId);

    // 2. 计算积分变化
    const pointsAwarded = await this.calculatePointsAwarded(event);

    // 3. 广播给相关用户
    await this.broadcastToClubMembers(event.clubId, {
      type: 'TERRITORY_GAINED',
      tile: event.tileId,
      points: pointsAwarded
    });

    // 4. 更新排行榜
    await this.updateClubRankings(event.clubId);

    // 5. 记录战斗日志
    await this.logBattleEvent(event);
  }

  // 盐罐争夺事件
  async onSaltJarContest(event: SaltJarContestEvent): Promise<void> {
    // PvP战斗计算
    const battleResult = await this.resolveSaltJarBattle(event);

    // 通知双方结果
    await this.notifyBattleParticipants(event.attackerId, event.defenderId, battleResult);

    // 如果胜利，开始30秒占领倒计时
    if (battleResult.attackerWins) {
      await this.startJarOccupationTimer(event.jarId, event.attackerId);
    }
  }
}
```

---

## 6. 数据库设计重构 (Database Schema V2.0)

### 6.1 云数据库表结构

**用户基础表 (Users)**
| 字段名 | 数据类型 | 约束条件 | 索引 | 描述 |
|--------|----------|----------|------|------|
| user_id | UUID | PRIMARY KEY | PK | 用户唯一标识 |
| platform_id | VARCHAR(100) | UNIQUE | INDEX | 平台用户ID |
| nickname | VARCHAR(50) | NOT NULL | - | 用户昵称 |
| club_id | UUID | FOREIGN KEY | FK | 所属俱乐部ID |
| club_join_time | TIMESTAMP | - | - | 加入俱乐部时间 |
| total_salt_field_points | BIGINT | DEFAULT 0 | INDEX | 盐场总积分 |
| salt_jars_collected_today | INT | DEFAULT 0 | - | 今日盐罐收集数 |
| last_active_time | TIMESTAMP | - | INDEX | 最后活跃时间 |
| created_at | TIMESTAMP | DEFAULT NOW() | - | 账户创建时间 |

**俱乐部表 (Clubs)**
| 字段名 | 数据类型 | 约束条件 | 索引 | 描述 |
|--------|----------|----------|------|------|
| club_id | UUID | PRIMARY KEY | PK | 俱乐部唯一标识 |
| club_name | VARCHAR(50) | NOT NULL | UNIQUE | 俱乐部名称 |
| leader_id | UUID | FOREIGN KEY | FK | 会长用户ID |
| member_count | INT | DEFAULT 1 | - | 成员数量 |
| current_season_points | BIGINT | DEFAULT 0 | INDEX | 当前赛季总积分 |
| weekly_ranking | INT | - | INDEX | 周排名 |
| season_ranking | INT | - | INDEX | 赛季排名 |
| participation_status | ENUM | - | - | 参赛状态 |

**盐场地图表 (SaltField_Map)**
| 字段名 | 数据类型 | 约束条件 | 索引 | 描述 |
|--------|----------|----------|------|------|
| tile_id | VARCHAR(20) | PRIMARY KEY | PK | 地块ID |
| coordinates_q | INT | NOT NULL | INDEX | 六边形坐标Q |
| coordinates_r | INT | NOT NULL | INDEX | 六边形坐标R |
| tile_type | ENUM | NOT NULL | - | 地块类型 |
| current_owner_club | UUID | FOREIGN KEY | FK | 当前占领俱乐部 |
| occupation_time | TIMESTAMP | - | - | 占领时间 |
| point_value | INT | NOT NULL | - | 积分价值 |
| defense_bonus | DECIMAL(3,2) | DEFAULT 0.00 | - | 防御加成 |

**盐罐客厅表 (SaltJar_Lobbies)**
| 字段名 | 数据类型 | 约束条件 | 索引 | 描述 |
|--------|----------|----------|------|------|
| jar_id | UUID | PRIMARY KEY | PK | 盐罐唯一标识 |
| owner_id | UUID | FOREIGN KEY | FK | 客厅主人ID |
| jar_type | ENUM | NOT NULL | - | 盐罐品质 |
| current_status | ENUM | NOT NULL | INDEX | 当前状态 |
| occupied_by | UUID | FOREIGN KEY | FK | 当前占领者ID |
| occupation_start_time | TIMESTAMP | - | - | 占领开始时间 |
| reward_gold | BIGINT | - | - | 金币奖励 |
| reward_items | JSON | - | - | 物品奖励 |
| last_refresh_time | TIMESTAMP | - | INDEX | 最后刷新时间 |

### 6.2 Redis缓存设计

```typescript
// Redis数据结构设计
interface RedisDataStructure {
  // 盐场实时状态 (高频读写)
  saltfield_state: {
    key: `saltfield:${mapId}:state`;
    data: SaltFieldMap;
    ttl: 3600; // 1小时过期
  };

  // 用户在线状态
  online_users: {
    key: `online:${userId}`;
    data: { lastSeen: number; connectionType: string };
    ttl: 300; // 5分钟过期
  };

  // 战斗队列
  battle_queue: {
    key: `battle:queue`;
    data: BattleEvent[];
    structure: 'LIST';
  };

  // 排行榜缓存
  club_rankings: {
    key: `rankings:clubs:weekly`;
    data: ClubScore[];
    structure: 'SORTED_SET';
    ttl: 600; // 10分钟刷新
  };
}
```

---

## 7. API端点设计重构 (API Endpoints V2.0)

### 7.1 盐场系统API

| HTTP方法 | 端点路径 | 描述 | 请求体 | 成功响应 | 错误响应 |
|---------|----------|------|--------|----------|----------|
| **盐场系统** |
| GET | `/api/v2/saltfield/map` | 获取盐场地图状态 | 无 | `{map: SaltFieldMap, userClubStatus}` | `{code: 8001, message: "地图数据获取失败"}` |
| POST | `/api/v2/saltfield/attack` | 发起占领攻击 | `{targetTileId, heroSquad}` | `{battleResult, newMapState}` | `{code: 8002, message: "战斗力不足"}` |
| GET | `/api/v2/saltfield/rankings` | 获取俱乐部排行榜 | 无 | `{weeklyRanking, seasonRanking}` | `{code: 8003, message: "排行榜服务异常"}` |
| POST | `/api/v2/saltfield/join-club` | 加入俱乐部 | `{clubId, applicationMessage}` | `{joinStatus, clubInfo}` | `{code: 8004, message: "俱乐部已满"}` |

### 7.2 盐罐系统API

| HTTP方法 | 端点路径 | 描述 | 请求体 | 成功响应 | 错误响应 |
|---------|----------|------|--------|----------|----------|
| **盐罐系统** |
| GET | `/api/v2/saltjar/lobby/{userId}` | 访问用户客厅 | 无 | `{lobby: PlayerLobby, availableJars}` | `{code: 9001, message: "客厅不存在"}` |
| POST | `/api/v2/saltjar/occupy` | 占领盐罐 | `{jarId, targetUserId}` | `{occupationResult, battleNeeded}` | `{code: 9002, message: "盐罐已被占领"}` |
| POST | `/api/v2/saltjar/collect` | 收集盐罐奖励 | `{jarId}` | `{rewards, collectionSuccess}` | `{code: 9003, message: "收集时间未到"}` |
| POST | `/api/v2/saltjar/battle` | 盐罐PvP战斗 | `{jarId, attackSquad}` | `{battleResult, jarOwnership}` | `{code: 9004, message: "今日挑战次数耗尽"}` |

### 7.3 觉醒系统API

| HTTP方法 | 端点路径 | 描述 | 请求体 | 成功响应 | 错误响应 |
|---------|----------|------|--------|----------|----------|
| **觉醒系统** |
| GET | `/api/v2/awakening/stones` | 获取觉醒石背包 | 无 | `{stones: AwakeningStone[], active}` | `{code: 10001, message: "数据读取失败"}` |
| POST | `/api/v2/awakening/activate` | 激活觉醒石 | `{stoneId, heroId}` | `{activationResult, newStats}` | `{code: 10002, message: "觉醒石冲突"}` |
| POST | `/api/v2/awakening/pause` | 暂停觉醒效果 | `{reason: 'offline'}` | `{pausedStones, resumeTime}` | `{code: 10003, message: "暂停失败"}` |

### 7.4 实时通信API

| HTTP方法 | 端点路径 | 描述 | 请求体 | 成功响应 | 错误响应 |
|---------|----------|------|--------|----------|----------|
| **实时系统** |
| WS | `/ws/saltfield` | 盐场实时更新连接 | 无 | 实时事件流 | 连接超时 |
| WS | `/ws/lobby` | 客厅访问实时通知 | 无 | 访客通知事件 | 权限不足 |
| POST | `/api/v2/events/subscribe` | 订阅特定事件 | `{eventTypes, userId}` | `{subscriptionId}` | `{code: 11001, message: "订阅失败"}` |

---

## 8. 性能优化与成本控制 (Performance & Cost Optimization)

### 8.1 1万用户并发优化策略

```typescript
// 分布式负载均衡设计
interface LoadBalancingStrategy {
  // 用户分片策略
  userSharding: {
    strategy: 'consistent_hashing';
    shardCount: 10;
    keyFunction: (userId: string) => hash(userId) % 10;
  };

  // 盐场地图分区
  mapPartitioning: {
    strategy: 'geographic_regions';
    regionsPerMap: 4;
    maxUsersPerRegion: 250; // 1000用户/4区域
  };

  // 连接池管理
  connectionPool: {
    maxConnections: 1000;
    idleTimeout: 300000; // 5分钟
    healthCheckInterval: 60000; // 1分钟
  };
}

// 缓存优化策略
class CacheOptimization {
  // 多级缓存设计
  private cacheHierarchy = {
    L1: 'Redis',      // 热数据，1秒TTL
    L2: 'MySQL',      // 温数据，5分钟TTL
    L3: 'LocalStorage' // 冷数据，永久缓存
  };

  async getCachedData(key: string): Promise<any> {
    // L1缓存命中
    let data = await this.redisClient.get(key);
    if (data) return JSON.parse(data);

    // L2数据库查询
    data = await this.mysqlQuery(key);
    if (data) {
      await this.redisClient.setex(key, 60, JSON.stringify(data));
      return data;
    }

    // L3本地存储降级
    return this.getFromLocalStorage(key);
  }
}
```

### 8.2 成本控制方案

**资源配置(月成本预估):**
```yaml
# 基础设施成本分析
infrastructure_cost:
  # 应用服务器
  app_servers:
    instance_type: "2核4GB"
    count: 2
    monthly_cost: "¥300/台 × 2 = ¥600"

  # 数据库服务
  database:
    instance_type: "2核4GB MySQL"
    storage: "100GB SSD"
    monthly_cost: "¥400"

  # Redis缓存
  redis_cluster:
    instance_type: "1GB内存"
    count: 2
    monthly_cost: "¥100/台 × 2 = ¥200"

  # CDN与带宽
  network:
    bandwidth: "10Mbps"
    cdn_traffic: "500GB"
    monthly_cost: "¥300"

  # 监控与备份
  operations:
    monitoring: "¥50"
    backup: "¥100"

  total_monthly_cost: "¥1,650"
  per_user_cost: "¥0.165/用户/月"
```

### 8.3 微信小程序优化

```typescript
// 小程序包体优化
interface MiniProgramOptimization {
  // 资源分包策略
  subpackaging: {
    main_package: {
      size_limit: '2MB';
      contents: ['基础UI', '登录模块', '单人挂机'];
    };

    saltfield_package: {
      size_limit: '2MB';
      contents: ['六边格地图资源', '盐场UI组件'];
    };

    social_package: {
      size_limit: '2MB';
      contents: ['客厅场景', '社交界面', '盐罐模型'];
    };
  };

  // 资源压缩优化
  asset_compression: {
    images: 'WebP格式 + 50%质量';
    audio: 'MP3 128kbps';
    json_data: 'Gzip压缩';
  };

  // 懒加载策略
  lazy_loading: {
    saltfield_map: '进入盐场时加载';
    lobby_scenes: '访问客厅时加载';
    battle_effects: '战斗开始时加载';
  };
}
```

---

## 9. 安全架构设计 (Security Architecture)

### 9.1 PvP反作弊系统

```typescript
// PvP反作弊验证系统
class AntiCheatSystem {
  // 战斗力校验
  async validateCombatPower(userId: string, reportedPower: number): Promise<boolean> {
    const serverCalculated = await this.calculateServerSidePower(userId);
    const deviation = Math.abs(reportedPower - serverCalculated) / serverCalculated;

    // 允许5%误差范围
    if (deviation > 0.05) {
      await this.flagSuspiciousActivity(userId, 'POWER_MISMATCH', {
        reported: reportedPower,
        expected: serverCalculated,
        deviation: deviation
      });
      return false;
    }
    return true;
  }

  // 操作频率检测
  async checkOperationFrequency(userId: string, operation: string): Promise<boolean> {
    const recentOps = await this.getRecentOperations(userId, operation, 60000); // 1分钟内

    const limits = {
      'SALTFIELD_ATTACK': 10,    // 每分钟最多10次攻击
      'SALTJAR_OCCUPY': 5,       // 每分钟最多5次占领
      'LOBBY_VISIT': 20          // 每分钟最多20次访问
    };

    if (recentOps.length > limits[operation]) {
      await this.temporaryBan(userId, 300000); // 5分钟冷却
      return false;
    }
    return true;
  }
}
```

### 9.2 数据加密与传输安全

```typescript
// 敏感数据加密策略
class DataSecurityManager {
  // PvP关键数据加密
  encryptPvPData(data: any): EncryptedPayload {
    const key = this.generateSessionKey();
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key);
    const signature = CryptoJS.HmacSHA256(encrypted.toString(), this.serverSecret);

    return {
      payload: encrypted.toString(),
      signature: signature.toString(),
      timestamp: Date.now()
    };
  }

  // WebSocket消息验证
  validateRealtimeMessage(message: RealtimeMessage): boolean {
    // 时间戳校验(防重放攻击)
    if (Date.now() - message.timestamp > 30000) return false;

    // 签名校验
    const expectedSignature = this.calculateMessageSignature(message);
    if (message.signature !== expectedSignature) return false;

    // 用户权限校验
    return this.checkUserPermissions(message.userId, message.operation);
  }
}
```

---

## 10. 监控与运维架构 (Monitoring & Operations)

### 10.1 关键指标监控

```typescript
// 核心业务指标监控
interface BusinessMetrics {
  // 盐场系统指标
  saltfield_metrics: {
    concurrent_battles: number;        // 并发战斗数
    average_battle_duration: number;   // 平均战斗时长
    territory_change_rate: number;     // 地盘变更频率
    club_participation_rate: number;   // 俱乐部参与率
  };

  // 盐罐系统指标
  saltjar_metrics: {
    daily_visits: number;              // 每日访问次数
    jar_collection_rate: number;       // 盐罐收集成功率
    pvp_battle_frequency: number;      // PvP战斗频次
    average_jar_value: number;         // 平均盐罐价值
  };

  // 系统性能指标
  performance_metrics: {
    websocket_connections: number;     // WebSocket连接数
    message_latency: number;           // 消息延迟(ms)
    database_query_time: number;      // 数据库查询耗时
    cache_hit_rate: number;           // 缓存命中率
  };
}

// 实时监控告警
class MonitoringSystem {
  private alertThresholds = {
    high_latency: 200,        // 延迟超过200ms告警
    low_cache_hit: 0.8,       // 缓存命中率低于80%告警
    high_error_rate: 0.01,    // 错误率超过1%告警
    concurrent_limit: 1200    // 并发连接超过1200告警
  };

  async checkSystemHealth(): Promise<HealthStatus> {
    const metrics = await this.collectMetrics();

    const alerts = [];
    if (metrics.message_latency > this.alertThresholds.high_latency) {
      alerts.push('HIGH_LATENCY');
    }
    if (metrics.cache_hit_rate < this.alertThresholds.low_cache_hit) {
      alerts.push('LOW_CACHE_PERFORMANCE');
    }

    return {
      status: alerts.length > 0 ? 'WARNING' : 'HEALTHY',
      alerts,
      timestamp: Date.now()
    };
  }
}
```

---

## 11. 部署架构建议 (Deployment Architecture)

### 11.1 微服务架构设计

```yaml
# Docker Compose 部署配置
version: '3.8'

services:
  # 核心游戏服务
  game-core:
    image: hero-idle-game:latest
    replicas: 2
    ports:
      - "3000-3001:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DB_URL}

  # 实时通信服务
  realtime-service:
    image: hero-idle-realtime:latest
    replicas: 2
    ports:
      - "3002-3003:3000"
    environment:
      - REDIS_URL=${REDIS_URL}
      - WS_PORT=3000

  # PvP战斗服务
  battle-service:
    image: hero-idle-battle:latest
    replicas: 1
    environment:
      - BATTLE_ENGINE=enabled
      - MAX_CONCURRENT_BATTLES=100

  # 数据库服务
  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_DATABASE=hero_idle_db
      - MYSQL_ROOT_PASSWORD=${MYSQL_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql

  # Redis缓存
  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru

  # 负载均衡
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### 11.2 CI/CD流水线

```yaml
# GitHub Actions 部署流水线
name: Deploy Hero Idle Game

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run Unit Tests
        run: npm test
      - name: Run Integration Tests
        run: npm run test:integration

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker Images
        run: |
          docker build -t hero-idle-game:${{ github.sha }} .
          docker build -t hero-idle-realtime:${{ github.sha }} ./services/realtime

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: |
          docker-compose -f docker-compose.prod.yml up -d
          docker system prune -f
```

---

## 12. 总结与实施路线图 (Summary & Roadmap)

### 12.1 架构特性总结

✅ **核心优势**:
- **成本可控**: 月运营成本约¥1,650，支持1万用户
- **渐进升级**: Local Storage → 混合架构 → 全云化的平滑升级路径
- **PvP就绪**: 完整支持盐场六边格占点和盐罐争夺机制
- **实时体验**: WebSocket + Redis 实现毫秒级状态同步
- **防作弊完备**: 多层验证确保PvP公平性

### 12.2 技术栈确认

- **前端引擎**: Cocos Creator 3.8.7 (支持小程序+原生App)
- **后端服务**: Node.js + TypeScript + Express
- **数据存储**: MySQL 8.0 + Redis 7.0 + LocalStorage
- **实时通信**: WebSocket + Socket.io
- **部署方案**: Docker + Docker Compose + Nginx

### 12.3 实施路线图

**Phase 1 (2周) - MVP兼容升级**:
- ✅ 保持现有Local Storage核心功能
- 🔧 添加云数据库基础设施
- 🔧 实现用户账户和俱乐部系统
- 🔧 部署基础监控体系

**Phase 2 (3周) - 盐罐系统上线**:
- 🚀 实现客厅访问和盐罐机制
- 🚀 上线轻度PvP战斗系统
- 🚀 集成WebSocket实时通知
- 🚀 完成社交功能基础架构

**Phase 3 (4周) - 盐场系统完整实现**:
- 🎯 六边格大地图系统开发
- 🎯 俱乐部占点机制上线
- 🎯 实时战斗引擎优化
- 🎯 完整反作弊系统部署

**Phase 4 (2周) - 性能优化与压力测试**:
- 🔥 1万用户并发压力测试
- 🔥 性能瓶颈识别和优化
- 🔥 监控告警体系完善
- 🔥 数据备份和灾难恢复

### 12.4 成功评判标准

- **稳定性**: 99.9%服务可用性，平均响应时间<200ms
- **并发能力**: 支持1万用户同时在线，盐场500人同时战斗
- **用户体验**: 盐场占点延迟<1秒，盐罐争夺实时通知
- **成本控制**: 月运营成本控制在¥2000以内
- **安全性**: PvP作弊检出率>95%，数据泄露零事故

---

**文档状态**: ✅ 已完成 (V2.0 重构版)
**下一步行动**: 可立即启动Phase 1实施，QA_Tester_Agent基于此架构编写PvP功能测试用例
**架构演进**: 本架构支持咸鱼之王级别的爆款潜力，可承载百万用户规模扩展