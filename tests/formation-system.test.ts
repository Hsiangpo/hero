/**
 * 5英雄编队战斗系统测试套件
 *
 * 测试覆盖：
 * - 5英雄编队机制（前排3+后排2）
 * - 位置权重与角色职责
 * - 编队战力计算
 * - 出手顺序逻辑
 * - 编队配置管理
 *
 * 基于规格：specs/hero-system-advanced.md (2.2节)
 * 作者：Guardian (QA_Tester_Agent)
 */

import { FormationManager, Formation, FormationPosition, BattleOrder } from '../src/systems/FormationManager';
import { HeroManager, Hero, HeroData } from '../src/systems/HeroManager';
import { BattleEngine, BattleResult } from '../src/systems/BattleEngine';

describe('5英雄编队战斗系统测试', () => {
  let formationManager: FormationManager;
  let heroManager: HeroManager;
  let battleEngine: BattleEngine;
  let testHeroes: HeroData[];

  beforeEach(async () => {
    formationManager = new FormationManager();
    heroManager = new HeroManager();
    battleEngine = new BattleEngine();

    // 准备测试用的5个英雄
    testHeroes = [
      await heroManager.getHeroById('E001'), // 火摆烂 - 前排输出
      await heroManager.getHeroById('E002'), // 水摆烂 - 前排治疗
      await heroManager.getHeroById('E003'), // 风摆烂 - 前排敏捷
      await heroManager.getHeroById('J001'), // 程序员摆烂 - 后排输出
      await heroManager.getHeroById('L001')  // 吃货摆烂 - 后排辅助
    ];
  });

  describe('编队位置配置测试', () => {
    test('应该支持5个位置的完整配置', async () => {
      const formation = await formationManager.createFormation('test_player_001');

      // 配置前排3个位置
      await formationManager.setPosition(formation.formation_id, FormationPosition.FRONT_1, testHeroes[0].hero_id);
      await formationManager.setPosition(formation.formation_id, FormationPosition.FRONT_2, testHeroes[1].hero_id);
      await formationManager.setPosition(formation.formation_id, FormationPosition.FRONT_3, testHeroes[2].hero_id);

      // 配置后排2个位置
      await formationManager.setPosition(formation.formation_id, FormationPosition.BACK_1, testHeroes[3].hero_id);
      await formationManager.setPosition(formation.formation_id, FormationPosition.BACK_2, testHeroes[4].hero_id);

      const configuredFormation = await formationManager.getFormation(formation.formation_id);

      expect(configuredFormation.front_position_1).toBe(testHeroes[0].hero_id);
      expect(configuredFormation.front_position_2).toBe(testHeroes[1].hero_id);
      expect(configuredFormation.front_position_3).toBe(testHeroes[2].hero_id);
      expect(configuredFormation.back_position_1).toBe(testHeroes[3].hero_id);
      expect(configuredFormation.back_position_2).toBe(testHeroes[4].hero_id);
    });

    test('应该拒绝同一英雄重复上阵', async () => {
      const formation = await formationManager.createFormation('test_player_002');

      await formationManager.setPosition(formation.formation_id, FormationPosition.FRONT_1, testHeroes[0].hero_id);

      // 尝试将同一英雄放入不同位置
      await expect(
        formationManager.setPosition(formation.formation_id, FormationPosition.FRONT_2, testHeroes[0].hero_id)
      ).rejects.toThrow('同一英雄不能重复上阵');
    });

    test('应该支持英雄位置互换', async () => {
      const formation = await formationManager.createFormation('test_player_003');

      await formationManager.setPosition(formation.formation_id, FormationPosition.FRONT_1, testHeroes[0].hero_id);
      await formationManager.setPosition(formation.formation_id, FormationPosition.FRONT_2, testHeroes[1].hero_id);

      // 交换两个英雄的位置
      await formationManager.swapPositions(
        formation.formation_id,
        FormationPosition.FRONT_1,
        FormationPosition.FRONT_2
      );

      const updatedFormation = await formationManager.getFormation(formation.formation_id);
      expect(updatedFormation.front_position_1).toBe(testHeroes[1].hero_id);
      expect(updatedFormation.front_position_2).toBe(testHeroes[0].hero_id);
    });

    test('空位置应该有明确的添加提示', async () => {
      const formation = await formationManager.createFormation('test_player_004');

      const emptyPositions = await formationManager.getEmptyPositions(formation.formation_id);
      expect(emptyPositions.length).toBe(5);

      emptyPositions.forEach(position => {
        const hint = formationManager.getPositionHint(position);
        expect(hint).toBeDefined();
        expect(hint.recommendedTypes).toBeDefined();
        expect(hint.description).toMatch(/添加英雄|选择角色/);
      });
    });
  });

  describe('位置权重与职责分配', () => {
    test('前排英雄应该承受更多伤害', async () => {
      const formation = await formationManager.createFormation('test_player_005');
      await formationManager.setFullFormation(formation.formation_id, testHeroes);

      const positionWeights = await formationManager.getPositionWeights(formation.formation_id);

      // 前排位置应该有更高的承伤权重
      expect(positionWeights.front_damage_absorption).toBeGreaterThan(positionWeights.back_damage_absorption);

      // 具体数值验证：前排+30%承伤，-10%输出
      expect(positionWeights.front_damage_taken_multiplier).toBe(1.3);
      expect(positionWeights.front_damage_dealt_multiplier).toBe(0.9);
    });

    test('后排英雄应该受到保护并有输出加成', async () => {
      const formation = await formationManager.createFormation('test_player_006');
      await formationManager.setFullFormation(formation.formation_id, testHeroes);

      const positionWeights = await formationManager.getPositionWeights(formation.formation_id);

      // 后排：-50%承伤，+20%输出
      expect(positionWeights.back_damage_taken_multiplier).toBe(0.5);
      expect(positionWeights.back_damage_dealt_multiplier).toBe(1.2);
    });

    test('位置推荐系统应该提供合理建议', async () => {
      const tankHero = await heroManager.getHeroById('E007'); // 土摆烂 - 高防御
      const damageHero = await heroManager.getHeroById('E001'); // 火摆烂 - 高攻击
      const healerHero = await heroManager.getHeroById('L001'); // 吃货摆烂 - 治疗

      const tankRecommendation = await formationManager.getPositionRecommendation(tankHero);
      const damageRecommendation = await formationManager.getPositionRecommendation(damageHero);
      const healerRecommendation = await formationManager.getPositionRecommendation(healerHero);

      expect(tankRecommendation.preferredPositions).toContain(FormationPosition.FRONT_2); // 中央坦克
      expect(damageRecommendation.preferredPositions).toContain(FormationPosition.FRONT_1); // 前排输出
      expect(healerRecommendation.preferredPositions).toContain(FormationPosition.BACK_1); // 后排治疗
    });
  });

  describe('战斗出手顺序计算', () => {
    test('敏捷度应该决定出手顺序', async () => {
      const formation = await formationManager.createFormation('test_player_007');
      await formationManager.setFullFormation(formation.formation_id, testHeroes);

      const battleOrder = await battleEngine.calculateBattleOrder(formation.formation_id);

      // 获取每个英雄的敏捷度
      const heroAgilityMap = new Map();
      for (const hero of testHeroes) {
        const stats = await heroManager.getHeroStats(hero, 50);
        heroAgilityMap.set(hero.hero_id, stats.agility);
      }

      // 验证出手顺序按敏捷度降序排列
      for (let i = 1; i < battleOrder.length; i++) {
        const currentHeroAgility = heroAgilityMap.get(battleOrder[i].hero_id);
        const previousHeroAgility = heroAgilityMap.get(battleOrder[i-1].hero_id);
        expect(currentHeroAgility).toBeLessThanOrEqual(previousHeroAgility);
      }
    });

    test('相同敏捷度时应该有确定性的排序规则', async () => {
      // 创建两个相同敏捷度的英雄进行测试
      const hero1 = { ...testHeroes[0], base_agility: 100 };
      const hero2 = { ...testHeroes[1], base_agility: 100 };

      const formation = await formationManager.createFormation('test_player_008');
      await formationManager.setPosition(formation.formation_id, FormationPosition.FRONT_1, hero1.hero_id);
      await formationManager.setPosition(formation.formation_id, FormationPosition.FRONT_2, hero2.hero_id);

      const battleOrder1 = await battleEngine.calculateBattleOrder(formation.formation_id);
      const battleOrder2 = await battleEngine.calculateBattleOrder(formation.formation_id);

      // 多次计算应该得到相同的结果
      expect(battleOrder1.map(h => h.hero_id)).toEqual(battleOrder2.map(h => h.hero_id));
    });

    test('位置权重不应该影响出手顺序', async () => {
      const fastHero = await heroManager.getHeroById('E003'); // 风摆烂 - 高敏捷
      const slowHero = await heroManager.getHeroById('E007'); // 土摆烂 - 低敏捷

      const formation = await formationManager.createFormation('test_player_009');

      // 将快速英雄放在后排，慢速英雄放在前排
      await formationManager.setPosition(formation.formation_id, FormationPosition.FRONT_1, slowHero.hero_id);
      await formationManager.setPosition(formation.formation_id, FormationPosition.BACK_1, fastHero.hero_id);

      const battleOrder = await battleEngine.calculateBattleOrder(formation.formation_id);

      // 后排的快速英雄应该仍然先出手
      expect(battleOrder[0].hero_id).toBe(fastHero.hero_id);
    });
  });

  describe('编队战力计算', () => {
    test('总战力应该正确计算', async () => {
      const formation = await formationManager.createFormation('test_player_010');
      await formationManager.setFullFormation(formation.formation_id, testHeroes);

      const totalPower = await formationManager.calculateTotalPower(formation.formation_id);

      // 手动计算期望战力
      let expectedPower = 0;
      for (const hero of testHeroes) {
        const heroPower = await heroManager.calculateCombatPower(hero, 50);
        expectedPower += heroPower;
      }

      // 允许5%的计算误差
      expect(Math.abs(totalPower - expectedPower) / expectedPower).toBeLessThan(0.05);
    });

    test('位置权重应该影响战力计算', async () => {
      const formation = await formationManager.createFormation('test_player_011');
      await formationManager.setFullFormation(formation.formation_id, testHeroes);

      const adjustedPower = await formationManager.calculateAdjustedPower(formation.formation_id);
      const basePower = await formationManager.calculateBasePower(formation.formation_id);

      // 位置权重调整后的战力应该与基础战力不同
      expect(adjustedPower).not.toBe(basePower);

      // 但差距不应该太大（±30%以内）
      const difference = Math.abs(adjustedPower - basePower) / basePower;
      expect(difference).toBeLessThan(0.3);
    });

    test('共鸣效果应该增加编队战力', async () => {
      // 创建有元素系共鸣的编队（3个元素系英雄）
      const elementHeroes = [
        await heroManager.getHeroById('E001'), // 火摆烂
        await heroManager.getHeroById('E002'), // 水摆烂
        await heroManager.getHeroById('E003'), // 风摆烂
        testHeroes[3], // 非元素系
        testHeroes[4]  // 非元素系
      ];

      const formation = await formationManager.createFormation('test_player_012');
      await formationManager.setFullFormation(formation.formation_id, elementHeroes);

      const powerWithResonance = await formationManager.calculateTotalPower(formation.formation_id);

      // 创建无共鸣的编队进行对比
      const noResonanceFormation = await formationManager.createFormation('test_player_013');
      await formationManager.setFullFormation(noResonanceFormation.formation_id, testHeroes);

      const powerWithoutResonance = await formationManager.calculateTotalPower(noResonanceFormation.formation_id);

      // 有共鸣的编队战力应该更高
      expect(powerWithResonance).toBeGreaterThan(powerWithoutResonance);
    });
  });

  describe('编队配置管理', () => {
    test('应该支持保存多套编队配置', async () => {
      const playerId = 'test_player_014';

      // 创建3套不同的编队
      const formation1 = await formationManager.createFormation(playerId, '攻击编队');
      const formation2 = await formationManager.createFormation(playerId, '防御编队');
      const formation3 = await formationManager.createFormation(playerId, '平衡编队');

      const playerFormations = await formationManager.getPlayerFormations(playerId);
      expect(playerFormations.length).toBe(3);

      expect(playerFormations.map(f => f.formation_name)).toContain('攻击编队');
      expect(playerFormations.map(f => f.formation_name)).toContain('防御编队');
      expect(playerFormations.map(f => f.formation_name)).toContain('平衡编队');
    });

    test('应该支持编队快速切换', async () => {
      const playerId = 'test_player_015';

      const formation1 = await formationManager.createFormation(playerId, '编队1');
      const formation2 = await formationManager.createFormation(playerId, '编队2');

      await formationManager.setActiveFormation(playerId, formation1.formation_id);
      let activeFormation = await formationManager.getActiveFormation(playerId);
      expect(activeFormation.formation_id).toBe(formation1.formation_id);

      // 切换到编队2
      await formationManager.setActiveFormation(playerId, formation2.formation_id);
      activeFormation = await formationManager.getActiveFormation(playerId);
      expect(activeFormation.formation_id).toBe(formation2.formation_id);
    });

    test('编队配置响应时间应该小于0.5秒', async () => {
      const startTime = Date.now();

      const formation = await formationManager.createFormation('test_player_016');
      await formationManager.setFullFormation(formation.formation_id, testHeroes);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });

    test('应该支持编队模板保存和加载', async () => {
      const formation = await formationManager.createFormation('test_player_017');
      await formationManager.setFullFormation(formation.formation_id, testHeroes);

      // 保存为模板
      const template = await formationManager.saveAsTemplate(formation.formation_id, '通用模板');
      expect(template.template_name).toBe('通用模板');

      // 从模板创建新编队
      const newFormation = await formationManager.createFromTemplate('test_player_018', template.template_id);

      // 新编队应该有相同的配置
      expect(newFormation.front_position_1).toBe(formation.front_position_1);
      expect(newFormation.front_position_2).toBe(formation.front_position_2);
      expect(newFormation.front_position_3).toBe(formation.front_position_3);
      expect(newFormation.back_position_1).toBe(formation.back_position_1);
      expect(newFormation.back_position_2).toBe(formation.back_position_2);
    });
  });

  describe('战斗系统集成测试', () => {
    test('5v5编队战斗应该正确执行', async () => {
      const attackerFormation = await formationManager.createFormation('attacker');
      const defenderFormation = await formationManager.createFormation('defender');

      await formationManager.setFullFormation(attackerFormation.formation_id, testHeroes);
      await formationManager.setFullFormation(defenderFormation.formation_id, testHeroes.slice().reverse());

      const battleResult = await battleEngine.executeBattle(attackerFormation.formation_id, defenderFormation.formation_id);

      expect(battleResult.winner).toBeDefined();
      expect(battleResult.battle_duration).toBeGreaterThan(0);
      expect(battleResult.total_turns).toBeGreaterThan(0);
      expect(battleResult.damage_dealt).toBeGreaterThan(0);
    });

    test('战斗AI决策应该合理', async () => {
      const formation = await formationManager.createFormation('test_player_019');
      await formationManager.setFullFormation(formation.formation_id, testHeroes);

      const aiDecisions = await battleEngine.generateAIDecisions(formation.formation_id);

      aiDecisions.forEach(decision => {
        expect(decision.action_type).toMatch(/^(ATTACK|SKILL|DEFEND|HEAL)$/);
        expect(decision.target).toBeDefined();
        expect(decision.priority).toBeGreaterThan(0);
        expect(decision.reasoning).toBeDefined();
      });
    });

    test('战斗动画序列应该正确生成', async () => {
      const formation = await formationManager.createFormation('test_player_020');
      await formationManager.setFullFormation(formation.formation_id, testHeroes);

      const animationSequence = await battleEngine.generateAnimationSequence(formation.formation_id);

      expect(animationSequence.length).toBeGreaterThan(0);
      animationSequence.forEach(animation => {
        expect(animation.character_id).toBeDefined();
        expect(animation.animation_type).toBeDefined();
        expect(animation.duration).toBeGreaterThan(0);
        expect(animation.start_time).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('错误处理和边界条件', () => {
    test('不满5人的编队应该被拒绝进入战斗', async () => {
      const incompleteFormation = await formationManager.createFormation('test_player_021');
      await formationManager.setPosition(incompleteFormation.formation_id, FormationPosition.FRONT_1, testHeroes[0].hero_id);
      await formationManager.setPosition(incompleteFormation.formation_id, FormationPosition.FRONT_2, testHeroes[1].hero_id);

      await expect(
        battleEngine.validateFormationForBattle(incompleteFormation.formation_id)
      ).rejects.toThrow('编队人数不足');
    });

    test('英雄死亡状态应该被正确处理', async () => {
      const formation = await formationManager.createFormation('test_player_022');
      await formationManager.setFullFormation(formation.formation_id, testHeroes);

      // 模拟一个英雄死亡
      await heroManager.setHeroHP(testHeroes[0].hero_id, 0);

      const validationResult = await battleEngine.validateFormationForBattle(formation.formation_id);
      expect(validationResult.has_dead_heroes).toBe(true);
      expect(validationResult.dead_hero_count).toBe(1);
      expect(validationResult.can_battle).toBe(false);
    });

    test('无效的编队ID应该抛出错误', async () => {
      await expect(
        formationManager.getFormation('INVALID_FORMATION_ID')
      ).rejects.toThrow('编队不存在');
    });

    test('编队达到数量上限应该被阻止', async () => {
      const playerId = 'test_player_023';

      // 创建10个编队（假设上限是10）
      for (let i = 0; i < 10; i++) {
        await formationManager.createFormation(playerId, `编队${i + 1}`);
      }

      // 尝试创建第11个编队
      await expect(
        formationManager.createFormation(playerId, '编队11')
      ).rejects.toThrow('编队数量已达上限');
    });
  });

  describe('性能和优化验证', () => {
    test('编队战力计算应该支持缓存', async () => {
      const formation = await formationManager.createFormation('test_player_024');
      await formationManager.setFullFormation(formation.formation_id, testHeroes);

      // 第一次计算
      const startTime1 = Date.now();
      const power1 = await formationManager.calculateTotalPower(formation.formation_id);
      const time1 = Date.now() - startTime1;

      // 第二次计算（应该使用缓存）
      const startTime2 = Date.now();
      const power2 = await formationManager.calculateTotalPower(formation.formation_id);
      const time2 = Date.now() - startTime2;

      expect(power1).toBe(power2);
      expect(time2).toBeLessThan(time1 * 0.5); // 缓存应该至少快50%
    });

    test('大量编队操作应该保持性能', async () => {
      const playerId = 'test_player_025';
      const operationsCount = 100;

      const startTime = Date.now();

      // 执行100次编队操作
      for (let i = 0; i < operationsCount; i++) {
        const formation = await formationManager.createFormation(playerId, `批量编队${i}`);
        await formationManager.setPosition(formation.formation_id, FormationPosition.FRONT_1, testHeroes[0].hero_id);
      }

      const totalTime = Date.now() - startTime;
      const avgTimePerOperation = totalTime / operationsCount;

      expect(avgTimePerOperation).toBeLessThan(50); // 每个操作平均不超过50ms
    });
  });
});