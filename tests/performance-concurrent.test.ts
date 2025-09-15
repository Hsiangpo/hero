/**
 * 性能与并发测试套件
 *
 * 测试覆盖：
 * - 1万用户并发模拟
 * - 盐场500人战斗负载
 * - 内存和CPU使用优化
 * - 数据库查询性能
 * - 缓存系统效率
 * - 网络传输优化
 *
 * 基于规格：docs/backend-architecture-v2.md (第8节)
 * 作者：Guardian (QA_Tester_Agent)
 */

import { LoadTester, ConcurrencyManager, PerformanceMonitor } from '../src/testing/LoadTester';
import { DatabaseManager } from '../src/database/DatabaseManager';
import { CacheManager } from '../src/cache/CacheManager';
import { SaltFieldManager } from '../src/systems/SaltFieldManager';
import { HeroManager } from '../src/systems/HeroManager';
import { RealtimeConnectionManager } from '../src/realtime/RealtimeConnectionManager';

describe('性能与并发测试套件', () => {
  let loadTester: LoadTester;
  let concurrencyManager: ConcurrencyManager;
  let performanceMonitor: PerformanceMonitor;
  let databaseManager: DatabaseManager;
  let cacheManager: CacheManager;
  let saltFieldManager: SaltFieldManager;
  let heroManager: HeroManager;
  let realtimeManager: RealtimeConnectionManager;

  beforeAll(async () => {
    loadTester = new LoadTester();
    concurrencyManager = new ConcurrencyManager();
    performanceMonitor = new PerformanceMonitor();
    databaseManager = new DatabaseManager();
    cacheManager = new CacheManager();
    saltFieldManager = new SaltFieldManager();
    heroManager = new HeroManager();
    realtimeManager = new RealtimeConnectionManager();

    await performanceMonitor.initialize();
    await loadTester.setup();
  });

  afterAll(async () => {
    await loadTester.cleanup();
    await performanceMonitor.generateReport();
  });

  describe('1万用户并发模拟', () => {
    test('系统应该支持1万用户同时在线', async () => {
      const targetUsers = 10000;
      const testDuration = 60000; // 1分钟测试

      const loadTest = await loadTester.simulateConcurrentUsers(targetUsers, {
        duration: testDuration,
        rampUpTime: 30000, // 30秒逐步增加负载
        userBehaviors: [
          { action: 'login', weight: 0.1 },
          { action: 'idle_farming', weight: 0.6 },
          { action: 'hero_management', weight: 0.2 },
          { action: 'saltfield_activity', weight: 0.1 }
        ]
      });

      expect(loadTest.peakConcurrentUsers).toBeGreaterThanOrEqual(9000); // 至少90%成功率
      expect(loadTest.averageResponseTime).toBeLessThan(200); // 平均响应时间<200ms
      expect(loadTest.errorRate).toBeLessThan(0.01); // 错误率<1%
      expect(loadTest.serverStability).toBeGreaterThan(0.95); // 95%稳定性
    });

    test('登录系统应该处理高并发访问', async () => {
      const concurrentLogins = 1000;

      const loginResults = await Promise.all(
        Array.from({ length: concurrentLogins }, (_, i) =>
          loadTester.simulateUserLogin(`test_user_${i}`)
        )
      );

      const successfulLogins = loginResults.filter(result => result.success);
      const failedLogins = loginResults.filter(result => !result.success);

      expect(successfulLogins.length).toBeGreaterThan(950); // 95%成功率
      expect(failedLogins.length).toBeLessThan(50);

      const avgLoginTime = successfulLogins.reduce((sum, result) => sum + result.responseTime, 0) / successfulLogins.length;
      expect(avgLoginTime).toBeLessThan(500); // 平均登录时间<500ms
    });

    test('数据库连接池应该高效管理连接', async () => {
      const connectionPoolStats = await databaseManager.getConnectionPoolStats();

      expect(connectionPoolStats.maxConnections).toBeGreaterThanOrEqual(100);
      expect(connectionPoolStats.activeConnections).toBeLessThanOrEqual(connectionPoolStats.maxConnections);
      expect(connectionPoolStats.connectionUtilization).toBeLessThan(0.8); // 连接使用率<80%

      // 测试连接池在高负载下的表现
      const concurrentQueries = 500;
      const queryPromises = Array.from({ length: concurrentQueries }, () =>
        databaseManager.executeQuery('SELECT 1 as test')
      );

      const startTime = Date.now();
      const results = await Promise.all(queryPromises);
      const totalTime = Date.now() - startTime;

      expect(results.length).toBe(concurrentQueries);
      expect(totalTime).toBeLessThan(5000); // 500个查询在5秒内完成
    });

    test('内存使用应该在合理范围内', async () => {
      const initialMemory = await performanceMonitor.getMemoryUsage();

      // 模拟高负载场景
      await loadTester.simulateHighLoad(5000, 30000);

      const peakMemory = await performanceMonitor.getPeakMemoryUsage();
      const finalMemory = await performanceMonitor.getMemoryUsage();

      expect(peakMemory.heapUsed).toBeLessThan(2 * 1024 * 1024 * 1024); // 小于2GB
      expect(finalMemory.heapUsed).toBeLessThan(initialMemory.heapUsed * 1.5); // 增长不超过50%

      // 检查内存泄漏
      const memoryGrowthRate = (finalMemory.heapUsed - initialMemory.heapUsed) / initialMemory.heapUsed;
      expect(memoryGrowthRate).toBeLessThan(0.2); // 内存增长率<20%
    });

    test('CPU使用率应该保持稳定', async () => {
      const cpuMonitor = await performanceMonitor.startCPUMonitoring();

      await loadTester.simulateHighLoad(8000, 60000);

      const cpuStats = await cpuMonitor.getStats();

      expect(cpuStats.averageUsage).toBeLessThan(0.8); // 平均CPU使用率<80%
      expect(cpuStats.peakUsage).toBeLessThan(0.95); // 峰值CPU使用率<95%
      expect(cpuStats.sustainedHighUsage).toBeLessThan(0.1); // 持续高使用率时间<10%
    });
  });

  describe('盐场500人战斗负载测试', () => {
    test('盐场应该支持500人同时战斗', async () => {
      const mapId = 'test_salt_field_load';
      const participants = 500;

      // 创建测试地图和参与者
      await saltFieldManager.createLoadTestMap(mapId, participants);

      const battleResults = await saltFieldManager.simulateConcurrentBattles(mapId, {
        participantCount: participants,
        battleDuration: 120000, // 2分钟战斗
        attackFrequency: 1000 // 每秒发起攻击
      });

      expect(battleResults.totalBattles).toBeGreaterThan(1000);
      expect(battleResults.averageBattleResolutionTime).toBeLessThan(100); // 战斗解算<100ms
      expect(battleResults.concurrentBattlesPeak).toBeGreaterThan(400);
      expect(battleResults.battleQueueOverflow).toBe(0); // 队列不应溢出
    });

    test('地图状态更新应该实时同步', async () => {
      const mapId = 'test_realtime_sync';
      const observers = 100; // 100个观察者

      await saltFieldManager.createTestMap(mapId);

      // 创建观察者连接
      const connections = await Promise.all(
        Array.from({ length: observers }, (_, i) =>
          realtimeManager.establishConnection(`observer_${i}`, 'SALT_FIELD_ACTIVE')
        )
      );

      // 模拟地图状态变化
      const stateChanges = 50;
      const updatePromises = [];

      for (let i = 0; i < stateChanges; i++) {
        updatePromises.push(
          saltFieldManager.updateTileOwnership(mapId, `tile_${i}`, `club_${i % 20}`)
        );
      }

      const startTime = Date.now();
      await Promise.all(updatePromises);
      const updateTime = Date.now() - startTime;

      expect(updateTime).toBeLessThan(2000); // 50次更新在2秒内完成

      // 验证所有观察者都收到了更新
      const receivedUpdates = await Promise.all(
        connections.map(conn => realtimeManager.getReceivedMessages(conn.id))
      );

      receivedUpdates.forEach(updates => {
        expect(updates.length).toBeGreaterThanOrEqual(stateChanges * 0.95); // 95%的更新被接收
      });
    });

    test('战斗队列应该高效处理', async () => {
      const mapId = 'test_battle_queue';
      const queueCapacity = 1000;

      await saltFieldManager.initializeBattleQueue(mapId, queueCapacity);

      // 快速添加大量战斗请求
      const battleRequests = Array.from({ length: 2000 }, (_, i) => ({
        attackerId: `attacker_${i}`,
        defenderId: `defender_${i % 500}`,
        tileId: `tile_${i % 100}`
      }));

      const startTime = Date.now();
      const queueResults = await saltFieldManager.enqueueBattles(mapId, battleRequests);
      const enqueueTime = Date.now() - startTime;

      expect(queueResults.accepted).toBeGreaterThan(1000);
      expect(queueResults.rejected).toBeLessThan(1000);
      expect(enqueueTime).toBeLessThan(1000); // 1秒内处理完队列操作

      // 处理队列
      const processingStartTime = Date.now();
      const processedBattles = await saltFieldManager.processBattleQueue(mapId);
      const processingTime = Date.now() - processingStartTime;

      expect(processedBattles).toBeGreaterThan(900);
      expect(processingTime).toBeLessThan(5000); // 5秒内处理完队列
    });

    test('积分计算应该高效准确', async () => {
      const mapId = 'test_scoring_performance';
      const clubs = 20;
      const tilesPerClub = 50;

      await saltFieldManager.setupPerformanceTestMap(mapId, clubs, tilesPerClub);

      // 模拟积分计算负载
      const calculationCycles = 60; // 模拟1小时的积分计算

      const startTime = Date.now();
      for (let i = 0; i < calculationCycles; i++) {
        await saltFieldManager.calculateMinutelyPoints(mapId);
      }
      const totalTime = Date.now() - startTime;

      const avgCalculationTime = totalTime / calculationCycles;
      expect(avgCalculationTime).toBeLessThan(100); // 每次计算<100ms

      // 验证积分计算准确性
      const finalScores = await saltFieldManager.getAllClubScores(mapId);
      expect(finalScores.length).toBe(clubs);

      finalScores.forEach(score => {
        expect(score.totalPoints).toBeGreaterThan(0);
        expect(score.pointsPerMinute).toBeGreaterThan(0);
      });
    });
  });

  describe('数据库查询性能优化', () => {
    test('英雄数据查询应该高效', async () => {
      const queryCount = 1000;
      const concurrentQueries = 100;

      const queryPromises = Array.from({ length: concurrentQueries }, () =>
        Promise.all(
          Array.from({ length: queryCount / concurrentQueries }, () =>
            heroManager.getRandomHero()
          )
        )
      );

      const startTime = Date.now();
      const results = await Promise.all(queryPromises);
      const totalTime = Date.now() - startTime;

      const flatResults = results.flat();
      expect(flatResults.length).toBe(queryCount);
      expect(totalTime).toBeLessThan(2000); // 1000次查询在2秒内完成

      const avgQueryTime = totalTime / queryCount;
      expect(avgQueryTime).toBeLessThan(2); // 平均查询时间<2ms
    });

    test('复杂联表查询应该优化', async () => {
      const complexQueries = [
        'getUserWithHeroesAndFormations',
        'getClubWithMembersAndScores',
        'getSaltFieldWithTilesAndOwners',
        'getBattleHistoryWithParticipants'
      ];

      for (const queryType of complexQueries) {
        const startTime = Date.now();
        const result = await databaseManager.executeComplexQuery(queryType, { limit: 100 });
        const queryTime = Date.now() - startTime;

        expect(queryTime).toBeLessThan(200); // 复杂查询<200ms
        expect(result.length).toBeGreaterThan(0);
      }
    });

    test('数据库索引应该有效', async () => {
      const indexedQueries = [
        { table: 'heroes', field: 'hero_id' },
        { table: 'users', field: 'user_id' },
        { table: 'formations', field: 'player_id' },
        { table: 'saltfield_tiles', field: 'current_owner_club' },
        { table: 'battle_history', field: 'timestamp' }
      ];

      for (const query of indexedQueries) {
        const executionPlan = await databaseManager.getQueryExecutionPlan(
          `SELECT * FROM ${query.table} WHERE ${query.field} = ?`
        );

        expect(executionPlan.usesIndex).toBe(true);
        expect(executionPlan.estimatedRows).toBeLessThan(1000);
        expect(executionPlan.cost).toBeLessThan(100);
      }
    });

    test('批量操作应该优化', async () => {
      const batchSize = 1000;

      // 批量插入测试
      const insertData = Array.from({ length: batchSize }, (_, i) => ({
        id: `batch_test_${i}`,
        data: `test_data_${i}`,
        timestamp: Date.now()
      }));

      const insertStartTime = Date.now();
      await databaseManager.batchInsert('test_table', insertData);
      const insertTime = Date.now() - insertStartTime;

      expect(insertTime).toBeLessThan(1000); // 1000条记录在1秒内插入

      // 批量更新测试
      const updateData = insertData.map(item => ({
        ...item,
        data: `updated_${item.data}`
      }));

      const updateStartTime = Date.now();
      await databaseManager.batchUpdate('test_table', updateData);
      const updateTime = Date.now() - updateStartTime;

      expect(updateTime).toBeLessThan(1500); // 1000条记录在1.5秒内更新
    });

    test('连接泄漏检测应该有效', async () => {
      const initialConnections = await databaseManager.getActiveConnectionCount();

      // 执行大量查询
      const queryPromises = Array.from({ length: 500 }, () =>
        databaseManager.executeQuery('SELECT NOW()')
      );

      await Promise.all(queryPromises);

      // 等待连接回收
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalConnections = await databaseManager.getActiveConnectionCount();

      expect(finalConnections).toBeLessThanOrEqual(initialConnections + 5); // 允许少量正常增长
    });
  });

  describe('缓存系统效率测试', () => {
    test('Redis缓存应该提升查询性能', async () => {
      const cacheKey = 'test_performance_hero_data';
      const heroData = await heroManager.getHeroById('E001');

      // 第一次查询（缓存未命中）
      await cacheManager.delete(cacheKey);
      const startTime1 = Date.now();
      const result1 = await cacheManager.getOrSet(cacheKey, () => heroManager.getHeroById('E001'));
      const time1 = Date.now() - startTime1;

      // 第二次查询（缓存命中）
      const startTime2 = Date.now();
      const result2 = await cacheManager.get(cacheKey);
      const time2 = Date.now() - startTime2;

      expect(result2).toEqual(result1);
      expect(time2).toBeLessThan(time1 * 0.1); // 缓存查询应该快90%以上
      expect(time2).toBeLessThan(5); // 缓存查询<5ms
    });

    test('缓存命中率应该保持高水平', async () => {
      const testKeys = Array.from({ length: 100 }, (_, i) => `test_key_${i}`);

      // 预热缓存
      for (const key of testKeys) {
        await cacheManager.set(key, `value_${key}`, 3600);
      }

      // 执行大量查询
      const queryPromises = [];
      for (let i = 0; i < 1000; i++) {
        const randomKey = testKeys[Math.floor(Math.random() * testKeys.length)];
        queryPromises.push(cacheManager.get(randomKey));
      }

      const results = await Promise.all(queryPromises);
      const hits = results.filter(result => result !== null).length;
      const hitRate = hits / results.length;

      expect(hitRate).toBeGreaterThan(0.95); // 命中率>95%
    });

    test('缓存更新应该及时', async () => {
      const cacheKey = 'test_cache_update';
      const originalValue = 'original_value';
      const updatedValue = 'updated_value';

      await cacheManager.set(cacheKey, originalValue);

      // 模拟数据更新
      await cacheManager.set(cacheKey, updatedValue);

      const retrievedValue = await cacheManager.get(cacheKey);
      expect(retrievedValue).toBe(updatedValue);

      // 测试缓存失效传播
      const dependentKeys = [`${cacheKey}_dep1`, `${cacheKey}_dep2`];
      for (const depKey of dependentKeys) {
        await cacheManager.set(depKey, `dependent_on_${cacheKey}`);
      }

      await cacheManager.invalidatePattern(`${cacheKey}*`);

      for (const depKey of dependentKeys) {
        const depValue = await cacheManager.get(depKey);
        expect(depValue).toBeNull();
      }
    });

    test('缓存内存使用应该合理', async () => {
      const initialMemory = await cacheManager.getMemoryUsage();

      // 写入大量数据
      const dataSize = 10000;
      const writePromises = Array.from({ length: dataSize }, (_, i) =>
        cacheManager.set(`bulk_key_${i}`, { id: i, data: 'x'.repeat(1000) }, 3600)
      );

      await Promise.all(writePromises);

      const peakMemory = await cacheManager.getMemoryUsage();
      const memoryIncrease = peakMemory.used - initialMemory.used;

      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 增长<100MB

      // 测试内存回收
      await cacheManager.clear();
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待GC

      const finalMemory = await cacheManager.getMemoryUsage();
      expect(finalMemory.used).toBeLessThan(peakMemory.used * 0.2); // 回收>80%内存
    });

    test('分布式缓存一致性应该保持', async () => {
      const testKey = 'distributed_consistency_test';
      const testValue = { id: 1, timestamp: Date.now() };

      // 在多个缓存节点写入
      await Promise.all([
        cacheManager.setOnNode('node1', testKey, testValue),
        cacheManager.setOnNode('node2', testKey, testValue),
        cacheManager.setOnNode('node3', testKey, testValue)
      ]);

      // 从不同节点读取
      const results = await Promise.all([
        cacheManager.getFromNode('node1', testKey),
        cacheManager.getFromNode('node2', testKey),
        cacheManager.getFromNode('node3', testKey)
      ]);

      // 验证一致性
      expect(results[0]).toEqual(testValue);
      expect(results[1]).toEqual(testValue);
      expect(results[2]).toEqual(testValue);
    });
  });

  describe('网络传输优化测试', () => {
    test('WebSocket连接应该高效管理', async () => {
      const connectionCount = 1000;
      const connections = [];

      // 建立大量WebSocket连接
      const startTime = Date.now();
      for (let i = 0; i < connectionCount; i++) {
        const connection = await realtimeManager.establishConnection(
          `load_test_user_${i}`,
          'IDLE_PLAYER'
        );
        connections.push(connection);
      }
      const connectionTime = Date.now() - startTime;

      expect(connections.length).toBe(connectionCount);
      expect(connectionTime).toBeLessThan(10000); // 10秒内建立1000个连接

      // 测试广播性能
      const broadcastMessage = { type: 'GLOBAL_EVENT', data: 'test_message' };
      const broadcastStartTime = Date.now();
      await realtimeManager.broadcastToAll(broadcastMessage);
      const broadcastTime = Date.now() - broadcastStartTime;

      expect(broadcastTime).toBeLessThan(1000); // 1秒内完成广播

      // 清理连接
      await Promise.all(connections.map(conn => realtimeManager.closeConnection(conn.id)));
    });

    test('消息队列应该处理高吞吐量', async () => {
      const messageCount = 10000;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        type: 'BATTLE_RESULT',
        data: { battleId: `battle_${i}`, result: 'victory' }
      }));

      const startTime = Date.now();
      await realtimeManager.enqueueMessages(messages);
      const enqueueTime = Date.now() - startTime;

      expect(enqueueTime).toBeLessThan(2000); // 2秒内入队1万条消息

      const processingStartTime = Date.now();
      const processedCount = await realtimeManager.processMessageQueue();
      const processingTime = Date.now() - processingStartTime;

      expect(processedCount).toBe(messageCount);
      expect(processingTime).toBeLessThan(5000); // 5秒内处理完队列
    });

    test('数据压缩应该减少传输量', async () => {
      const largData = {
        heroes: Array.from({ length: 100 }, (_, i) => ({
          id: `hero_${i}`,
          name: `Hero ${i}`,
          attributes: { attack: 1000, defense: 800, health: 5000 },
          skills: Array.from({ length: 4 }, (_, j) => ({ id: `skill_${j}`, level: 10 }))
        }))
      };

      const originalSize = JSON.stringify(largData).length;
      const compressedData = await realtimeManager.compressData(largData);
      const compressedSize = compressedData.length;

      const compressionRatio = compressedSize / originalSize;
      expect(compressionRatio).toBeLessThan(0.5); // 压缩率>50%

      // 验证解压缩正确性
      const decompressedData = await realtimeManager.decompressData(compressedData);
      expect(decompressedData).toEqual(largData);
    });

    test('CDN缓存应该加速资源加载', async () => {
      const staticResources = [
        'hero_sprites.png',
        'background_music.mp3',
        'ui_elements.json',
        'game_config.js'
      ];

      for (const resource of staticResources) {
        // 第一次请求（CDN缓存未命中）
        const startTime1 = Date.now();
        const response1 = await loadTester.requestResource(resource);
        const time1 = Date.now() - startTime1;

        expect(response1.status).toBe(200);

        // 第二次请求（CDN缓存命中）
        const startTime2 = Date.now();
        const response2 = await loadTester.requestResource(resource);
        const time2 = Date.now() - startTime2;

        expect(response2.status).toBe(200);
        expect(time2).toBeLessThan(time1 * 0.3); // CDN缓存应该快70%以上
      }
    });
  });

  describe('系统稳定性和恢复能力', () => {
    test('系统应该从部分故障中恢复', async () => {
      // 模拟数据库暂时不可用
      await databaseManager.simulateFailure('connection_timeout', 5000);

      const startTime = Date.now();
      let recovered = false;

      while (Date.now() - startTime < 30000 && !recovered) {
        try {
          await heroManager.getHeroById('E001');
          recovered = true;
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      expect(recovered).toBe(true);
      expect(Date.now() - startTime).toBeLessThan(15000); // 15秒内恢复
    });

    test('系统应该处理内存压力', async () => {
      const initialMemory = await performanceMonitor.getMemoryUsage();

      // 创建内存压力
      const memoryIntensiveTasks = Array.from({ length: 50 }, () =>
        loadTester.createMemoryIntensiveTask(10 * 1024 * 1024) // 10MB per task
      );

      await Promise.all(memoryIntensiveTasks);

      const peakMemory = await performanceMonitor.getMemoryUsage();

      // 触发垃圾回收
      await performanceMonitor.forceGarbageCollection();

      const postGCMemory = await performanceMonitor.getMemoryUsage();

      expect(peakMemory.heapUsed).toBeGreaterThan(initialMemory.heapUsed);
      expect(postGCMemory.heapUsed).toBeLessThan(peakMemory.heapUsed * 0.8); // GC后减少20%以上
    });

    test('系统应该限制异常用户的资源使用', async () => {
      const normalUserId = 'normal_user';
      const abusiveUserId = 'abusive_user';

      // 正常用户行为
      const normalResults = await loadTester.simulateUserBehavior(normalUserId, {
        requestsPerSecond: 2,
        duration: 10000
      });

      // 异常用户行为（高频请求）
      const abusiveResults = await loadTester.simulateUserBehavior(abusiveUserId, {
        requestsPerSecond: 50,
        duration: 10000
      });

      expect(normalResults.successRate).toBeGreaterThan(0.95);
      expect(abusiveResults.successRate).toBeLessThan(0.5); // 异常用户被限制
      expect(abusiveResults.rateLimitedRequests).toBeGreaterThan(0);
    });

    test('系统应该保持数据一致性', async () => {
      const testUserId = 'consistency_test_user';

      // 并发修改用户数据
      const concurrentOperations = [
        heroManager.addGold(testUserId, 1000),
        heroManager.addExperience(testUserId, 'E001', 5000),
        heroManager.levelUpHero(testUserId, 'E001'),
        heroManager.addGold(testUserId, -500),
        heroManager.addExperience(testUserId, 'E001', 3000)
      ];

      await Promise.all(concurrentOperations);

      const finalUserData = await heroManager.getUserData(testUserId);
      const finalHeroData = await heroManager.getHeroData(testUserId, 'E001');

      expect(finalUserData.gold).toBe(500); // 1000 - 500
      expect(finalHeroData.experience).toBe(8000); // 5000 + 3000
      expect(finalHeroData.level).toBeGreaterThanOrEqual(1);
    });
  });

  describe('性能监控和报告', () => {
    test('性能指标应该被持续监控', async () => {
      const monitoringDuration = 30000; // 30秒监控
      await performanceMonitor.startContinuousMonitoring(monitoringDuration);

      // 在监控期间执行各种操作
      await loadTester.simulateMixedWorkload(1000, monitoringDuration);

      const metrics = await performanceMonitor.getMetrics();

      expect(metrics.cpu.samples).toBeGreaterThan(10);
      expect(metrics.memory.samples).toBeGreaterThan(10);
      expect(metrics.network.samples).toBeGreaterThan(10);
      expect(metrics.database.samples).toBeGreaterThan(10);

      expect(metrics.cpu.average).toBeLessThan(0.8);
      expect(metrics.memory.peakUsage).toBeLessThan(2 * 1024 * 1024 * 1024); // <2GB
    });

    test('性能报告应该包含关键信息', async () => {
      const report = await performanceMonitor.generatePerformanceReport();

      expect(report.testSummary).toBeDefined();
      expect(report.systemMetrics).toBeDefined();
      expect(report.bottlenecks).toBeDefined();
      expect(report.recommendations).toBeDefined();

      expect(report.testSummary.totalTests).toBeGreaterThan(0);
      expect(report.testSummary.passedTests).toBeGreaterThan(0);
      expect(report.testSummary.overallScore).toBeGreaterThan(70); // 总分>70分

      if (report.bottlenecks.length > 0) {
        report.bottlenecks.forEach(bottleneck => {
          expect(bottleneck.component).toBeDefined();
          expect(bottleneck.severity).toBeDefined();
          expect(bottleneck.description).toBeDefined();
        });
      }
    });

    test('告警机制应该及时触发', async () => {
      const alertManager = performanceMonitor.getAlertManager();

      // 模拟告警条件
      await performanceMonitor.simulateHighCPUUsage(0.95, 5000); // 95% CPU使用率持续5秒

      const alerts = await alertManager.getTriggeredAlerts();
      const cpuAlert = alerts.find(alert => alert.type === 'HIGH_CPU_USAGE');

      expect(cpuAlert).toBeDefined();
      expect(cpuAlert.severity).toBe('WARNING');
      expect(cpuAlert.timestamp).toBeDefined();
      expect(cpuAlert.details.cpuUsage).toBeGreaterThan(0.9);
    });
  });
});