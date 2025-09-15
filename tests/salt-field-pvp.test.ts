/**
 * 盐场PvP系统测试套件
 *
 * 测试覆盖：
 * - 六边格地图占点机制
 * - 20俱乐部同图竞技
 * - 精力衰减与属性递减
 * - 据点积分计算
 * - 实时战斗引擎
 * - 排行榜系统
 *
 * 基于规格：docs/backend-architecture-v2.md (第2节)
 * 作者：Guardian (QA_Tester_Agent)
 */

import { SaltFieldManager, SaltFieldMap, HexagonTile, ClubParticipant } from '../src/systems/SaltFieldManager';
import { SaltFieldBattleEngine, BattleRecord, BattleResult } from '../src/systems/SaltFieldBattleEngine';
import { ClubManager, ClubData } from '../src/systems/ClubManager';
import { HeroManager, HeroData } from '../src/systems/HeroManager';

describe('盐场PvP系统测试', () => {
  let saltFieldManager: SaltFieldManager;
  let battleEngine: SaltFieldBattleEngine;
  let clubManager: ClubManager;
  let heroManager: HeroManager;
  let testMap: SaltFieldMap;
  let testClubs: ClubData[];
  let testHeroes: HeroData[];

  beforeEach(async () => {
    saltFieldManager = new SaltFieldManager();
    battleEngine = new SaltFieldBattleEngine();
    clubManager = new ClubManager();
    heroManager = new HeroManager();

    // 创建测试地图
    testMap = await saltFieldManager.createTestMap('test_salt_field_001');

    // 创建20个测试俱乐部
    testClubs = [];
    for (let i = 1; i <= 20; i++) {
      const club = await clubManager.createClub(`测试俱乐部${i}`, `test_leader_${i}`);
      testClubs.push(club);
    }

    // 准备测试英雄
    testHeroes = [
      await heroManager.getHeroById('E001'), // 火摆烂
      await heroManager.getHeroById('E002'), // 水摆烂
      await heroManager.getHeroById('J001'), // 程序员摆烂
      await heroManager.getHeroById('L001')  // 吃货摆烂
    ];
  });

  describe('六边格地图系统', () => {
    test('地图应该包含正确数量的六边形地块', async () => {
      const hexagons = await saltFieldManager.getMapHexagons(testMap.mapId);

      // 验证地图规模（假设标准盐场有127个六边格）
      expect(hexagons.length).toBe(127);

      // 验证每个地块都有有效的六边形坐标
      hexagons.forEach(hex => {
        expect(hex.coordinates.q).toBeDefined();
        expect(hex.coordinates.r).toBeDefined();
        expect(hex.coordinates.s).toBe(-hex.coordinates.q - hex.coordinates.r); // 六边形坐标约束
      });
    });

    test('地块类型分布应该合理', async () => {
      const hexagons = await saltFieldManager.getMapHexagons(testMap.mapId);

      const tileTypeCounts = {
        CORE: hexagons.filter(h => h.tileType === 'CORE').length,
        GOLD: hexagons.filter(h => h.tileType === 'GOLD').length,
        SILVER: hexagons.filter(h => h.tileType === 'SILVER').length,
        COPPER: hexagons.filter(h => h.tileType === 'COPPER').length,
        FORTRESS: hexagons.filter(h => h.tileType === 'FORTRESS').length,
        SPAWN: hexagons.filter(h => h.tileType === 'SPAWN').length
      };

      // 验证地块类型分布
      expect(tileTypeCounts.CORE).toBe(1);        // 只有1个核心据点
      expect(tileTypeCounts.GOLD).toBeBetween(3, 7);   // 3-7个金矿据点
      expect(tileTypeCounts.SILVER).toBeBetween(8, 15); // 8-15个银矿据点
      expect(tileTypeCounts.SPAWN).toBe(20);      // 20个出生点（对应20个俱乐部）
      expect(tileTypeCounts.COPPER).toBeGreaterThan(50); // 大部分是铜矿据点
    });

    test('地块相邻关系应该正确计算', async () => {
      const centerTile = await saltFieldManager.getTileByCoordinates(testMap.mapId, 0, 0);
      const neighbors = await saltFieldManager.getNeighborTiles(centerTile.tileId);

      // 六边形的中心地块应该有6个邻居
      expect(neighbors.length).toBe(6);

      // 验证邻居坐标的正确性
      const expectedNeighborCoords = [
        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
        { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
      ];

      neighbors.forEach(neighbor => {
        const isValidNeighbor = expectedNeighborCoords.some(coord =>
          neighbor.coordinates.q === coord.q && neighbor.coordinates.r === coord.r
        );
        expect(isValidNeighbor).toBe(true);
      });
    });

    test('地块积分价值应该与类型匹配', async () => {
      const coreTile = await saltFieldManager.getTileByType(testMap.mapId, 'CORE');
      const goldTile = await saltFieldManager.getTileByType(testMap.mapId, 'GOLD');
      const silverTile = await saltFieldManager.getTileByType(testMap.mapId, 'SILVER');
      const copperTile = await saltFieldManager.getTileByType(testMap.mapId, 'COPPER');

      expect(coreTile.pointValue).toBeGreaterThan(goldTile.pointValue);
      expect(goldTile.pointValue).toBeGreaterThan(silverTile.pointValue);
      expect(silverTile.pointValue).toBeGreaterThan(copperTile.pointValue);

      // 具体数值验证
      expect(coreTile.pointValue).toBeGreaterThanOrEqual(100);
      expect(goldTile.pointValue).toBeBetween(50, 99);
      expect(silverTile.pointValue).toBeBetween(20, 49);
      expect(copperTile.pointValue).toBeBetween(5, 19);
    });

    test('防御加成应该正确应用', async () => {
      const fortressTile = await saltFieldManager.getTileByType(testMap.mapId, 'FORTRESS');
      const normalTile = await saltFieldManager.getTileByType(testMap.mapId, 'COPPER');

      expect(fortressTile.defenseBonus).toBeGreaterThan(normalTile.defenseBonus);
      expect(fortressTile.defenseBonus).toBeBetween(0.2, 0.5); // 20%-50%防御加成
    });
  });

  describe('20俱乐部竞技机制', () => {
    test('地图应该支持20个俱乐部同时参与', async () => {
      await saltFieldManager.initializeClubParticipation(testMap.mapId, testClubs);

      const participants = await saltFieldManager.getMapParticipants(testMap.mapId);

      expect(participants.length).toBe(20);
      expect(participants.map(p => p.clubId)).toEqual(testClubs.map(c => c.club_id));
    });

    test('每个俱乐部应该有指定的出生点', async () => {
      await saltFieldManager.initializeClubParticipation(testMap.mapId, testClubs);

      const spawnTiles = await saltFieldManager.getTilesByType(testMap.mapId, 'SPAWN');

      expect(spawnTiles.length).toBe(20);

      // 每个出生点应该被一个俱乐部占领
      spawnTiles.forEach(tile => {
        expect(tile.currentOwner).toBeDefined();
        expect(testClubs.map(c => c.club_id)).toContain(tile.currentOwner);
      });
    });

    test('俱乐部初始积分应该为0', async () => {
      await saltFieldManager.initializeClubParticipation(testMap.mapId, testClubs);

      for (const club of testClubs) {
        const score = await saltFieldManager.getClubScore(testMap.mapId, club.club_id);
        expect(score.totalPoints).toBe(0);
        expect(score.currentTerritories).toBe(1); // 只有出生点
      }
    });

    test('俱乐部成员应该能够参与盐场战斗', async () => {
      const testClub = testClubs[0];
      const memberId = 'test_member_001';

      await clubManager.addMember(testClub.club_id, memberId);

      const canParticipate = await saltFieldManager.canMemberParticipate(
        testMap.mapId,
        testClub.club_id,
        memberId
      );

      expect(canParticipate).toBe(true);
    });

    test('非俱乐部成员不应该能参与战斗', async () => {
      const nonMemberId = 'non_member_001';

      const canParticipate = await saltFieldManager.canMemberParticipate(
        testMap.mapId,
        testClubs[0].club_id,
        nonMemberId
      );

      expect(canParticipate).toBe(false);
    });
  });

  describe('战斗力衰减系统', () => {
    test('精力衰减应该正确计算', async () => {
      const heroData = testHeroes[0];
      const battlesInLastHour = [
        { timestamp: Date.now() - 10 * 60 * 1000, energyCost: 20 }, // 10分钟前
        { timestamp: Date.now() - 30 * 60 * 1000, energyCost: 25 }, // 30分钟前
        { timestamp: Date.now() - 50 * 60 * 1000, energyCost: 15 }, // 50分钟前
      ];

      const energyDecay = battleEngine.calculateEnergyDecay(battlesInLastHour);

      // 精力衰减应该在0.5-1.0之间
      expect(energyDecay).toBeBetween(0.5, 1.0);

      // 战斗越多，衰减应该越严重
      expect(energyDecay).toBeLessThan(1.0);
    });

    test('连续战斗疲劳衰减应该累积', async () => {
      const recentBattles = [];
      const currentTime = Date.now();

      // 模拟连续5场战斗
      for (let i = 0; i < 5; i++) {
        recentBattles.push({
          timestamp: currentTime - i * 2 * 60 * 1000, // 每2分钟一场
          duration: 120000, // 2分钟战斗时长
          result: 'victory'
        });
      }

      const fatigueDecay = battleEngine.calculateFatigueDecay(recentBattles);

      expect(fatigueDecay).toBeLessThan(1.0);
      expect(fatigueDecay).toBeGreaterThan(0.3); // 不应该衰减得过于严重
    });

    test('距离衰减应该影响远征作战', async () => {
      const heroPosition = { q: 0, r: 0 }; // 英雄当前位置
      const nearTarget = { q: 1, r: 0 };   // 相邻地块
      const farTarget = { q: 5, r: 5 };    // 远距离地块

      const nearDecay = battleEngine.calculateDistanceDecay(heroPosition, nearTarget);
      const farDecay = battleEngine.calculateDistanceDecay(heroPosition, farTarget);

      expect(nearDecay).toBeGreaterThan(farDecay);
      expect(nearDecay).toBeCloseTo(1.0, 1); // 相邻地块几乎无衰减
      expect(farDecay).toBeLessThan(0.8);    // 远距离有明显衰减
    });

    test('综合战斗力计算应该考虑所有衰减因子', async () => {
      const heroData = testHeroes[0];
      const battleHistory = [
        { timestamp: Date.now() - 15 * 60 * 1000, energyCost: 20, duration: 120000 },
        { timestamp: Date.now() - 45 * 60 * 1000, energyCost: 25, duration: 180000 }
      ];

      const heroPosition = { q: 0, r: 0 };
      const targetPosition = { q: 3, r: 2 };

      const combatPower = await battleEngine.calculateCombatPower(
        heroData,
        battleHistory,
        heroPosition,
        targetPosition
      );

      const basePower = await heroManager.calculateCombatPower(heroData, 50);

      // 综合战斗力应该低于基础战力
      expect(combatPower).toBeLessThan(basePower);
      expect(combatPower / basePower).toBeGreaterThan(0.3); // 但不应该衰减过度
    });
  });

  describe('据点占领与积分系统', () => {
    test('据点占领应该正确执行', async () => {
      const attackerClub = testClubs[0];
      const defenderClub = testClubs[1];
      const targetTile = await saltFieldManager.getTileByType(testMap.mapId, 'COPPER');

      // 先让防守方占领据点
      await saltFieldManager.occupyTile(targetTile.tileId, defenderClub.club_id);

      // 攻击方发起占领
      const occupationResult = await saltFieldManager.attemptOccupation(
        targetTile.tileId,
        attackerClub.club_id,
        'test_attacker_001'
      );

      expect(occupationResult.success).toBe(true);
      expect(occupationResult.newOwner).toBe(attackerClub.club_id);
      expect(occupationResult.pointsAwarded).toBe(targetTile.pointValue);
    });

    test('据点积分应该每分钟结算', async () => {
      const club = testClubs[0];
      const goldTile = await saltFieldManager.getTileByType(testMap.mapId, 'GOLD');

      await saltFieldManager.occupyTile(goldTile.tileId, club.club_id);

      const initialScore = await saltFieldManager.getClubScore(testMap.mapId, club.club_id);

      // 模拟1分钟积分结算
      await saltFieldManager.calculateMinutelyPoints(testMap.mapId);

      const updatedScore = await saltFieldManager.getClubScore(testMap.mapId, club.club_id);

      expect(updatedScore.totalPoints).toBeGreaterThan(initialScore.totalPoints);
      expect(updatedScore.totalPoints - initialScore.totalPoints).toBe(goldTile.pointValue);
    });

    test('核心据点应该提供最高积分', async () => {
      const club = testClubs[0];
      const coreTile = await saltFieldManager.getTileByType(testMap.mapId, 'CORE');

      await saltFieldManager.occupyTile(coreTile.tileId, club.club_id);
      await saltFieldManager.calculateMinutelyPoints(testMap.mapId);

      const score = await saltFieldManager.getClubScore(testMap.mapId, club.club_id);

      expect(score.pointsPerMinute).toBeGreaterThanOrEqual(100);
    });

    test('多据点占领应该累计积分', async () => {
      const club = testClubs[0];
      const goldTile = await saltFieldManager.getTileByType(testMap.mapId, 'GOLD');
      const silverTile = await saltFieldManager.getTileByType(testMap.mapId, 'SILVER');

      await saltFieldManager.occupyTile(goldTile.tileId, club.club_id);
      await saltFieldManager.occupyTile(silverTile.tileId, club.club_id);

      await saltFieldManager.calculateMinutelyPoints(testMap.mapId);

      const score = await saltFieldManager.getClubScore(testMap.mapId, club.club_id);
      const expectedPoints = goldTile.pointValue + silverTile.pointValue;

      expect(score.pointsPerMinute).toBe(expectedPoints);
    });
  });

  describe('实时战斗计算', () => {
    test('战斗结果应该基于战力和随机因子', async () => {
      const attackerHero = testHeroes[0];
      const defenderHero = testHeroes[1];
      const battleTile = await saltFieldManager.getTileByType(testMap.mapId, 'COPPER');

      // 进行多次战斗以验证随机性
      const results = [];
      for (let i = 0; i < 10; i++) {
        const battleResult = await battleEngine.resolveBattle(
          attackerHero,
          defenderHero,
          battleTile
        );
        results.push(battleResult.victory);
      }

      // 应该有胜负变化（验证随机因子存在）
      const victories = results.filter(r => r === true).length;
      const defeats = results.filter(r => r === false).length;

      // 在10场战斗中，应该不是全胜或全败（除非战力差距极大）
      if (Math.abs(attackerHero.base_attack - defenderHero.base_attack) < 1000) {
        expect(victories).toBeGreaterThan(0);
        expect(defeats).toBeGreaterThan(0);
      }
    });

    test('防御加成应该影响战斗结果', async () => {
      const attackerHero = testHeroes[0];
      const defenderHero = testHeroes[1];

      const normalTile = await saltFieldManager.getTileByType(testMap.mapId, 'COPPER');
      const fortressTile = await saltFieldManager.getTileByType(testMap.mapId, 'FORTRESS');

      const normalBattle = await battleEngine.resolveBattle(attackerHero, defenderHero, normalTile);
      const fortressBattle = await battleEngine.resolveBattle(attackerHero, defenderHero, fortressTile);

      // 在要塞中防守方应该更容易获胜
      expect(fortressBattle.defenderFinalPower).toBeGreaterThan(normalBattle.defenderFinalPower);
    });

    test('战斗经验和积分奖励应该合理', async () => {
      const attackerHero = testHeroes[0];
      const defenderHero = testHeroes[1];
      const goldTile = await saltFieldManager.getTileByType(testMap.mapId, 'GOLD');

      const battleResult = await battleEngine.resolveBattle(attackerHero, defenderHero, goldTile);

      expect(battleResult.experienceGained).toBeGreaterThan(0);
      expect(battleResult.pointsAwarded).toBe(goldTile.pointValue);

      // 高价值据点应该提供更多经验
      expect(battleResult.experienceGained).toBeGreaterThan(goldTile.pointValue * 0.1);
    });

    test('连杀机制应该提供额外奖励', async () => {
      const attackerHero = testHeroes[0];
      const killStreak = 5;

      const baseReward = 100;
      const killStreakReward = battleEngine.calculateKillStreakBonus(baseReward, killStreak);

      expect(killStreakReward).toBeGreaterThan(baseReward);
      expect(killStreakReward / baseReward).toBeGreaterThan(1.5); // 至少50%加成
    });
  });

  describe('排行榜系统', () => {
    test('实时排行榜应该正确更新', async () => {
      // 为多个俱乐部分配不同的积分
      const clubs = testClubs.slice(0, 5);
      const scores = [1000, 800, 600, 400, 200];

      for (let i = 0; i < clubs.length; i++) {
        await saltFieldManager.setClubScore(testMap.mapId, clubs[i].club_id, scores[i]);
      }

      await saltFieldManager.updateRealTimeRankings(testMap.mapId);
      const rankings = await saltFieldManager.getRankings(testMap.mapId);

      expect(rankings.length).toBe(5);

      // 验证排序正确性
      for (let i = 1; i < rankings.length; i++) {
        expect(rankings[i-1].totalPoints).toBeGreaterThanOrEqual(rankings[i].totalPoints);
      }

      expect(rankings[0].clubId).toBe(clubs[0].club_id);
      expect(rankings[0].weeklyRanking).toBe(1);
    });

    test('周排名和赛季排名应该分别维护', async () => {
      const club = testClubs[0];

      await saltFieldManager.setClubScore(testMap.mapId, club.club_id, 1500);
      await saltFieldManager.updateRankings(testMap.mapId);

      const clubData = await saltFieldManager.getClubRankingData(testMap.mapId, club.club_id);

      expect(clubData.weeklyRanking).toBeDefined();
      expect(clubData.seasonRanking).toBeDefined();
      expect(clubData.totalPoints).toBe(1500);
    });

    test('成员贡献应该被正确记录', async () => {
      const club = testClubs[0];
      const memberId = 'test_member_001';
      const contribution = 250;

      await saltFieldManager.recordMemberContribution(
        testMap.mapId,
        club.club_id,
        memberId,
        contribution
      );

      const memberContribution = await saltFieldManager.getMemberContribution(
        testMap.mapId,
        club.club_id,
        memberId
      );

      expect(memberContribution.totalContribution).toBe(contribution);
      expect(memberContribution.contributionRank).toBeDefined();
    });

    test('排行榜应该支持分页查询', async () => {
      // 创建20个俱乐部的积分数据
      for (let i = 0; i < 20; i++) {
        await saltFieldManager.setClubScore(testMap.mapId, testClubs[i].club_id, 1000 - i * 50);
      }

      await saltFieldManager.updateRankings(testMap.mapId);

      const page1 = await saltFieldManager.getRankings(testMap.mapId, 1, 10);
      const page2 = await saltFieldManager.getRankings(testMap.mapId, 2, 10);

      expect(page1.length).toBe(10);
      expect(page2.length).toBe(10);

      // 第一页最后一名的积分应该高于第二页第一名
      expect(page1[9].totalPoints).toBeGreaterThan(page2[0].totalPoints);
    });
  });

  describe('赛季和时间管理', () => {
    test('每周六20:00-21:00应该是活跃时间', async () => {
      const saturday8PM = new Date();
      saturday8PM.setDay(6); // 周六
      saturday8PM.setHours(20, 0, 0, 0);

      const isActiveTime = saltFieldManager.isActiveTime(saturday8PM);

      expect(isActiveTime).toBe(true);
    });

    test('非活跃时间应该暂停战斗', async () => {
      const monday2PM = new Date();
      monday2PM.setDay(1); // 周一
      monday2PM.setHours(14, 0, 0, 0);

      const isActiveTime = saltFieldManager.isActiveTime(monday2PM);

      expect(isActiveTime).toBe(false);

      // 非活跃时间应该不能发起战斗
      const canAttack = await saltFieldManager.canInitiateBattle(testMap.mapId, monday2PM);
      expect(canAttack).toBe(false);
    });

    test('赛季重置应该清空所有数据', async () => {
      const club = testClubs[0];

      // 设置一些数据
      await saltFieldManager.setClubScore(testMap.mapId, club.club_id, 1000);
      await saltFieldManager.occupyTile('test_tile_001', club.club_id);

      // 执行赛季重置
      await saltFieldManager.resetSeason(testMap.mapId);

      // 验证数据被清空
      const clubScore = await saltFieldManager.getClubScore(testMap.mapId, club.club_id);
      expect(clubScore.totalPoints).toBe(0);

      const ownedTiles = await saltFieldManager.getClubTiles(testMap.mapId, club.club_id);
      expect(ownedTiles.filter(t => t.tileType !== 'SPAWN').length).toBe(0); // 只保留出生点
    });
  });

  describe('错误处理和安全验证', () => {
    test('无效的俱乐部ID应该被拒绝', async () => {
      const invalidClubId = 'INVALID_CLUB_ID';
      const targetTile = await saltFieldManager.getTileByType(testMap.mapId, 'COPPER');

      await expect(
        saltFieldManager.attemptOccupation(targetTile.tileId, invalidClubId, 'test_user')
      ).rejects.toThrow('俱乐部不存在');
    });

    test('非法的据点占领应该被阻止', async () => {
      const club = testClubs[0];
      const spawnTile = await saltFieldManager.getClubSpawnTile(testMap.mapId, testClubs[1].club_id);

      // 尝试占领其他俱乐部的出生点
      await expect(
        saltFieldManager.attemptOccupation(spawnTile.tileId, club.club_id, 'test_user')
      ).rejects.toThrow('不能占领出生点');
    });

    test('战斗力作弊检测应该有效', async () => {
      const heroData = testHeroes[0];
      const reportedPower = 999999; // 明显异常的战力值

      const isValid = await battleEngine.validateCombatPower('test_user_001', reportedPower);

      expect(isValid).toBe(false);
    });

    test('操作频率限制应该防止刷分', async () => {
      const userId = 'test_user_002';

      // 快速连续发起多次攻击
      for (let i = 0; i < 15; i++) {
        await saltFieldManager.recordOperation(userId, 'SALTFIELD_ATTACK');
      }

      const canOperate = await saltFieldManager.checkOperationFrequency(userId, 'SALTFIELD_ATTACK');

      expect(canOperate).toBe(false);
    });

    test('地图状态应该有完整性校验', async () => {
      const mapIntegrityCheck = await saltFieldManager.validateMapIntegrity(testMap.mapId);

      expect(mapIntegrityCheck.isValid).toBe(true);
      expect(mapIntegrityCheck.totalTiles).toBe(127);
      expect(mapIntegrityCheck.errors.length).toBe(0);
    });
  });

  describe('性能和并发测试', () => {
    test('500人同时战斗应该保持性能', async () => {
      const concurrentBattles = [];

      // 模拟500个并发战斗
      for (let i = 0; i < 500; i++) {
        const attackerHero = testHeroes[i % testHeroes.length];
        const defenderHero = testHeroes[(i + 1) % testHeroes.length];
        const tile = await saltFieldManager.getTileByType(testMap.mapId, 'COPPER');

        concurrentBattles.push(
          battleEngine.resolveBattle(attackerHero, defenderHero, tile)
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(concurrentBattles);
      const processingTime = Date.now() - startTime;

      expect(results.length).toBe(500);
      expect(processingTime).toBeLessThan(5000); // 5秒内完成500场战斗
    });

    test('地图状态更新应该支持高并发', async () => {
      const updatePromises = [];

      // 模拟100个并发的地图状态更新
      for (let i = 0; i < 100; i++) {
        const clubId = testClubs[i % testClubs.length].club_id;
        const points = Math.floor(Math.random() * 100);

        updatePromises.push(
          saltFieldManager.addClubPoints(testMap.mapId, clubId, points)
        );
      }

      const startTime = Date.now();
      await Promise.all(updatePromises);
      const updateTime = Date.now() - startTime;

      expect(updateTime).toBeLessThan(2000); // 2秒内完成100个更新
    });

    test('实时排行榜更新应该高效', async () => {
      // 为所有20个俱乐部设置积分
      for (let i = 0; i < 20; i++) {
        await saltFieldManager.setClubScore(testMap.mapId, testClubs[i].club_id, Math.random() * 1000);
      }

      const startTime = Date.now();
      await saltFieldManager.updateRealTimeRankings(testMap.mapId);
      const updateTime = Date.now() - startTime;

      expect(updateTime).toBeLessThan(500); // 500ms内完成20个俱乐部的排行榜更新
    });

    test('地图数据缓存应该提升查询性能', async () => {
      // 第一次查询（冷启动）
      const startTime1 = Date.now();
      await saltFieldManager.getMapState(testMap.mapId);
      const coldQueryTime = Date.now() - startTime1;

      // 第二次查询（应该使用缓存）
      const startTime2 = Date.now();
      await saltFieldManager.getMapState(testMap.mapId);
      const cachedQueryTime = Date.now() - startTime2;

      expect(cachedQueryTime).toBeLessThan(coldQueryTime * 0.3); // 缓存应该快70%以上
    });
  });
});