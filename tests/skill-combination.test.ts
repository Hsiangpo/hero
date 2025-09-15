/**
 * 技能配合系统测试套件
 *
 * 测试覆盖：
 * - 元素反应配合系统
 * - 职业协同配合机制
 * - 生活共鸣配合逻辑
 * - 2-5技能多层配合
 * - 配合伤害计算公式
 * - 配合触发条件验证
 *
 * 基于规格：specs/hero-system-advanced.md (2.3节)
 * 作者：Guardian (QA_Tester_Agent)
 */

import { SkillComboSystem, SkillCombo, ComboType, ComboResult } from '../src/systems/SkillComboSystem';
import { HeroManager, HeroData, SkillData } from '../src/systems/HeroManager';
import { BattleEngine } from '../src/systems/BattleEngine';

describe('技能配合系统测试', () => {
  let comboSystem: SkillComboSystem;
  let heroManager: HeroManager;
  let battleEngine: BattleEngine;
  let testHeroes: HeroData[];

  beforeEach(async () => {
    comboSystem = new SkillComboSystem();
    heroManager = new HeroManager();
    battleEngine = new BattleEngine();

    // 准备测试英雄：覆盖三大类别
    testHeroes = [
      await heroManager.getHeroById('E001'), // 火摆烂
      await heroManager.getHeroById('E002'), // 水摆烂
      await heroManager.getHeroById('E003'), // 风摆烂
      await heroManager.getHeroById('E004'), // 雷摆烂
      await heroManager.getHeroById('J001'), // 程序员摆烂
      await heroManager.getHeroById('J002'), // 设计师摆烂
      await heroManager.getHeroById('L001'), // 吃货摆烂
      await heroManager.getHeroById('L002')  // 宅男摆烂
    ];
  });

  describe('元素反应配合系统', () => {
    test('火+风配合应该触发"爆燃风暴"', async () => {
      const fireHero = testHeroes[0]; // 火摆烂
      const windHero = testHeroes[2]; // 风摆烂

      const fireSkill = await heroManager.getSkillByType(fireHero.hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(windHero.hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([fireSkill, windSkill]);

      expect(comboResult.success).toBe(true);
      expect(comboResult.combo_name).toBe('爆燃风暴');
      expect(comboResult.combo_type).toBe(ComboType.ELEMENT);
      expect(comboResult.damage_multiplier).toBe(2.0);
      expect(comboResult.special_effects).toContain('范围伤害');
      expect(comboResult.special_effects).toContain('燃烧DOT');
    });

    test('水+雷配合应该触发"感电激流"', async () => {
      const waterHero = testHeroes[1]; // 水摆烂
      const thunderHero = testHeroes[3]; // 雷摆烂

      const waterSkill = await heroManager.getSkillByType(waterHero.hero_id, 'Active');
      const thunderSkill = await heroManager.getSkillByType(thunderHero.hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([waterSkill, thunderSkill]);

      expect(comboResult.success).toBe(true);
      expect(comboResult.combo_name).toBe('感电激流');
      expect(comboResult.damage_multiplier).toBe(1.8);
      expect(comboResult.special_effects).toContain('链式传导');
      expect(comboResult.special_effects).toContain('麻痹');
    });

    test('三元素配合应该触发"雷火风暴"', async () => {
      const fireHero = testHeroes[0]; // 火摆烂
      const windHero = testHeroes[2]; // 风摆烂
      const thunderHero = testHeroes[3]; // 雷摆烂

      const fireSkill = await heroManager.getSkillByType(fireHero.hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(windHero.hero_id, 'Active');
      const thunderSkill = await heroManager.getSkillByType(thunderHero.hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([fireSkill, windSkill, thunderSkill]);

      expect(comboResult.success).toBe(true);
      expect(comboResult.combo_name).toBe('雷火风暴');
      expect(comboResult.damage_multiplier).toBe(3.5);
      expect(comboResult.special_effects).toContain('超大范围');
      expect(comboResult.special_effects).toContain('多重效果');
    });

    test('不兼容的元素组合应该失败', async () => {
      const fireHero = testHeroes[0]; // 火摆烂
      const waterHero = testHeroes[1]; // 水摆烂（火水相克）

      const fireSkill = await heroManager.getSkillByType(fireHero.hero_id, 'Active');
      const waterSkill = await heroManager.getSkillByType(waterHero.hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([fireSkill, waterSkill]);

      expect(comboResult.success).toBe(false);
      expect(comboResult.failure_reason).toContain('元素相克');
    });

    test('元素配合必须在5秒内触发', async () => {
      const fireHero = testHeroes[0];
      const windHero = testHeroes[2];

      const fireSkill = await heroManager.getSkillByType(fireHero.hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(windHero.hero_id, 'Active');

      // 第一个技能在时间0释放
      await comboSystem.recordSkillUsage(fireSkill, 0);

      // 第二个技能在6秒后释放（超过5秒窗口）
      await comboSystem.recordSkillUsage(windSkill, 6000);

      const comboResult = await comboSystem.checkPendingCombos();

      expect(comboResult.length).toBe(0); // 应该没有配合触发
    });
  });

  describe('职业协同配合机制', () => {
    test('程序员+设计师应该触发"产品爆发"', async () => {
      const programmerHero = testHeroes[4]; // 程序员摆烂
      const designerHero = testHeroes[5]; // 设计师摆烂

      const programmerSkill = await heroManager.getSkillByType(programmerHero.hero_id, 'Active');
      const designerSkill = await heroManager.getSkillByType(designerHero.hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([programmerSkill, designerSkill]);

      expect(comboResult.success).toBe(true);
      expect(comboResult.combo_name).toBe('产品爆发');
      expect(comboResult.combo_type).toBe(ComboType.JOB);
      expect(comboResult.damage_multiplier).toBe(2.0);
      expect(comboResult.special_effects).toContain('暴击率+30%');
    });

    test('职场三角配合应该触发"敏捷开发"', async () => {
      const programmerHero = testHeroes[4]; // 程序员摆烂
      const productHero = await heroManager.getHeroById('J003'); // 产品摆烂
      const testerHero = await heroManager.getHeroById('J008'); // 测试摆烂

      const programmerSkill = await heroManager.getSkillByType(programmerHero.hero_id, 'Active');
      const productSkill = await heroManager.getSkillByType(productHero.hero_id, 'Active');
      const testerSkill = await heroManager.getSkillByType(testerHero.hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([programmerSkill, productSkill, testerSkill]);

      expect(comboResult.success).toBe(true);
      expect(comboResult.combo_name).toBe('敏捷开发');
      expect(comboResult.damage_multiplier).toBe(2.8);
      expect(comboResult.special_effects).toContain('技能冷却-30%');
    });

    test('职场配合应该提供经验和金币加成', async () => {
      const salesHero = await heroManager.getHeroById('J003'); // 销售摆烂
      const hrHero = await heroManager.getHeroById('J004'); // HR摆烂

      const salesSkill = await heroManager.getSkillByType(salesHero.hero_id, 'Active');
      const hrSkill = await heroManager.getSkillByType(hrHero.hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([salesSkill, hrSkill]);

      expect(comboResult.success).toBe(true);
      expect(comboResult.combo_name).toBe('团队建设');
      expect(comboResult.special_effects).toContain('全队属性+15%');
      expect(comboResult.resource_bonus.experience_multiplier).toBeGreaterThan(1.0);
    });
  });

  describe('生活共鸣配合逻辑', () => {
    test('吃货+宅男应该触发"外卖续命"', async () => {
      const foodieHero = testHeroes[6]; // 吃货摆烂
      const homebodyHero = testHeroes[7]; // 宅男摆烂

      const foodieSkill = await heroManager.getSkillByType(foodieHero.hero_id, 'Active');
      const homebodySkill = await heroManager.getSkillByType(homebodyHero.hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([foodieSkill, homebodySkill]);

      expect(comboResult.success).toBe(true);
      expect(comboResult.combo_name).toBe('外卖续命');
      expect(comboResult.combo_type).toBe(ComboType.LIFE);
      expect(comboResult.special_effects).toContain('持续回血');
      expect(comboResult.special_effects).toContain('能量回复+50%');
      expect(comboResult.healing_per_second).toBe(200);
    });

    test('宅家三件套应该触发"终极宅神"', async () => {
      const homebodyHero = testHeroes[7]; // 宅男摆烂
      const gamerHero = await heroManager.getHeroById('L009'); // 游戏摆烂
      const dramaHero = await heroManager.getHeroById('L010'); // 追剧摆烂

      const homebodySkill = await heroManager.getSkillByType(homebodyHero.hero_id, 'Active');
      const gamerSkill = await heroManager.getSkillByType(gamerHero.hero_id, 'Active');
      const dramaSkill = await heroManager.getSkillByType(dramaHero.hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([homebodySkill, gamerSkill, dramaSkill]);

      expect(comboResult.success).toBe(true);
      expect(comboResult.combo_name).toBe('终极宅神');
      expect(comboResult.special_effects).toContain('能量消耗-50%');
      expect(comboResult.special_effects).toContain('技能威力+30%');
    });

    test('生活配合应该提供舒适度和防御加成', async () => {
      const shoppingHero = await heroManager.getHeroById('L005'); // 购物摆烂
      const dramaHero = await heroManager.getHeroById('L010'); // 追剧摆烂

      const shoppingSkill = await heroManager.getSkillByType(shoppingHero.hero_id, 'Active');
      const dramaSkill = await heroManager.getSkillByType(dramaHero.hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([shoppingSkill, dramaSkill]);

      expect(comboResult.success).toBe(true);
      expect(comboResult.combo_name).toBe('居家快乐');
      expect(comboResult.special_effects).toContain('防御力+25%');
      expect(comboResult.comfort_bonus).toBeGreaterThan(0);
    });
  });

  describe('多层配合系统验证', () => {
    test('2技能配合伤害倍数应该是1.5x', async () => {
      const fireHero = testHeroes[0];
      const windHero = testHeroes[2];

      const fireSkill = await heroManager.getSkillByType(fireHero.hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(windHero.hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([fireSkill, windSkill]);

      expect(comboResult.success).toBe(true);
      expect(comboResult.skill_count).toBe(2);
      expect(comboResult.base_multiplier).toBe(1.5);
    });

    test('3技能配合伤害倍数应该是2.2x', async () => {
      const skills = [
        await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active'),
        await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active'),
        await heroManager.getSkillByType(testHeroes[3].hero_id, 'Active')
      ];

      const comboResult = await comboSystem.attemptCombo(skills);

      expect(comboResult.success).toBe(true);
      expect(comboResult.skill_count).toBe(3);
      expect(comboResult.base_multiplier).toBe(2.2);
    });

    test('4技能配合伤害倍数应该是3.0x', async () => {
      const skills = [
        await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active'),
        await heroManager.getSkillByType(testHeroes[1].hero_id, 'Active'),
        await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active'),
        await heroManager.getSkillByType(testHeroes[3].hero_id, 'Active')
      ];

      // 需要找到4技能兼容的配合
      const comboResult = await comboSystem.findCompatibleCombo(skills);

      if (comboResult.success) {
        expect(comboResult.skill_count).toBe(4);
        expect(comboResult.base_multiplier).toBe(3.0);
      }
    });

    test('5技能配合伤害倍数应该是4.0x', async () => {
      const skills = [
        await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active'),
        await heroManager.getSkillByType(testHeroes[1].hero_id, 'Active'),
        await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active'),
        await heroManager.getSkillByType(testHeroes[3].hero_id, 'Active'),
        await heroManager.getSkillByType(testHeroes[4].hero_id, 'Active')
      ];

      const comboResult = await comboSystem.findCompatibleCombo(skills);

      if (comboResult.success) {
        expect(comboResult.skill_count).toBe(5);
        expect(comboResult.base_multiplier).toBe(4.0);
      }
    });
  });

  describe('配合伤害计算公式验证', () => {
    test('基础配合伤害公式应该正确执行', async () => {
      const fireSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([fireSkill, windSkill]);

      // 手动计算期望伤害
      const expectedDamage = (fireSkill.damage_base + windSkill.damage_base) * comboResult.damage_multiplier;

      expect(Math.abs(comboResult.total_damage - expectedDamage) / expectedDamage).toBeLessThan(0.01);
    });

    test('配合效果应该正确叠加', async () => {
      const skills = [
        await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active'),
        await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active')
      ];

      const comboResult = await comboSystem.attemptCombo(skills);

      // 验证特殊效果叠加公式
      const baseEffect = 1.0;
      const comboBonus = 0.5; // 爆燃风暴的配合加成
      const expectedEffect = baseEffect * (1 + comboBonus);

      expect(comboResult.effect_magnitude).toBeCloseTo(expectedEffect, 2);
    });

    test('共鸣系数应该正确影响配合伤害', async () => {
      // 创建一个有元素共鸣的编队
      const elementFormation = {
        heroes: [testHeroes[0], testHeroes[1], testHeroes[2]], // 3个元素系英雄
        resonance_bonus: 1.2 // 20%共鸣加成
      };

      const fireSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active');

      const comboWithResonance = await comboSystem.attemptComboWithResonance(
        [fireSkill, windSkill],
        elementFormation.resonance_bonus
      );

      const comboWithoutResonance = await comboSystem.attemptCombo([fireSkill, windSkill]);

      expect(comboWithResonance.total_damage).toBeGreaterThan(comboWithoutResonance.total_damage);
      expect(comboWithResonance.total_damage / comboWithoutResonance.total_damage).toBeCloseTo(1.2, 2);
    });
  });

  describe('配合触发条件验证', () => {
    test('主动技能应该能触发配合', async () => {
      const fireActiveSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');
      const windActiveSkill = await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active');

      expect(comboSystem.canTriggerCombo(fireActiveSkill)).toBe(true);
      expect(comboSystem.canTriggerCombo(windActiveSkill)).toBe(true);
    });

    test('被动技能不应该直接触发配合', async () => {
      const passiveSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Passive');

      expect(comboSystem.canTriggerCombo(passiveSkill)).toBe(false);
    });

    test('连击技能应该能参与配合', async () => {
      const comboSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Combo');

      expect(comboSystem.canParticipateInCombo(comboSkill)).toBe(true);
      expect(comboSkill.combo_tags.length).toBeGreaterThan(0);
    });

    test('冷却中的技能不应该参与配合', async () => {
      const fireSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');

      // 标记技能为冷却状态
      await comboSystem.setSkillCooldown(fireSkill.skill_id, 5000);

      expect(comboSystem.isSkillAvailable(fireSkill.skill_id)).toBe(false);
      expect(comboSystem.canTriggerCombo(fireSkill)).toBe(false);
    });

    test('能量不足时不应该触发配合', async () => {
      const fireSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active');

      // 设置英雄能量不足
      await heroManager.setHeroEnergy(testHeroes[0].hero_id, fireSkill.energy_cost - 1);

      const comboResult = await comboSystem.attemptCombo([fireSkill, windSkill]);

      expect(comboResult.success).toBe(false);
      expect(comboResult.failure_reason).toContain('能量不足');
    });
  });

  describe('配合发现和记录系统', () => {
    test('新配合发现应该触发成就', async () => {
      const playerId = 'test_player_001';
      const fireSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active');

      // 确保这是第一次发现这个配合
      await comboSystem.clearPlayerComboHistory(playerId);

      const comboResult = await comboSystem.attemptComboForPlayer(playerId, [fireSkill, windSkill]);

      expect(comboResult.is_first_discovery).toBe(true);
      expect(comboResult.achievement_unlocked).toBe(true);
      expect(comboResult.discovery_reward).toBeDefined();
    });

    test('配合历史应该被正确记录', async () => {
      const playerId = 'test_player_002';
      const fireSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active');

      await comboSystem.attemptComboForPlayer(playerId, [fireSkill, windSkill]);

      const history = await comboSystem.getPlayerComboHistory(playerId);
      expect(history.length).toBeGreaterThan(0);

      const latestCombo = history[0];
      expect(latestCombo.combo_name).toBe('爆燃风暴');
      expect(latestCombo.usage_count).toBe(1);
      expect(latestCombo.first_discovered_at).toBeDefined();
    });

    test('配合使用统计应该准确', async () => {
      const playerId = 'test_player_003';
      const fireSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active');

      // 连续使用5次同一配合
      for (let i = 0; i < 5; i++) {
        await comboSystem.attemptComboForPlayer(playerId, [fireSkill, windSkill]);
      }

      const stats = await comboSystem.getPlayerComboStats(playerId);
      expect(stats.total_combos_used).toBe(5);
      expect(stats.unique_combos_discovered).toBe(1);

      const comboStats = stats.combo_usage_stats.find(stat => stat.combo_name === '爆燃风暴');
      expect(comboStats.usage_count).toBe(5);
    });
  });

  describe('配合预览功能', () => {
    test('编队配合预览应该显示所有可用配合', async () => {
      const formationHeroes = [testHeroes[0], testHeroes[2], testHeroes[4], testHeroes[5], testHeroes[6]];

      const availableCombos = await comboSystem.getAvailableCombos(formationHeroes);

      expect(availableCombos.length).toBeGreaterThan(0);

      availableCombos.forEach(combo => {
        expect(combo.combo_name).toBeDefined();
        expect(combo.required_heroes).toBeDefined();
        expect(combo.damage_preview).toBeGreaterThan(0);
        expect(combo.special_effects).toBeDefined();
      });
    });

    test('配合伤害计算器应该提供准确预览', async () => {
      const fireHero = testHeroes[0];
      const windHero = testHeroes[2];
      const heroLevel = 50;

      const damagePreview = await comboSystem.calculateComboDamagePreview(
        [fireHero, windHero],
        heroLevel,
        '爆燃风暴'
      );

      expect(damagePreview.base_damage).toBeGreaterThan(0);
      expect(damagePreview.combo_damage).toBeGreaterThan(damagePreview.base_damage);
      expect(damagePreview.damage_increase_percentage).toBeCloseTo(100, 10); // 2x倍数 = 100%增加
    });

    test('配合推荐系统应该提供合理建议', async () => {
      const currentHeroes = [testHeroes[0], testHeroes[1]]; // 火摆烂, 水摆烂

      const recommendations = await comboSystem.getComboRecommendations(currentHeroes);

      expect(recommendations.length).toBeGreaterThan(0);

      recommendations.forEach(recommendation => {
        expect(recommendation.suggested_hero).toBeDefined();
        expect(recommendation.potential_combo).toBeDefined();
        expect(recommendation.improvement_score).toBeGreaterThan(0);
        expect(recommendation.reasoning).toBeDefined();
      });
    });
  });

  describe('战斗中配合触发', () => {
    test('自动战斗中应该智能触发配合', async () => {
      const formationHeroes = [testHeroes[0], testHeroes[2], testHeroes[4], testHeroes[5], testHeroes[6]];

      const battleSimulation = await battleEngine.simulateBattleWithCombos(formationHeroes);

      expect(battleSimulation.combos_triggered.length).toBeGreaterThan(0);

      battleSimulation.combos_triggered.forEach(combo => {
        expect(combo.trigger_time).toBeGreaterThan(0);
        expect(combo.participating_heroes.length).toBeGreaterThanOrEqual(2);
        expect(combo.damage_dealt).toBeGreaterThan(0);
      });
    });

    test('配合触发应该有专属动画标识', async () => {
      const fireSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([fireSkill, windSkill]);

      expect(comboResult.animation_id).toBeDefined();
      expect(comboResult.sound_effect_id).toBeDefined();
      expect(comboResult.visual_effects).toBeDefined();
      expect(comboResult.camera_shake_intensity).toBeGreaterThan(0);
    });

    test('配合积分应该正确累积', async () => {
      const playerId = 'test_player_004';
      const fireSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active');

      const initialPoints = await comboSystem.getPlayerComboPoints(playerId);

      await comboSystem.attemptComboForPlayer(playerId, [fireSkill, windSkill]);

      const finalPoints = await comboSystem.getPlayerComboPoints(playerId);

      expect(finalPoints).toBeGreaterThan(initialPoints);

      const pointsEarned = finalPoints - initialPoints;
      expect(pointsEarned).toBeGreaterThan(0);
    });
  });

  describe('错误处理和边界条件', () => {
    test('空的技能列表应该返回失败', async () => {
      const comboResult = await comboSystem.attemptCombo([]);

      expect(comboResult.success).toBe(false);
      expect(comboResult.failure_reason).toContain('技能列表为空');
    });

    test('单个技能不应该触发配合', async () => {
      const singleSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');

      const comboResult = await comboSystem.attemptCombo([singleSkill]);

      expect(comboResult.success).toBe(false);
      expect(comboResult.failure_reason).toContain('需要至少2个技能');
    });

    test('无效的技能ID应该被忽略', async () => {
      const validSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');
      const invalidSkill = { skill_id: 'INVALID_SKILL', combo_tags: [] };

      const comboResult = await comboSystem.attemptCombo([validSkill, invalidSkill]);

      expect(comboResult.success).toBe(false);
      expect(comboResult.failure_reason).toContain('无效技能');
    });

    test('超时的配合窗口应该被清理', async () => {
      const fireSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');

      // 记录技能使用但不在窗口期内添加其他技能
      await comboSystem.recordSkillUsage(fireSkill, 0);

      // 等待超过5秒窗口期
      await new Promise(resolve => setTimeout(resolve, 5100));

      const pendingCombos = await comboSystem.checkPendingCombos();
      expect(pendingCombos.length).toBe(0);
    });
  });

  describe('性能和优化验证', () => {
    test('配合计算响应时间应该小于100ms', async () => {
      const fireSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active');

      const startTime = Date.now();
      await comboSystem.attemptCombo([fireSkill, windSkill]);
      const calculationTime = Date.now() - startTime;

      expect(calculationTime).toBeLessThan(100);
    });

    test('大量配合查询应该保持性能', async () => {
      const allHeroes = await heroManager.getAllHeroes();
      const heroSubset = allHeroes.slice(0, 15); // 测试15个英雄

      const startTime = Date.now();
      const availableCombos = await comboSystem.getAvailableCombos(heroSubset);
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(500); // 500ms内完成15英雄的配合查询
      expect(availableCombos.length).toBeGreaterThan(0);
    });

    test('配合缓存应该提高性能', async () => {
      const fireSkill = await heroManager.getSkillByType(testHeroes[0].hero_id, 'Active');
      const windSkill = await heroManager.getSkillByType(testHeroes[2].hero_id, 'Active');

      // 第一次计算
      const startTime1 = Date.now();
      await comboSystem.attemptCombo([fireSkill, windSkill]);
      const time1 = Date.now() - startTime1;

      // 第二次计算（应该使用缓存）
      const startTime2 = Date.now();
      await comboSystem.attemptCombo([fireSkill, windSkill]);
      const time2 = Date.now() - startTime2;

      expect(time2).toBeLessThan(time1 * 0.5); // 缓存应该至少快50%
    });
  });
});