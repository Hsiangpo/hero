/**
 * 盐罐争夺系统测试套件
 *
 * 测试覆盖：
 * - 客厅访问机制
 * - 三档盐罐系统（金/银/普通）
 * - 30秒收集倒计时
 * - PvP争夺战斗
 * - 每日访问限制
 * - 盐罐刷新机制
 *
 * 基于规格：docs/backend-architecture-v2.md (第3节)
 * 作者：Guardian (QA_Tester_Agent)
 */

import { SaltJarManager, PlayerLobby, SaltJar, SaltJarType, JarStatus } from '../src/systems/SaltJarManager';
import { SaltJarBattleEngine, JarBattleResult } from '../src/systems/SaltJarBattleEngine';
import { HeroManager, HeroData } from '../src/systems/HeroManager';
import { NotificationManager } from '../src/systems/NotificationManager';

describe('盐罐争夺系统测试', () => {
  let saltJarManager: SaltJarManager;
  let battleEngine: SaltJarBattleEngine;
  let heroManager: HeroManager;
  let notificationManager: NotificationManager;
  let testPlayers: string[];
  let testHeroes: HeroData[];

  beforeEach(async () => {
    saltJarManager = new SaltJarManager();
    battleEngine = new SaltJarBattleEngine();
    heroManager = new HeroManager();
    notificationManager = new NotificationManager();

    // 创建测试玩家
    testPlayers = [
      'player_001', 'player_002', 'player_003', 'player_004', 'player_005'
    ];

    // 为每个测试玩家初始化客厅
    for (const playerId of testPlayers) {
      await saltJarManager.initializePlayerLobby(playerId);
    }

    // 准备测试英雄
    testHeroes = [
      await heroManager.getHeroById('E001'), // 火摆烂
      await heroManager.getHeroById('J001'), // 程序员摆烂
      await heroManager.getHeroById('L001'), // 吃货摆烂
      await heroManager.getHeroById('S001')  // 混沌摆烂
    ];
  });

  describe('客厅访问机制', () => {
    test('玩家客厅应该正确初始化', async () => {
      const playerId = testPlayers[0];
      const lobby = await saltJarManager.getPlayerLobby(playerId);

      expect(lobby.playerId).toBe(playerId);
      expect(lobby.lobbyLevel).toBeGreaterThanOrEqual(1);
      expect(lobby.saltJars).toBeDefined();
      expect(lobby.saltJars.length).toBe(5); // 默认5个盐罐位置
      expect(lobby.dailyVisitors).toEqual([]);
      expect(lobby.defenseLog).toEqual([]);
    });

    test('访问其他玩家客厅应该成功', async () => {
      const visitorId = testPlayers[0];
      const hostId = testPlayers[1];

      const visitResult = await saltJarManager.visitLobby(visitorId, hostId);

      expect(visitResult.success).toBe(true);
      expect(visitResult.availableJars).toBeDefined();
      expect(visitResult.occupiedJars).toBeDefined();
      expect(visitResult.hostLobbyLevel).toBeGreaterThanOrEqual(1);
    });

    test('自己不能访问自己的客厅', async () => {
      const playerId = testPlayers[0];

      const visitResult = await saltJarManager.visitLobby(playerId, playerId);

      expect(visitResult.success).toBe(false);
      expect(visitResult.reason).toContain('不能访问自己的客厅');
    });

    test('每日访问限制应该生效', async () => {
      const visitorId = testPlayers[0];

      // 模拟已经收集了20个盐罐
      await saltJarManager.setDailyCollectionCount(visitorId, 20);

      const hostId = testPlayers[1];
      const visitResult = await saltJarManager.visitLobby(visitorId, hostId);

      expect(visitResult.success).toBe(false);
      expect(visitResult.reason).toContain('今日盐罐收集已达上限');
    });

    test('访客记录应该被正确保存', async () => {
      const visitorId = testPlayers[0];
      const hostId = testPlayers[1];

      await saltJarManager.visitLobby(visitorId, hostId);

      const hostLobby = await saltJarManager.getPlayerLobby(hostId);
      expect(hostLobby.dailyVisitors).toContain(visitorId);

      const visitorStats = await saltJarManager.getVisitorDailyStats(visitorId);
      expect(visitorStats.visitedLobbies).toContain(hostId);
    });

    test('客厅等级应该影响盐罐配置', async () => {
      const lowLevelPlayer = testPlayers[0];
      const highLevelPlayer = testPlayers[1];

      await saltJarManager.setLobbyLevel(lowLevelPlayer, 1);
      await saltJarManager.setLobbyLevel(highLevelPlayer, 10);

      const lowLevelLobby = await saltJarManager.getPlayerLobby(lowLevelPlayer);
      const highLevelLobby = await saltJarManager.getPlayerLobby(highLevelPlayer);

      // 高等级客厅应该有更好的盐罐配置
      const lowLevelGoldJars = lowLevelLobby.saltJars.filter(jar => jar.jarType === SaltJarType.GOLD);
      const highLevelGoldJars = highLevelLobby.saltJars.filter(jar => jar.jarType === SaltJarType.GOLD);

      expect(highLevelGoldJars.length).toBeGreaterThanOrEqual(lowLevelGoldJars.length);
    });
  });

  describe('三档盐罐系统', () => {
    test('金罐应该每天限制1个', async () => {
      const playerId = testPlayers[0];
      await saltJarManager.refreshSaltJars(playerId);

      const lobby = await saltJarManager.getPlayerLobby(playerId);
      const goldJars = lobby.saltJars.filter(jar => jar.jarType === SaltJarType.GOLD);

      expect(goldJars.length).toBe(1);
    });

    test('银罐应该每天限制1个', async () => {
      const playerId = testPlayers[0];
      await saltJarManager.refreshSaltJars(playerId);

      const lobby = await saltJarManager.getPlayerLobby(playerId);
      const silverJars = lobby.saltJars.filter(jar => jar.jarType === SaltJarType.SILVER);

      expect(silverJars.length).toBe(1);
    });

    test('普通罐应该有3个', async () => {
      const playerId = testPlayers[0];
      await saltJarManager.refreshSaltJars(playerId);

      const lobby = await saltJarManager.getPlayerLobby(playerId);
      const normalJars = lobby.saltJars.filter(jar => jar.jarType === SaltJarType.NORMAL);

      expect(normalJars.length).toBe(3);
    });

    test('金罐奖励应该最高', async () => {
      const playerId = testPlayers[0];
      await saltJarManager.refreshSaltJars(playerId);

      const lobby = await saltJarManager.getPlayerLobby(playerId);
      const goldJar = lobby.saltJars.find(jar => jar.jarType === SaltJarType.GOLD);
      const silverJar = lobby.saltJars.find(jar => jar.jarType === SaltJarType.SILVER);
      const normalJar = lobby.saltJars.find(jar => jar.jarType === SaltJarType.NORMAL);

      expect(goldJar.rewardValue.gold).toBeGreaterThan(silverJar.rewardValue.gold);
      expect(silverJar.rewardValue.gold).toBeGreaterThan(normalJar.rewardValue.gold);

      // 金罐应该有额外的物品奖励
      expect(goldJar.rewardValue.items.length).toBeGreaterThan(0);
    });

    test('盐罐品质应该影响外观和动画', async () => {
      const playerId = testPlayers[0];
      await saltJarManager.refreshSaltJars(playerId);

      const lobby = await saltJarManager.getPlayerLobby(playerId);

      lobby.saltJars.forEach(jar => {
        expect(jar.visualConfig).toBeDefined();
        expect(jar.visualConfig.texture).toBeDefined();
        expect(jar.visualConfig.glowEffect).toBeDefined();

        switch (jar.jarType) {
          case SaltJarType.GOLD:
            expect(jar.visualConfig.glowColor).toBe('#FFD700');
            break;
          case SaltJarType.SILVER:
            expect(jar.visualConfig.glowColor).toBe('#C0C0C0');
            break;
          case SaltJarType.NORMAL:
            expect(jar.visualConfig.glowColor).toBe('#8B4513');
            break;
        }
      });
    });
  });

  describe('盐罐占领机制', () => {
    test('空闲盐罐应该可以直接占领', async () => {
      const visitorId = testPlayers[0];
      const hostId = testPlayers[1];

      const hostLobby = await saltJarManager.getPlayerLobby(hostId);
      const availableJar = hostLobby.saltJars.find(jar => jar.status === JarStatus.AVAILABLE);

      const occupationResult = await saltJarManager.occupyJar(visitorId, availableJar.jarId);

      expect(occupationResult.success).toBe(true);
      expect(occupationResult.occupiedBy).toBe(visitorId);
      expect(occupationResult.startTime).toBeDefined();
      expect(occupationResult.battleRequired).toBe(false);
    });

    test('被占领的盐罐应该需要战斗', async () => {
      const hostId = testPlayers[0];
      const firstVisitor = testPlayers[1];
      const secondVisitor = testPlayers[2];

      const hostLobby = await saltJarManager.getPlayerLobby(hostId);
      const targetJar = hostLobby.saltJars[0];

      // 第一个访客占领盐罐
      await saltJarManager.occupyJar(firstVisitor, targetJar.jarId);

      // 第二个访客尝试占领（应该需要战斗）
      const occupationResult = await saltJarManager.occupyJar(secondVisitor, targetJar.jarId);

      expect(occupationResult.battleRequired).toBe(true);
      expect(occupationResult.currentOccupant).toBe(firstVisitor);
    });

    test('30秒收集时间应该正确执行', async () => {
      const visitorId = testPlayers[0];
      const hostId = testPlayers[1];

      const hostLobby = await saltJarManager.getPlayerLobby(hostId);
      const jar = hostLobby.saltJars[0];

      await saltJarManager.occupyJar(visitorId, jar.jarId);

      const jarStatus = await saltJarManager.getJarStatus(jar.jarId);
      expect(jarStatus.status).toBe(JarStatus.OCCUPIED);
      expect(jarStatus.remainingTime).toBeCloseTo(30000, 1000); // 30秒±1秒误差

      // 30秒后应该可以收集
      await saltJarManager.simulateTimePassage(jar.jarId, 30000);

      const updatedStatus = await saltJarManager.getJarStatus(jar.jarId);
      expect(updatedStatus.canCollect).toBe(true);
    });

    test('收集过程中被打断应该失败', async () => {
      const visitorId = testPlayers[0];
      const attackerId = testPlayers[1];
      const hostId = testPlayers[2];

      const hostLobby = await saltJarManager.getPlayerLobby(hostId);
      const jar = hostLobby.saltJars[0];

      await saltJarManager.occupyJar(visitorId, jar.jarId);

      // 在收集时间内发起战斗
      await saltJarManager.simulateTimePassage(jar.jarId, 15000); // 15秒后

      const battleResult = await battleEngine.initiateBattle(attackerId, jar.jarId);

      if (battleResult.attackerWins) {
        const collectionResult = await saltJarManager.attemptCollection(visitorId, jar.jarId);
        expect(collectionResult.success).toBe(false);
        expect(collectionResult.reason).toContain('占领权已丢失');
      }
    });
  });

  describe('PvP战斗系统', () => {
    test('盐罐争夺战应该基于英雄编队', async () => {
      const attacker = testPlayers[0];
      const defender = testPlayers[1];
      const hostId = testPlayers[2];

      // 设置双方编队
      await heroManager.setPlayerFormation(attacker, [testHeroes[0], testHeroes[1]]);
      await heroManager.setPlayerFormation(defender, [testHeroes[2], testHeroes[3]]);

      const hostLobby = await saltJarManager.getPlayerLobby(hostId);
      const jar = hostLobby.saltJars[0];

      // 防守方先占领
      await saltJarManager.occupyJar(defender, jar.jarId);

      // 攻击方发起挑战
      const battleResult = await battleEngine.resolveBattle(attacker, defender, jar.jarId);

      expect(battleResult.attacker).toBe(attacker);
      expect(battleResult.defender).toBe(defender);
      expect(battleResult.battleDuration).toBeGreaterThan(0);
      expect(battleResult.damageDealt).toBeGreaterThan(0);
      expect(['victory', 'defeat']).toContain(battleResult.result);
    });

    test('战斗胜利者应该获得盐罐占领权', async () => {
      const attacker = testPlayers[0];
      const defender = testPlayers[1];
      const hostId = testPlayers[2];

      const hostLobby = await saltJarManager.getPlayerLobby(hostId);
      const jar = hostLobby.saltJars[0];

      await saltJarManager.occupyJar(defender, jar.jarId);

      // 模拟攻击方获胜
      const battleResult = await battleEngine.resolveBattleWithResult(
        attacker,
        defender,
        jar.jarId,
        true // 攻击方胜利
      );

      expect(battleResult.attackerWins).toBe(true);

      const jarStatus = await saltJarManager.getJarStatus(jar.jarId);
      expect(jarStatus.occupiedBy).toBe(attacker);
      expect(jarStatus.remainingTime).toBeCloseTo(30000, 1000); // 重新开始30秒倒计时
    });

    test('战斗失败者应该失去挑战机会', async () => {
      const attacker = testPlayers[0];
      const defender = testPlayers[1];
      const hostId = testPlayers[2];

      const hostLobby = await saltJarManager.getPlayerLobby(hostId);
      const jar = hostLobby.saltJars[0];

      await saltJarManager.occupyJar(defender, jar.jarId);

      // 模拟攻击方失败
      await battleEngine.resolveBattleWithResult(attacker, defender, jar.jarId, false);

      // 记录挑战失败
      const challengeRecord = await saltJarManager.getChallengeRecord(attacker, jar.jarId);
      expect(challengeRecord.failed).toBe(true);

      // 短时间内不能再次挑战同一盐罐
      const canChallenge = await saltJarManager.canChallengeJar(attacker, jar.jarId);
      expect(canChallenge).toBe(false);
    });

    test('每日挑战次数应该有限制', async () => {
      const attacker = testPlayers[0];
      const hostId = testPlayers[1];

      // 模拟已经进行了10次挑战
      await saltJarManager.setDailyChallengeCount(attacker, 10);

      const canChallenge = await saltJarManager.canInitiateChallenge(attacker);

      expect(canChallenge).toBe(false);
    });

    test('战斗应该有详细的日志记录', async () => {
      const attacker = testPlayers[0];
      const defender = testPlayers[1];
      const hostId = testPlayers[2];

      const hostLobby = await saltJarManager.getPlayerLobby(hostId);
      const jar = hostLobby.saltJars[0];

      await saltJarManager.occupyJar(defender, jar.jarId);

      const battleResult = await battleEngine.resolveBattle(attacker, defender, jar.jarId);

      const battleLog = await saltJarManager.getBattleLog(jar.jarId);

      expect(battleLog.participants).toContain(attacker);
      expect(battleLog.participants).toContain(defender);
      expect(battleLog.startTime).toBeDefined();
      expect(battleLog.endTime).toBeDefined();
      expect(battleLog.battleSequence).toBeDefined();
      expect(battleLog.finalResult).toBe(battleResult.result);
    });
  });

  describe('盐罐刷新机制', () => {
    test('盐罐应该每4小时刷新一次', async () => {
      const playerId = testPlayers[0];

      // 记录初始刷新时间
      const initialLobby = await saltJarManager.getPlayerLobby(playerId);
      const initialRefreshTime = initialLobby.lastRefreshTime;

      // 模拟4小时后
      await saltJarManager.simulateTimePassage(playerId, 4 * 60 * 60 * 1000);

      const shouldRefresh = await saltJarManager.shouldRefreshJars(playerId);
      expect(shouldRefresh).toBe(true);

      await saltJarManager.refreshSaltJars(playerId);

      const updatedLobby = await saltJarManager.getPlayerLobby(playerId);
      expect(updatedLobby.lastRefreshTime).toBeGreaterThan(initialRefreshTime);
    });

    test('刷新应该重置所有盐罐状态', async () => {
      const playerId = testPlayers[0];
      const visitorId = testPlayers[1];

      // 让访客占领一些盐罐
      const lobby = await saltJarManager.getPlayerLobby(playerId);
      await saltJarManager.occupyJar(visitorId, lobby.saltJars[0].jarId);
      await saltJarManager.occupyJar(visitorId, lobby.saltJars[1].jarId);

      // 强制刷新盐罐
      await saltJarManager.forceRefreshSaltJars(playerId);

      const refreshedLobby = await saltJarManager.getPlayerLobby(playerId);

      // 所有盐罐应该回到可用状态
      refreshedLobby.saltJars.forEach(jar => {
        expect(jar.status).toBe(JarStatus.AVAILABLE);
        expect(jar.occupiedBy).toBeUndefined();
      });
    });

    test('VIP等级应该影响盐罐刷新品质', async () => {
      const regularPlayer = testPlayers[0];
      const vipPlayer = testPlayers[1];

      await saltJarManager.setVIPLevel(regularPlayer, 0);
      await saltJarManager.setVIPLevel(vipPlayer, 5);

      await saltJarManager.refreshSaltJars(regularPlayer);
      await saltJarManager.refreshSaltJars(vipPlayer);

      const regularLobby = await saltJarManager.getPlayerLobby(regularPlayer);
      const vipLobby = await saltJarManager.getPlayerLobby(vipPlayer);

      const regularTotalValue = regularLobby.saltJars.reduce((sum, jar) => sum + jar.rewardValue.gold, 0);
      const vipTotalValue = vipLobby.saltJars.reduce((sum, jar) => sum + jar.rewardValue.gold, 0);

      expect(vipTotalValue).toBeGreaterThan(regularTotalValue);
    });

    test('玩家等级应该影响盐罐奖励数值', async () => {
      const lowLevelPlayer = testPlayers[0];
      const highLevelPlayer = testPlayers[1];

      await heroManager.setPlayerLevel(lowLevelPlayer, 10);
      await heroManager.setPlayerLevel(highLevelPlayer, 50);

      await saltJarManager.refreshSaltJars(lowLevelPlayer);
      await saltJarManager.refreshSaltJars(highLevelPlayer);

      const lowLevelLobby = await saltJarManager.getPlayerLobby(lowLevelPlayer);
      const highLevelLobby = await saltJarManager.getPlayerLobby(highLevelPlayer);

      const lowLevelGoldJar = lowLevelLobby.saltJars.find(jar => jar.jarType === SaltJarType.GOLD);
      const highLevelGoldJar = highLevelLobby.saltJars.find(jar => jar.jarType === SaltJarType.GOLD);

      expect(highLevelGoldJar.rewardValue.gold).toBeGreaterThan(lowLevelGoldJar.rewardValue.gold);
    });
  });

  describe('实时通知系统', () => {
    test('客厅被访问时应该发送通知', async () => {
      const hostId = testPlayers[0];
      const visitorId = testPlayers[1];

      await notificationManager.enableNotifications(hostId);

      await saltJarManager.visitLobby(visitorId, hostId);

      const notifications = await notificationManager.getNotifications(hostId);
      const visitNotification = notifications.find(n => n.type === 'LOBBY_VISIT');

      expect(visitNotification).toBeDefined();
      expect(visitNotification.visitorId).toBe(visitorId);
      expect(visitNotification.timestamp).toBeDefined();
    });

    test('盐罐被占领时应该通知主人', async () => {
      const hostId = testPlayers[0];
      const visitorId = testPlayers[1];

      await notificationManager.enableNotifications(hostId);

      const lobby = await saltJarManager.getPlayerLobby(hostId);
      await saltJarManager.occupyJar(visitorId, lobby.saltJars[0].jarId);

      const notifications = await notificationManager.getNotifications(hostId);
      const occupationNotification = notifications.find(n => n.type === 'JAR_OCCUPIED');

      expect(occupationNotification).toBeDefined();
      expect(occupationNotification.occupantId).toBe(visitorId);
      expect(occupationNotification.jarType).toBeDefined();
    });

    test('盐罐争夺战开始时应该通知双方', async () => {
      const hostId = testPlayers[0];
      const defender = testPlayers[1];
      const attacker = testPlayers[2];

      await notificationManager.enableNotifications(defender);
      await notificationManager.enableNotifications(attacker);

      const lobby = await saltJarManager.getPlayerLobby(hostId);
      const jar = lobby.saltJars[0];

      await saltJarManager.occupyJar(defender, jar.jarId);
      await battleEngine.initiateBattle(attacker, jar.jarId);

      const defenderNotifications = await notificationManager.getNotifications(defender);
      const attackerNotifications = await notificationManager.getNotifications(attacker);

      const defenderBattleNotif = defenderNotifications.find(n => n.type === 'BATTLE_CHALLENGE');
      const attackerBattleNotif = attackerNotifications.find(n => n.type === 'BATTLE_INITIATED');

      expect(defenderBattleNotif).toBeDefined();
      expect(attackerBattleNotif).toBeDefined();
    });

    test('盐罐收集完成时应该发送奖励通知', async () => {
      const visitorId = testPlayers[0];
      const hostId = testPlayers[1];

      await notificationManager.enableNotifications(visitorId);

      const lobby = await saltJarManager.getPlayerLobby(hostId);
      const jar = lobby.saltJars[0];

      await saltJarManager.occupyJar(visitorId, jar.jarId);
      await saltJarManager.simulateTimePassage(jar.jarId, 30000);

      const collectionResult = await saltJarManager.collectJar(visitorId, jar.jarId);

      expect(collectionResult.success).toBe(true);

      const notifications = await notificationManager.getNotifications(visitorId);
      const rewardNotification = notifications.find(n => n.type === 'REWARD_COLLECTED');

      expect(rewardNotification).toBeDefined();
      expect(rewardNotification.rewards).toEqual(collectionResult.rewards);
    });
  });

  describe('统计和成就系统', () => {
    test('访问统计应该被正确记录', async () => {
      const visitorId = testPlayers[0];

      for (let i = 1; i <= 3; i++) {
        await saltJarManager.visitLobby(visitorId, testPlayers[i]);
      }

      const visitStats = await saltJarManager.getVisitStatistics(visitorId);

      expect(visitStats.dailyVisits).toBe(3);
      expect(visitStats.totalVisits).toBe(3);
      expect(visitStats.uniqueLobbiesVisited).toBe(3);
    });

    test('收集统计应该分类记录', async () => {
      const visitorId = testPlayers[0];
      const hostId = testPlayers[1];

      const lobby = await saltJarManager.getPlayerLobby(hostId);

      // 收集不同类型的盐罐
      const goldJar = lobby.saltJars.find(jar => jar.jarType === SaltJarType.GOLD);
      const silverJar = lobby.saltJars.find(jar => jar.jarType === SaltJarType.SILVER);
      const normalJar = lobby.saltJars.find(jar => jar.jarType === SaltJarType.NORMAL);

      await saltJarManager.occupyAndCollectJar(visitorId, goldJar.jarId);
      await saltJarManager.occupyAndCollectJar(visitorId, silverJar.jarId);
      await saltJarManager.occupyAndCollectJar(visitorId, normalJar.jarId);

      const collectionStats = await saltJarManager.getCollectionStatistics(visitorId);

      expect(collectionStats.goldJarsCollected).toBe(1);
      expect(collectionStats.silverJarsCollected).toBe(1);
      expect(collectionStats.normalJarsCollected).toBe(1);
      expect(collectionStats.totalJarsCollected).toBe(3);
    });

    test('战斗胜率应该被统计', async () => {
      const playerId = testPlayers[0];

      // 模拟5胜3负的战绩
      await saltJarManager.recordBattleResult(playerId, 'victory');
      await saltJarManager.recordBattleResult(playerId, 'victory');
      await saltJarManager.recordBattleResult(playerId, 'victory');
      await saltJarManager.recordBattleResult(playerId, 'victory');
      await saltJarManager.recordBattleResult(playerId, 'victory');
      await saltJarManager.recordBattleResult(playerId, 'defeat');
      await saltJarManager.recordBattleResult(playerId, 'defeat');
      await saltJarManager.recordBattleResult(playerId, 'defeat');

      const battleStats = await saltJarManager.getBattleStatistics(playerId);

      expect(battleStats.totalBattles).toBe(8);
      expect(battleStats.victories).toBe(5);
      expect(battleStats.defeats).toBe(3);
      expect(battleStats.winRate).toBeCloseTo(0.625, 2); // 5/8 = 62.5%
    });

    test('成就应该在达成条件时解锁', async () => {
      const playerId = testPlayers[0];

      // 模拟收集100个盐罐的成就
      await saltJarManager.setCollectionCount(playerId, 100);

      const achievements = await saltJarManager.checkAchievements(playerId);
      const collectorAchievement = achievements.find(a => a.id === 'JAR_COLLECTOR_100');

      expect(collectorAchievement).toBeDefined();
      expect(collectorAchievement.unlocked).toBe(true);
      expect(collectorAchievement.unlockedAt).toBeDefined();
    });
  });

  describe('错误处理和边界条件', () => {
    test('访问不存在的客厅应该失败', async () => {
      const visitorId = testPlayers[0];
      const nonExistentHostId = 'NON_EXISTENT_PLAYER';

      const visitResult = await saltJarManager.visitLobby(visitorId, nonExistentHostId);

      expect(visitResult.success).toBe(false);
      expect(visitResult.reason).toContain('客厅不存在');
    });

    test('占领不存在的盐罐应该失败', async () => {
      const visitorId = testPlayers[0];
      const invalidJarId = 'INVALID_JAR_ID';

      await expect(
        saltJarManager.occupyJar(visitorId, invalidJarId)
      ).rejects.toThrow('盐罐不存在');
    });

    test('收集时间未到不能收集', async () => {
      const visitorId = testPlayers[0];
      const hostId = testPlayers[1];

      const lobby = await saltJarManager.getPlayerLobby(hostId);
      const jar = lobby.saltJars[0];

      await saltJarManager.occupyJar(visitorId, jar.jarId);

      // 立即尝试收集（时间未到）
      const collectionResult = await saltJarManager.collectJar(visitorId, jar.jarId);

      expect(collectionResult.success).toBe(false);
      expect(collectionResult.reason).toContain('收集时间未到');
    });

    test('非占领者不能收集盐罐', async () => {
      const occupantId = testPlayers[0];
      const intruderId = testPlayers[1];
      const hostId = testPlayers[2];

      const lobby = await saltJarManager.getPlayerLobby(hostId);
      const jar = lobby.saltJars[0];

      await saltJarManager.occupyJar(occupantId, jar.jarId);
      await saltJarManager.simulateTimePassage(jar.jarId, 30000);

      // 其他人尝试收集
      const collectionResult = await saltJarManager.collectJar(intruderId, jar.jarId);

      expect(collectionResult.success).toBe(false);
      expect(collectionResult.reason).toContain('不是占领者');
    });

    test('已收集的盐罐不能重复收集', async () => {
      const visitorId = testPlayers[0];
      const hostId = testPlayers[1];

      const lobby = await saltJarManager.getPlayerLobby(hostId);
      const jar = lobby.saltJars[0];

      await saltJarManager.occupyJar(visitorId, jar.jarId);
      await saltJarManager.simulateTimePassage(jar.jarId, 30000);

      // 第一次收集
      const firstCollection = await saltJarManager.collectJar(visitorId, jar.jarId);
      expect(firstCollection.success).toBe(true);

      // 尝试重复收集
      const secondCollection = await saltJarManager.collectJar(visitorId, jar.jarId);
      expect(secondCollection.success).toBe(false);
      expect(secondCollection.reason).toContain('已被收集');
    });
  });

  describe('性能和优化验证', () => {
    test('盐罐状态查询应该高效', async () => {
      const playerId = testPlayers[0];
      const lobby = await saltJarManager.getPlayerLobby(playerId);

      const startTime = Date.now();

      for (const jar of lobby.saltJars) {
        await saltJarManager.getJarStatus(jar.jarId);
      }

      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(100); // 100ms内完成5个盐罐状态查询
    });

    test('大量客厅访问应该保持性能', async () => {
      const visitorId = testPlayers[0];
      const hosts = testPlayers.slice(1);

      const startTime = Date.now();

      await Promise.all(
        hosts.map(hostId => saltJarManager.visitLobby(visitorId, hostId))
      );

      const visitTime = Date.now() - startTime;

      expect(visitTime).toBeLessThan(500); // 500ms内完成4个客厅访问
    });

    test('盐罐数据缓存应该有效', async () => {
      const playerId = testPlayers[0];

      // 第一次获取客厅数据
      const startTime1 = Date.now();
      await saltJarManager.getPlayerLobby(playerId);
      const firstQueryTime = Date.now() - startTime1;

      // 第二次获取（应该使用缓存）
      const startTime2 = Date.now();
      await saltJarManager.getPlayerLobby(playerId);
      const secondQueryTime = Date.now() - startTime2;

      expect(secondQueryTime).toBeLessThan(firstQueryTime * 0.5);
    });

    test('并发盐罐操作应该正确处理', async () => {
      const hostId = testPlayers[0];
      const visitors = testPlayers.slice(1);

      const lobby = await saltJarManager.getPlayerLobby(hostId);
      const targetJar = lobby.saltJars[0];

      // 多个访客同时尝试占领同一盐罐
      const occupationPromises = visitors.map(visitorId =>
        saltJarManager.occupyJar(visitorId, targetJar.jarId)
      );

      const results = await Promise.all(occupationPromises.map(p => p.catch(e => ({ error: e.message }))));

      // 应该只有一个成功，其他的失败或需要战斗
      const successfulOccupations = results.filter(r => r.success === true);
      expect(successfulOccupations.length).toBe(1);
    });
  });
});