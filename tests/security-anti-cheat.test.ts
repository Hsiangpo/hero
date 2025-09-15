/**
 * 安全与防作弊系统测试套件
 *
 * 测试覆盖：
 * - 数值篡改检测
 * - 非法技能组合防范
 * - PvP作弊行为模拟
 * - 恶意输入处理
 * - 频率限制机制
 * - 数据完整性验证
 *
 * 基于规格：docs/backend-architecture-v2.md (第9节)
 * 作者：Guardian (QA_Tester_Agent)
 */

import { AntiCheatSystem, SecurityValidator, ThreatLevel } from '../src/security/AntiCheatSystem';
import { DataIntegrityChecker } from '../src/security/DataIntegrityChecker';
import { RateLimiter } from '../src/security/RateLimiter';
import { InputSanitizer } from '../src/security/InputSanitizer';
import { HeroManager, HeroData } from '../src/systems/HeroManager';
import { FormationManager } from '../src/systems/FormationManager';
import { BattleEngine } from '../src/systems/BattleEngine';

describe('安全与防作弊系统测试', () => {
  let antiCheatSystem: AntiCheatSystem;
  let dataIntegrityChecker: DataIntegrityChecker;
  let rateLimiter: RateLimiter;
  let inputSanitizer: InputSanitizer;
  let heroManager: HeroManager;
  let formationManager: FormationManager;
  let battleEngine: BattleEngine;

  beforeEach(async () => {
    antiCheatSystem = new AntiCheatSystem();
    dataIntegrityChecker = new DataIntegrityChecker();
    rateLimiter = new RateLimiter();
    inputSanitizer = new InputSanitizer();
    heroManager = new HeroManager();
    formationManager = new FormationManager();
    battleEngine = new BattleEngine();

    await antiCheatSystem.initialize();
  });

  describe('数值篡改检测', () => {
    test('应该检测异常高的英雄属性', async () => {
      const userId = 'test_user_001';
      const heroData = await heroManager.getHeroById('E001');

      // 模拟客户端报告异常高的战力值
      const reportedPower = 999999999; // 明显异常的数值
      const serverCalculatedPower = await heroManager.calculateCombatPower(heroData, 50);

      const isValid = await antiCheatSystem.validateCombatPower(userId, reportedPower);

      expect(isValid).toBe(false);

      const suspiciousActivity = await antiCheatSystem.getSuspiciousActivity(userId);
      expect(suspiciousActivity.length).toBeGreaterThan(0);

      const powerMismatch = suspiciousActivity.find(activity => activity.type === 'POWER_MISMATCH');
      expect(powerMismatch).toBeDefined();
      expect(powerMismatch.severity).toBe(ThreatLevel.HIGH);
    });

    test('应该允许合理范围内的数值差异', async () => {
      const userId = 'test_user_002';
      const heroData = await heroManager.getHeroById('E001');

      const serverPower = await heroManager.calculateCombatPower(heroData, 50);
      const reportedPower = serverPower * 1.03; // 3%的差异（在允许范围内）

      const isValid = await antiCheatSystem.validateCombatPower(userId, reportedPower);

      expect(isValid).toBe(true);
    });

    test('应该检测英雄等级篡改', async () => {
      const userId = 'test_user_003';
      const heroId = 'E001';

      // 设置英雄实际等级
      await heroManager.setHeroLevel(userId, heroId, 25);

      // 客户端报告不同的等级
      const reportedLevel = 100;

      const validation = await antiCheatSystem.validateHeroLevel(userId, heroId, reportedLevel);

      expect(validation.isValid).toBe(false);
      expect(validation.actualLevel).toBe(25);
      expect(validation.reportedLevel).toBe(100);
      expect(validation.deviation).toBeGreaterThan(0.5);
    });

    test('应该检测金币数量异常', async () => {
      const userId = 'test_user_004';

      // 设置用户实际金币
      await heroManager.setPlayerGold(userId, 10000);

      // 客户端报告异常金币数量
      const reportedGold = 50000000;

      const isValid = await antiCheatSystem.validatePlayerGold(userId, reportedGold);

      expect(isValid).toBe(false);

      const violation = await antiCheatSystem.getLatestViolation(userId);
      expect(violation.type).toBe('CURRENCY_MANIPULATION');
      expect(violation.evidence.reportedGold).toBe(reportedGold);
      expect(violation.evidence.actualGold).toBe(10000);
    });

    test('应该检测经验值异常增长', async () => {
      const userId = 'test_user_005';
      const heroId = 'E001';

      // 记录基础经验值
      const baseExp = 1000;
      await heroManager.setHeroExperience(userId, heroId, baseExp);

      // 模拟5分钟后的异常经验增长
      const reportedExp = 100000; // 异常增长
      const timeElapsed = 5 * 60 * 1000; // 5分钟

      const validation = await antiCheatSystem.validateExperienceGain(
        userId,
        heroId,
        baseExp,
        reportedExp,
        timeElapsed
      );

      expect(validation.isValid).toBe(false);
      expect(validation.suspectedSpeedHack).toBe(true);
    });
  });

  describe('非法技能组合防范', () => {
    test('应该阻止不存在的技能组合', async () => {
      const userId = 'test_user_006';
      const invalidSkillCombo = {
        skill1: 'FAKE_SKILL_001',
        skill2: 'FAKE_SKILL_002',
        comboName: 'FAKE_COMBO'
      };

      const validation = await antiCheatSystem.validateSkillCombo(userId, invalidSkillCombo);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('技能不存在');
    });

    test('应该阻止不兼容英雄的技能组合', async () => {
      const userId = 'test_user_007';

      // 尝试用火摆烂的技能和水摆烂的技能组合（假设不兼容）
      const fireHeroSkill = await heroManager.getSkillByType('E001', 'Active');
      const waterHeroSkill = await heroManager.getSkillByType('E002', 'Active');

      const invalidCombo = {
        skills: [fireHeroSkill.skill_id, waterHeroSkill.skill_id],
        reportedComboName: '自定义组合'
      };

      const validation = await antiCheatSystem.validateSkillCombo(userId, invalidCombo);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('技能不兼容');
    });

    test('应该检测冷却时间操纵', async () => {
      const userId = 'test_user_008';
      const skillId = 'SKILL_001';

      // 设置技能冷却时间
      await heroManager.setSkillCooldown(userId, skillId, 10000); // 10秒冷却

      // 客户端尝试在冷却期内使用技能
      const canUse = await antiCheatSystem.validateSkillUsage(userId, skillId);

      expect(canUse).toBe(false);

      const violation = await antiCheatSystem.getLatestViolation(userId);
      expect(violation.type).toBe('COOLDOWN_MANIPULATION');
    });

    test('应该验证技能释放消耗', async () => {
      const userId = 'test_user_009';
      const heroId = 'E001';
      const skillId = 'SKILL_FIREBALL';

      // 设置英雄能量不足
      await heroManager.setHeroEnergy(userId, heroId, 10);

      const skill = await heroManager.getSkillData(skillId);
      skill.energy_cost = 50; // 技能需要50能量

      const validation = await antiCheatSystem.validateSkillCast(userId, heroId, skillId);

      expect(validation.canCast).toBe(false);
      expect(validation.reason).toContain('能量不足');
    });

    test('应该检测技能伤害篡改', async () => {
      const userId = 'test_user_010';
      const skillId = 'SKILL_FIREBALL';
      const targetId = 'enemy_001';

      const reportedDamage = 50000; // 客户端报告的伤害
      const calculatedDamage = await battleEngine.calculateSkillDamage(userId, skillId, targetId);

      const validation = await antiCheatSystem.validateDamageDealt(
        userId,
        skillId,
        targetId,
        reportedDamage,
        calculatedDamage
      );

      if (Math.abs(reportedDamage - calculatedDamage) / calculatedDamage > 0.1) {
        expect(validation.isValid).toBe(false);
        expect(validation.suspectedDamageHack).toBe(true);
      }
    });
  });

  describe('PvP作弊行为检测', () => {
    test('应该检测异常快速的连续胜利', async () => {
      const userId = 'test_user_011';

      // 模拟在短时间内连续获得大量胜利
      const wins = [];
      const currentTime = Date.now();

      for (let i = 0; i < 20; i++) {
        wins.push({
          timestamp: currentTime + i * 1000, // 每秒一场胜利
          opponent: `opponent_${i}`,
          duration: 500 // 每场战斗只持续0.5秒
        });
      }

      await antiCheatSystem.recordBattleResults(userId, wins);

      const analysis = await antiCheatSystem.analyzeBattlePattern(userId);

      expect(analysis.suspicious).toBe(true);
      expect(analysis.flags).toContain('RAPID_CONSECUTIVE_WINS');
      expect(analysis.flags).toContain('UNUSUALLY_SHORT_BATTLES');
    });

    test('应该检测不可能的胜率', async () => {
      const userId = 'test_user_012';

      // 模拟100%胜率且对手战力更高的情况
      const battleHistory = [];
      for (let i = 0; i < 50; i++) {
        battleHistory.push({
          result: 'victory',
          playerPower: 1000,
          opponentPower: 2000, // 对手战力更高
          timestamp: Date.now() - i * 60000
        });
      }

      await antiCheatSystem.recordExtendedBattleHistory(userId, battleHistory);

      const suspiciousPattern = await antiCheatSystem.detectImpossibleWinRate(userId);

      expect(suspiciousPattern.detected).toBe(true);
      expect(suspiciousPattern.winRate).toBe(1.0);
      expect(suspiciousPattern.averagePowerDisadvantage).toBeGreaterThan(0.5);
    });

    test('应该检测位置瞬移作弊', async () => {
      const userId = 'test_user_013';

      // 记录玩家位置历史
      const positions = [
        { x: 0, y: 0, timestamp: Date.now() },
        { x: 100, y: 100, timestamp: Date.now() + 1000 }, // 1秒后移动到很远的位置
        { x: 0, y: 0, timestamp: Date.now() + 2000 }  // 又瞬移回原点
      ];

      await antiCheatSystem.recordPositionHistory(userId, positions);

      const teleportDetection = await antiCheatSystem.detectTeleportation(userId);

      expect(teleportDetection.detected).toBe(true);
      expect(teleportDetection.impossibleMovements.length).toBeGreaterThan(0);
    });

    test('应该检测自动化战斗脚本', async () => {
      const userId = 'test_user_014';

      // 模拟完全规律的操作模式
      const actions = [];
      const baseTime = Date.now();

      for (let i = 0; i < 100; i++) {
        actions.push({
          type: 'ATTACK',
          timestamp: baseTime + i * 2000, // 完全固定的2秒间隔
          coordinates: { x: 100, y: 200 }, // 完全相同的点击位置
          duration: 50 // 完全相同的点击持续时间
        });
      }

      await antiCheatSystem.recordPlayerActions(userId, actions);

      const botDetection = await antiCheatSystem.detectBotBehavior(userId);

      expect(botDetection.isBotLikely).toBe(true);
      expect(botDetection.confidence).toBeGreaterThan(0.8);
      expect(botDetection.patterns).toContain('PERFECTLY_REGULAR_TIMING');
      expect(botDetection.patterns).toContain('IDENTICAL_CLICK_POSITIONS');
    });

    test('应该检测资源非法获取', async () => {
      const userId = 'test_user_015';

      // 记录玩家基础资源状态
      await heroManager.setPlayerResources(userId, {
        gold: 1000,
        gems: 50,
        energy: 100
      });

      // 模拟异常的资源增长（没有对应的游戏行为）
      const reportedResources = {
        gold: 100000,
        gems: 5000,
        energy: 100
      };

      const validation = await antiCheatSystem.validateResourceGain(userId, reportedResources);

      expect(validation.isValid).toBe(false);
      expect(validation.suspiciousResources).toContain('gold');
      expect(validation.suspiciousResources).toContain('gems');
    });
  });

  describe('输入验证与注入防护', () => {
    test('应该防止SQL注入攻击', async () => {
      const maliciousInputs = [
        "'; DROP TABLE heroes; --",
        "' OR 1=1 --",
        "'; UPDATE heroes SET level=999 WHERE id='E001'; --",
        "' UNION SELECT * FROM users --"
      ];

      for (const input of maliciousInputs) {
        const sanitized = inputSanitizer.sanitizeSQL(input);
        expect(sanitized).not.toContain('DROP');
        expect(sanitized).not.toContain('UPDATE');
        expect(sanitized).not.toContain('UNION');
        expect(sanitized).not.toContain('--');

        const isSafe = inputSanitizer.isSecureInput(input);
        expect(isSafe).toBe(false);
      }
    });

    test('应该防止XSS攻击', async () => {
      const xssInputs = [
        '<script>alert("hack")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("xss")',
        '<iframe src="malicious.com"></iframe>'
      ];

      for (const input of xssInputs) {
        const sanitized = inputSanitizer.sanitizeHTML(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('<iframe>');
      }
    });

    test('应该验证用户名格式', async () => {
      const validUsernames = ['Player123', 'Hero_Master', 'Gaming-Pro'];
      const invalidUsernames = [
        '', // 空字符串
        'a', // 太短
        'a'.repeat(100), // 太长
        '<script>hack</script>', // 包含脚本
        'Player@#$%^', // 特殊字符
        '../../../../etc/passwd' // 路径遍历
      ];

      for (const username of validUsernames) {
        const isValid = inputSanitizer.validateUsername(username);
        expect(isValid).toBe(true);
      }

      for (const username of invalidUsernames) {
        const isValid = inputSanitizer.validateUsername(username);
        expect(isValid).toBe(false);
      }
    });

    test('应该限制请求大小', async () => {
      const normalRequest = JSON.stringify({ action: 'levelUp', heroId: 'E001' });
      const oversizedRequest = 'x'.repeat(10 * 1024 * 1024); // 10MB的请求

      expect(inputSanitizer.validateRequestSize(normalRequest)).toBe(true);
      expect(inputSanitizer.validateRequestSize(oversizedRequest)).toBe(false);
    });

    test('应该验证JSON结构', async () => {
      const validJSON = { heroId: 'E001', action: 'upgrade', level: 5 };
      const invalidJSONs = [
        { heroId: null }, // 缺少必要字段
        { heroId: 'E001', level: -1 }, // 负数等级
        { heroId: 'E001', level: 'invalid' }, // 错误类型
        JSON.parse('{"a":'.repeat(1000) + '1' + '}'.repeat(1000)) // 深度嵌套
      ];

      expect(inputSanitizer.validateJSONStructure(validJSON, 'heroAction')).toBe(true);

      for (const invalidJSON of invalidJSONs) {
        expect(inputSanitizer.validateJSONStructure(invalidJSON, 'heroAction')).toBe(false);
      }
    });
  });

  describe('频率限制机制', () => {
    test('应该限制API调用频率', async () => {
      const userId = 'test_user_016';
      const endpoint = '/api/v1/heroes/levelup';

      // 快速连续调用
      let blockedCount = 0;
      for (let i = 0; i < 15; i++) {
        const allowed = await rateLimiter.checkRate(userId, endpoint);
        if (!allowed) {
          blockedCount++;
        }
      }

      expect(blockedCount).toBeGreaterThan(5); // 应该有部分请求被阻止
    });

    test('应该限制盐场攻击频率', async () => {
      const userId = 'test_user_017';
      const operation = 'SALTFIELD_ATTACK';

      // 模拟快速连续攻击
      let successfulAttacks = 0;
      let blockedAttacks = 0;

      for (let i = 0; i < 20; i++) {
        const allowed = await rateLimiter.checkOperationFrequency(userId, operation);
        if (allowed) {
          successfulAttacks++;
          await rateLimiter.recordOperation(userId, operation);
        } else {
          blockedAttacks++;
        }
      }

      expect(successfulAttacks).toBeLessThanOrEqual(10); // 每分钟最多10次攻击
      expect(blockedAttacks).toBeGreaterThan(5);
    });

    test('应该限制盐罐访问频率', async () => {
      const userId = 'test_user_018';
      const operation = 'LOBBY_VISIT';

      let successfulVisits = 0;
      let blockedVisits = 0;

      for (let i = 0; i < 30; i++) {
        const allowed = await rateLimiter.checkOperationFrequency(userId, operation);
        if (allowed) {
          successfulVisits++;
          await rateLimiter.recordOperation(userId, operation);
        } else {
          blockedVisits++;
        }
      }

      expect(successfulVisits).toBeLessThanOrEqual(20); // 每分钟最多20次访问
      expect(blockedVisits).toBeGreaterThan(5);
    });

    test('冷却期应该自动重置', async () => {
      const userId = 'test_user_019';
      const operation = 'SALTFIELD_ATTACK';

      // 触发频率限制
      for (let i = 0; i < 15; i++) {
        await rateLimiter.recordOperation(userId, operation);
      }

      expect(await rateLimiter.checkOperationFrequency(userId, operation)).toBe(false);

      // 模拟时间过去（1分钟后）
      await rateLimiter.simulateTimeElapse(60000);

      // 应该重新允许操作
      expect(await rateLimiter.checkOperationFrequency(userId, operation)).toBe(true);
    });
  });

  describe('数据完整性验证', () => {
    test('应该验证游戏存档完整性', async () => {
      const userId = 'test_user_020';

      const gameData = {
        heroes: [
          { id: 'E001', level: 25, experience: 10000 },
          { id: 'J001', level: 30, experience: 15000 }
        ],
        resources: { gold: 50000, gems: 200 },
        progress: { currentStage: 15, maxStage: 15 }
      };

      const checksum = await dataIntegrityChecker.calculateChecksum(gameData);

      // 保存数据和校验和
      await dataIntegrityChecker.saveDataWithIntegrity(userId, gameData, checksum);

      // 验证数据完整性
      const verification = await dataIntegrityChecker.verifyDataIntegrity(userId);
      expect(verification.isValid).toBe(true);
    });

    test('应该检测数据篡改', async () => {
      const userId = 'test_user_021';

      const originalData = {
        heroes: [{ id: 'E001', level: 25 }],
        resources: { gold: 1000 }
      };

      const checksum = await dataIntegrityChecker.calculateChecksum(originalData);
      await dataIntegrityChecker.saveDataWithIntegrity(userId, originalData, checksum);

      // 模拟数据被篡改
      const tamperedData = {
        heroes: [{ id: 'E001', level: 99 }], // 等级被修改
        resources: { gold: 999999 } // 金币被修改
      };

      await dataIntegrityChecker.updateStoredData(userId, tamperedData);

      const verification = await dataIntegrityChecker.verifyDataIntegrity(userId);
      expect(verification.isValid).toBe(false);
      expect(verification.tamperedFields).toContain('heroes.level');
      expect(verification.tamperedFields).toContain('resources.gold');
    });

    test('应该验证编队配置的合法性', async () => {
      const userId = 'test_user_022';

      const invalidFormations = [
        {
          heroes: ['E001', 'E001', 'E002'], // 重复英雄
          reason: 'DUPLICATE_HEROES'
        },
        {
          heroes: ['INVALID_HERO', 'E001'], // 不存在的英雄
          reason: 'INVALID_HERO_ID'
        },
        {
          heroes: ['E001'], // 英雄数量不足
          reason: 'INSUFFICIENT_HEROES'
        },
        {
          heroes: ['E001', 'E002', 'E003', 'E004', 'E005', 'E006'], // 英雄数量过多
          reason: 'TOO_MANY_HEROES'
        }
      ];

      for (const formation of invalidFormations) {
        const validation = await dataIntegrityChecker.validateFormation(userId, formation.heroes);
        expect(validation.isValid).toBe(false);
        expect(validation.violations).toContain(formation.reason);
      }
    });

    test('应该检测时间戳异常', async () => {
      const userId = 'test_user_023';

      const suspiciousTimestamps = [
        Date.now() + 86400000, // 未来的时间戳
        Date.now() - 365 * 24 * 60 * 60 * 1000, // 一年前的时间戳
        0, // 无效时间戳
        -1 // 负数时间戳
      ];

      for (const timestamp of suspiciousTimestamps) {
        const isValid = dataIntegrityChecker.validateTimestamp(timestamp);
        expect(isValid).toBe(false);
      }

      const validTimestamp = Date.now();
      expect(dataIntegrityChecker.validateTimestamp(validTimestamp)).toBe(true);
    });
  });

  describe('威胁响应机制', () => {
    test('应该对高风险用户进行临时封禁', async () => {
      const userId = 'test_user_024';

      // 累积多个严重违规
      await antiCheatSystem.recordViolation(userId, 'POWER_MANIPULATION', ThreatLevel.HIGH);
      await antiCheatSystem.recordViolation(userId, 'CURRENCY_HACK', ThreatLevel.HIGH);
      await antiCheatSystem.recordViolation(userId, 'SPEED_HACK', ThreatLevel.HIGH);

      const threatAssessment = await antiCheatSystem.assessThreatLevel(userId);

      expect(threatAssessment.level).toBe(ThreatLevel.CRITICAL);
      expect(threatAssessment.actionRequired).toBe('TEMPORARY_BAN');

      const banStatus = await antiCheatSystem.getBanStatus(userId);
      expect(banStatus.isBanned).toBe(true);
      expect(banStatus.banDuration).toBeGreaterThan(0);
    });

    test('应该记录详细的违规日志', async () => {
      const userId = 'test_user_025';

      await antiCheatSystem.recordViolation(userId, 'IMPOSSIBLE_WIN_RATE', ThreatLevel.MEDIUM, {
        winRate: 1.0,
        battlesAnalyzed: 100,
        averagePowerDisadvantage: 0.6
      });

      const violationLog = await antiCheatSystem.getViolationHistory(userId);

      expect(violationLog.length).toBeGreaterThan(0);

      const latestViolation = violationLog[0];
      expect(latestViolation.type).toBe('IMPOSSIBLE_WIN_RATE');
      expect(latestViolation.threatLevel).toBe(ThreatLevel.MEDIUM);
      expect(latestViolation.evidence).toBeDefined();
      expect(latestViolation.timestamp).toBeDefined();
    });

    test('应该支持误封申诉流程', async () => {
      const userId = 'test_user_026';

      // 用户被误封
      await antiCheatSystem.banUser(userId, 'SUSPECTED_BOT', 3600000); // 1小时封禁

      // 用户提交申诉
      const appeal = {
        userId,
        reason: '正常游戏行为被误判',
        evidence: '游戏录像文件',
        contactInfo: 'user@example.com'
      };

      const appealId = await antiCheatSystem.submitAppeal(appeal);
      expect(appealId).toBeDefined();

      // 管理员处理申诉
      const appealResult = await antiCheatSystem.processAppeal(appealId, true, '经核实为误判');

      expect(appealResult.approved).toBe(true);

      const banStatus = await antiCheatSystem.getBanStatus(userId);
      expect(banStatus.isBanned).toBe(false);
    });

    test('应该实时监控异常模式', async () => {
      const userId = 'test_user_027';

      // 模拟异常行为模式
      const suspiciousPattern = {
        rapidLevelGains: true,
        perfectBattleRecord: true,
        identicalTimingPatterns: true,
        impossibleResourceGains: true
      };

      await antiCheatSystem.analyzePlayerBehavior(userId, suspiciousPattern);

      const riskScore = await antiCheatSystem.calculateRiskScore(userId);

      expect(riskScore).toBeGreaterThan(0.8); // 高风险分数
      expect(riskScore).toBeLessThanOrEqual(1.0);

      const monitoringStatus = await antiCheatSystem.getMonitoringStatus(userId);
      expect(monitoringStatus.level).toBe('HIGH_WATCH');
    });
  });

  describe('性能和误报率验证', () => {
    test('安全检查不应该显著影响游戏性能', async () => {
      const userId = 'test_user_028';
      const heroData = await heroManager.getHeroById('E001');

      const operations = 100;
      const startTime = Date.now();

      for (let i = 0; i < operations; i++) {
        const reportedPower = await heroManager.calculateCombatPower(heroData, 50);
        await antiCheatSystem.validateCombatPower(userId, reportedPower);
      }

      const totalTime = Date.now() - startTime;
      const avgTimePerCheck = totalTime / operations;

      expect(avgTimePerCheck).toBeLessThan(10); // 每次检查不超过10ms
    });

    test('正常玩家行为不应该触发误报', async () => {
      const userId = 'test_user_029';

      // 模拟正常的游戏行为
      const normalBehavior = {
        battleWinRate: 0.65, // 65%胜率（合理）
        levelUpFrequency: 'moderate',
        resourceGainRate: 'normal',
        actionTiming: 'human-like'
      };

      await antiCheatSystem.analyzePlayerBehavior(userId, normalBehavior);

      const riskScore = await antiCheatSystem.calculateRiskScore(userId);
      expect(riskScore).toBeLessThan(0.3); // 低风险分数

      const violations = await antiCheatSystem.getViolationHistory(userId);
      expect(violations.length).toBe(0);
    });

    test('系统应该适应不同技能水平的玩家', async () => {
      const beginnerUser = 'beginner_001';
      const expertUser = 'expert_001';

      // 新手玩家：低胜率，慢速度
      await antiCheatSystem.setPlayerProfile(beginnerUser, {
        skillLevel: 'BEGINNER',
        expectedWinRate: 0.3,
        expectedAPM: 20 // 每分钟20个操作
      });

      // 专家玩家：高胜率，快速度
      await antiCheatSystem.setPlayerProfile(expertUser, {
        skillLevel: 'EXPERT',
        expectedWinRate: 0.8,
        expectedAPM: 200 // 每分钟200个操作
      });

      // 相同的行为数据，应该产生不同的风险评估
      const behaviorData = { winRate: 0.75, apm: 180 };

      const beginnerRisk = await antiCheatSystem.assessBehaviorRisk(beginnerUser, behaviorData);
      const expertRisk = await antiCheatSystem.assessBehaviorRisk(expertUser, behaviorData);

      expect(beginnerRisk).toBeGreaterThan(expertRisk); // 新手展现专家行为应该更可疑
    });

    test('机器学习模型应该持续优化', async () => {
      // 提供训练数据
      const trainingData = [
        { userId: 'cheater_001', behavior: 'abnormal', label: 'cheater' },
        { userId: 'normal_001', behavior: 'normal', label: 'legitimate' },
        { userId: 'cheater_002', behavior: 'abnormal', label: 'cheater' },
        { userId: 'normal_002', behavior: 'normal', label: 'legitimate' }
      ];

      await antiCheatSystem.trainModel(trainingData);

      const modelAccuracy = await antiCheatSystem.getModelAccuracy();
      expect(modelAccuracy).toBeGreaterThan(0.85); // 至少85%准确率

      const modelVersion = await antiCheatSystem.getModelVersion();
      expect(modelVersion).toBeDefined();
    });
  });
});