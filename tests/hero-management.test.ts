/**
 * 英雄管理系统测试套件
 *
 * 测试覆盖：
 * - 45个英雄的基础属性验证
 * - 稀有度分层系统
 * - 技能配置完整性
 * - 英雄收集与解锁机制
 *
 * 基于规格：specs/hero-system-advanced.md
 * 作者：Guardian (QA_Tester_Agent)
 */

import { HeroManager, Hero, HeroData, SkillData, HeroCategory, HeroRarity } from '../src/systems/HeroManager';
import { AwakeningSystem } from '../src/systems/AwakeningSystem';

describe('英雄管理系统 - 核心功能测试', () => {
  let heroManager: HeroManager;
  let awakeningSystem: AwakeningSystem;

  beforeEach(() => {
    heroManager = new HeroManager();
    awakeningSystem = new AwakeningSystem();
  });

  describe('45英雄基础属性验证', () => {
    test('应该正确加载所有45个英雄', async () => {
      const allHeroes = await heroManager.getAllHeroes();
      expect(allHeroes.length).toBe(45);

      // 验证三大类别分布：每类15个英雄
      const elementHeroes = allHeroes.filter(hero => hero.category === HeroCategory.ELEMENT);
      const jobHeroes = allHeroes.filter(hero => hero.category === HeroCategory.JOB);
      const lifeHeroes = allHeroes.filter(hero => hero.category === HeroCategory.LIFE);

      expect(elementHeroes.length).toBe(15);
      expect(jobHeroes.length).toBe(15);
      expect(lifeHeroes.length).toBe(15);
    });

    test('每个英雄必须有唯一的ID和名称', async () => {
      const allHeroes = await heroManager.getAllHeroes();
      const heroIds = allHeroes.map(hero => hero.hero_id);
      const heroNames = allHeroes.map(hero => hero.hero_name);

      // 检查ID唯一性
      expect(new Set(heroIds).size).toBe(45);
      // 检查名称唯一性
      expect(new Set(heroNames).size).toBe(45);
    });

    test('所有英雄必须有完整的基础属性', async () => {
      const allHeroes = await heroManager.getAllHeroes();

      allHeroes.forEach(hero => {
        expect(hero.base_attack).toBeGreaterThan(0);
        expect(hero.base_defense).toBeGreaterThan(0);
        expect(hero.base_health).toBeGreaterThan(0);
        expect(hero.base_agility).toBeGreaterThan(0);
        expect(hero.base_energy).toBeGreaterThan(0);
        expect(hero.position_type).toMatch(/^(Front|Back)$/);
        expect(hero.growth_rates).toBeDefined();
      });
    });

    test('元素系英雄必须包含所有15种元素类型', async () => {
      const elementHeroes = await heroManager.getHeroesByCategory(HeroCategory.ELEMENT);
      const expectedElements = [
        '火摆烂', '水摆烂', '风摆烂', '土摆烂', '雷摆烂',
        '冰摆烂', '光摆烂', '暗摆烂', '木摆烂', '金摆烂',
        '时摆烂', '空摆烂', '重力摆烂', '能量摆烂', '混沌摆烂'
      ];

      const elementTypes = elementHeroes.map(hero => hero.subcategory);
      expectedElements.forEach(element => {
        expect(elementTypes).toContain(element);
      });
    });

    test('职场系英雄必须包含所有15种职业类型', async () => {
      const jobHeroes = await heroManager.getHeroesByCategory(HeroCategory.JOB);
      const expectedJobs = [
        '程序员摆烂', '设计师摆烂', '销售摆烂', 'HR摆烂', '老板摆烂',
        '运营摆烂', '产品摆烂', '测试摆烂', '财务摆烂', '行政摆烂',
        '客服摆烂', '市场摆烂', '法务摆烂', 'BD摆烂', '实习生摆烂'
      ];

      const jobTypes = jobHeroes.map(hero => hero.subcategory);
      expectedJobs.forEach(job => {
        expect(jobTypes).toContain(job);
      });
    });

    test('生活系英雄必须包含所有15种生活类型', async () => {
      const lifeHeroes = await heroManager.getHeroesByCategory(HeroCategory.LIFE);
      const expectedLifeStyles = [
        '吃货摆烂', '宅男摆烂', '学生摆烂', '家长摆烂', '退休摆烂',
        '购物摆烂', '旅游摆烂', '健身摆烂', '游戏摆烂', '追剧摆烂',
        '养宠摆烂', '读书摆烂', '音乐摆烂', '艺术摆烂', '社交摆烂'
      ];

      const lifeTypes = lifeHeroes.map(hero => hero.subcategory);
      expectedLifeStyles.forEach(lifestyle => {
        expect(lifeTypes).toContain(lifestyle);
      });
    });
  });

  describe('稀有度分层系统验证', () => {
    test('S级英雄数量和分布必须正确', async () => {
      const sRankHeroes = await heroManager.getHeroesByRarity(HeroRarity.S);
      expect(sRankHeroes.length).toBe(7); // 元素系2个+职场系3个+生活系2个

      // 验证S级英雄的成长系数
      sRankHeroes.forEach(hero => {
        expect(hero.growth_rates.rarity_multiplier).toBe(1.5);
      });
    });

    test('A级英雄数量和分布必须正确', async () => {
      const aRankHeroes = await heroManager.getHeroesByRarity(HeroRarity.A);
      expect(aRankHeroes.length).toBe(13); // 元素系4个+职场系4个+生活系5个

      aRankHeroes.forEach(hero => {
        expect(hero.growth_rates.rarity_multiplier).toBe(1.2);
      });
    });

    test('B级英雄数量和分布必须正确', async () => {
      const bRankHeroes = await heroManager.getHeroesByRarity(HeroRarity.B);
      expect(bRankHeroes.length).toBe(16); // 元素系6个+职场系5个+生活系5个

      bRankHeroes.forEach(hero => {
        expect(hero.growth_rates.rarity_multiplier).toBe(1.0);
      });
    });

    test('C级英雄数量和分布必须正确', async () => {
      const cRankHeroes = await heroManager.getHeroesByRarity(HeroRarity.C);
      expect(cRankHeroes.length).toBe(9); // 元素系3个+职场系3个+生活系3个

      cRankHeroes.forEach(hero => {
        expect(hero.growth_rates.rarity_multiplier).toBe(0.8);
      });
    });

    test('稀有度战力差异应该明显但不破坏平衡', async () => {
      const mixedHeroes = [
        await heroManager.getHeroById('S001'), // S级英雄
        await heroManager.getHeroById('A001'), // A级英雄
        await heroManager.getHeroById('B001'), // B级英雄
        await heroManager.getHeroById('C001')  // C级英雄
      ];

      // 在相同等级下计算战力
      const level = 50;
      const powers = mixedHeroes.map(hero =>
        heroManager.calculateCombatPower(hero, level)
      );

      // S级 > A级 > B级 > C级
      expect(powers[0]).toBeGreaterThan(powers[1]);
      expect(powers[1]).toBeGreaterThan(powers[2]);
      expect(powers[2]).toBeGreaterThan(powers[3]);

      // 但差距不应该过大（最大不超过2倍）
      expect(powers[0] / powers[3]).toBeLessThan(2.0);
    });
  });

  describe('技能系统完整性验证', () => {
    test('每个英雄必须有4个完整的技能', async () => {
      const allHeroes = await heroManager.getAllHeroes();

      for (const hero of allHeroes) {
        const skills = await heroManager.getHeroSkills(hero.hero_id);
        expect(skills.length).toBe(4);

        // 验证技能类型齐全：主动、被动、连击、终极
        const skillTypes = skills.map(skill => skill.skill_type);
        expect(skillTypes).toContain('Active');
        expect(skillTypes).toContain('Passive');
        expect(skillTypes).toContain('Combo');
        expect(skillTypes).toContain('Ultimate');
      }
    });

    test('主动技能必须有能量消耗和冷却时间', async () => {
      const testHero = await heroManager.getHeroById('E001'); // 火摆烂
      const activeSkill = await heroManager.getSkillByType(testHero.hero_id, 'Active');

      expect(activeSkill.energy_cost).toBeGreaterThan(0);
      expect(activeSkill.cooldown_time).toBeGreaterThan(0);
      expect(activeSkill.damage_base).toBeGreaterThan(0);
      expect(activeSkill.combo_tags).toBeDefined();
    });

    test('被动技能不应该有能量消耗', async () => {
      const testHero = await heroManager.getHeroById('J001'); // 程序员摆烂
      const passiveSkill = await heroManager.getSkillByType(testHero.hero_id, 'Passive');

      expect(passiveSkill.energy_cost).toBe(0);
      expect(passiveSkill.cooldown_time).toBe(0);
      expect(passiveSkill.special_effects).toBeDefined();
    });

    test('终极技能能量消耗必须最高', async () => {
      const testHero = await heroManager.getHeroById('S001'); // 混沌摆烂
      const skills = await heroManager.getHeroSkills(testHero.hero_id);

      const ultimateSkill = skills.find(skill => skill.skill_type === 'Ultimate');
      const otherSkills = skills.filter(skill => skill.skill_type !== 'Ultimate');

      expect(ultimateSkill.energy_cost).toBeGreaterThan(0);
      otherSkills.forEach(skill => {
        if (skill.energy_cost > 0) {
          expect(ultimateSkill.energy_cost).toBeGreaterThan(skill.energy_cost);
        }
      });
    });

    test('连击技能必须有配合标签', async () => {
      const allHeroes = await heroManager.getAllHeroes();

      for (const hero of allHeroes) {
        const comboSkill = await heroManager.getSkillByType(hero.hero_id, 'Combo');
        expect(comboSkill.combo_tags).toBeDefined();
        expect(comboSkill.combo_tags.length).toBeGreaterThan(0);
      }
    });
  });

  describe('英雄获取与解锁机制', () => {
    test('新玩家应该只能访问C级和部分B级英雄', async () => {
      const newPlayerLevel = 1;
      const availableHeroes = await heroManager.getAvailableHeroes(newPlayerLevel);

      // 新手阶段应该只有低稀有度英雄
      const rarities = availableHeroes.map(hero => hero.rarity);
      expect(rarities).not.toContain(HeroRarity.S);
      expect(rarities.filter(r => r === HeroRarity.A).length).toBeLessThan(3);
    });

    test('高级玩家可以解锁所有英雄', async () => {
      const highPlayerLevel = 100;
      const availableHeroes = await heroManager.getAvailableHeroes(highPlayerLevel);

      expect(availableHeroes.length).toBe(45);
    });

    test('英雄解锁应该有多种途径', async () => {
      const unlockMethods = await heroManager.getUnlockMethods();

      expect(unlockMethods).toContain('LEVEL_REWARD');    // 等级奖励
      expect(unlockMethods).toContain('STAGE_CLEAR');     // 关卡通关
      expect(unlockMethods).toContain('PURCHASE');        // 商店购买
      expect(unlockMethods).toContain('EVENT_REWARD');    // 活动奖励
      expect(unlockMethods).toContain('GACHA_PULL');      // 抽卡获得
    });

    test('未获得英雄应该显示获取途径提示', async () => {
      const playerId = 'test_player_001';
      const unobtainedHeroes = await heroManager.getUnobtainedHeroes(playerId);

      unobtainedHeroes.forEach(hero => {
        const hint = heroManager.getObtainHint(hero.hero_id);
        expect(hint).toBeDefined();
        expect(hint.method).toBeDefined();
        expect(hint.requirement).toBeDefined();
      });
    });
  });

  describe('摆烂主题一致性验证', () => {
    test('所有英雄名称必须包含"摆烂"关键词', async () => {
      const allHeroes = await heroManager.getAllHeroes();

      allHeroes.forEach(hero => {
        expect(hero.hero_name).toMatch(/摆烂/);
      });
    });

    test('每个英雄必须有独特的摆烂语录', async () => {
      const allHeroes = await heroManager.getAllHeroes();

      allHeroes.forEach(hero => {
        expect(hero.signature_quote).toBeDefined();
        expect(hero.signature_quote.length).toBeGreaterThan(5);
        expect(hero.signature_quote).toMatch(/什么|摆烂|随便|算了|懒得|不想/);
      });
    });

    test('英雄技能名称应该体现搞笑风格', async () => {
      const testHeroes = [
        await heroManager.getHeroById('E001'), // 火摆烂
        await heroManager.getHeroById('J001'), // 程序员摆烂
        await heroManager.getHeroById('L001')  // 吃货摆烂
      ];

      for (const hero of testHeroes) {
        const skills = await heroManager.getHeroSkills(hero.hero_id);
        skills.forEach(skill => {
          expect(skill.skill_name).toMatch(/懒|摆烂|随便|温吞|佛系|划水|咕咕/);
        });
      }
    });
  });

  describe('英雄数值计算验证', () => {
    test('战力计算公式应该准确执行', async () => {
      const testHero = await heroManager.getHeroById('A001');
      const level = 50;

      // 手动计算预期战力
      const expectedAttack = testHero.base_attack * (1 + testHero.growth_rates.attack * level) * testHero.growth_rates.rarity_multiplier;
      const expectedDefense = testHero.base_defense * (1 + testHero.growth_rates.defense * level) * testHero.growth_rates.rarity_multiplier;
      const expectedHealth = testHero.base_health * (1 + testHero.growth_rates.health * level) * testHero.growth_rates.rarity_multiplier;
      const expectedAgility = testHero.base_agility * (1 + testHero.growth_rates.agility * level) * testHero.growth_rates.rarity_multiplier;

      const expectedPower = expectedAttack * 1.2 + expectedDefense * 0.8 + expectedHealth * 0.3 + expectedAgility * 0.7;

      const actualPower = await heroManager.calculateCombatPower(testHero, level);

      // 允许1%的计算误差
      expect(Math.abs(actualPower - expectedPower) / expectedPower).toBeLessThan(0.01);
    });

    test('等级成长应该呈现合理的曲线', async () => {
      const testHero = await heroManager.getHeroById('B001');
      const levels = [1, 10, 25, 50, 75, 100];

      const powers = levels.map(level => heroManager.calculateCombatPower(testHero, level));

      // 战力应该随等级递增
      for (let i = 1; i < powers.length; i++) {
        expect(powers[i]).toBeGreaterThan(powers[i-1]);
      }

      // 成长率应该合理（不能过于陡峭）
      const growthRates = [];
      for (let i = 1; i < powers.length; i++) {
        growthRates.push(powers[i] / powers[i-1]);
      }

      // 每10级的成长倍数不应超过3倍
      growthRates.forEach(rate => {
        expect(rate).toBeLessThan(3.0);
      });
    });

    test('觉醒效果应该正确叠加到基础属性', async () => {
      const testHero = await heroManager.getHeroById('S001');
      const level = 50;

      const baseStats = await heroManager.getHeroStats(testHero, level);

      // 激活一个金品质觉醒石
      const awakeningEffect = {
        battleSpeedBonus: 0.3,
        criticalRateBonus: 0.15,
        goldMultiplierBonus: 0.5
      };

      const enhancedStats = await awakeningSystem.applyAwakeningEffects(baseStats, [awakeningEffect]);

      expect(enhancedStats.attackInterval).toBe(baseStats.attackInterval * 0.7); // 战斗速度+30%
      expect(enhancedStats.criticalRate).toBe(baseStats.criticalRate + 0.15);    // 暴击率+15%
      expect(enhancedStats.goldMultiplier).toBe(baseStats.goldMultiplier * 1.5); // 金币倍数+50%
    });
  });

  describe('错误处理和边界条件', () => {
    test('不存在的英雄ID应该抛出错误', async () => {
      await expect(heroManager.getHeroById('INVALID_ID')).rejects.toThrow('英雄不存在');
    });

    test('负数等级应该被拒绝', async () => {
      const testHero = await heroManager.getHeroById('A001');
      expect(() => heroManager.calculateCombatPower(testHero, -1)).toThrow('等级必须为正数');
    });

    test('超出上限的等级应该被限制', async () => {
      const testHero = await heroManager.getHeroById('A001');
      const maxLevelPower = heroManager.calculateCombatPower(testHero, 100);
      const overLimitPower = heroManager.calculateCombatPower(testHero, 999);

      expect(overLimitPower).toBe(maxLevelPower);
    });

    test('空的技能配合标签应该返回空数组', async () => {
      const emptySkill = {
        skill_id: 'TEST_EMPTY',
        combo_tags: null
      };

      const combos = await heroManager.findPossibleCombos(emptySkill);
      expect(combos).toEqual([]);
    });

    test('数据库连接失败时应该优雅降级', async () => {
      // 模拟数据库连接失败
      jest.spyOn(heroManager, 'connectToDatabase').mockRejectedValue(new Error('Database connection failed'));

      // 应该从缓存或静态数据读取
      const heroes = await heroManager.getAllHeroesWithFallback();
      expect(heroes.length).toBeGreaterThan(0);
    });
  });

  describe('性能要求验证', () => {
    test('45个英雄数据加载时间应该小于2秒', async () => {
      const startTime = Date.now();
      await heroManager.getAllHeroes();
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(2000);
    });

    test('英雄技能查询响应时间应该小于100ms', async () => {
      const startTime = Date.now();
      await heroManager.getHeroSkills('A001');
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(100);
    });

    test('大批量英雄数据处理应该高效', async () => {
      const allHeroes = await heroManager.getAllHeroes();

      const startTime = Date.now();
      const results = await Promise.all(
        allHeroes.map(hero => heroManager.calculateCombatPower(hero, 50))
      );
      const processingTime = Date.now() - startTime;

      expect(results.length).toBe(45);
      expect(processingTime).toBeLessThan(500); // 500ms内处理完45个英雄的计算
    });
  });
});