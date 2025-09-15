/**
 * 《封神挂机录》核心玩法测试套件
 *
 * 测试覆盖范围：
 * 1. 挂机修仙系统（自动战斗、法力经验、手动加速、离线挂机）
 * 2. 45位封神角色体系（仙/人/妖三大阵营、五行属性、稀有度）
 * 3. 基础数值计算（成长公式、境界突破、战力计算）
 * 4. 角色获取管理（抽取、培养、升级）
 * 5. 法力值衰减机制（防滚雪球平衡性）
 *
 * 注意：所有测试当前应为失败状态，因为实现代码尚未存在（TDD原则）
 */

import './setup';

describe('封神挂机录 - 核心玩法系统', () => {

  describe('挂机修仙系统', () => {

    describe('基础挂机机制', () => {

      it('应该实现角色自动战斗获得法力和经验', async () => {
        // 创建测试角色
        const character = global.testUtils.createTestCharacter({
          character_id: 'XIAN_001',
          character_name: '姜子牙',
          level: 1,
          experience: 0,
          current_mana: 100
        });

        // 模拟自动战斗1分钟
        const battleDuration = 60000; // 60秒
        const expectedManaGain = 10; // 每分钟获得10法力
        const expectedExpGain = 1234; // 每分钟获得1234经验

        // 执行挂机战斗
        const idleResult = await IdleSystem.performAutoBattle(character, battleDuration);

        // 验证收益计算正确
        expect(idleResult.manaGained).toBe(expectedManaGain);
        expect(idleResult.experienceGained).toBe(expectedExpGain);
        expect(idleResult.duration).toBe(battleDuration);
        expect(idleResult.efficiency).toBe(1.0); // 基础100%效率
      });

      it('应该正确计算手动点击130%效率加速', async () => {
        const character = global.testUtils.createTestCharacter();
        const battleDuration = 60000;

        // 启用手动点击模式
        const idleResult = await IdleSystem.performAutoBattle(character, battleDuration, {
          manualClickEnabled: true
        });

        // 验证130%效率
        expect(idleResult.efficiency).toBe(1.3);
        expect(idleResult.manaGained).toBe(Math.floor(10 * 1.3)); // 13法力
        expect(idleResult.experienceGained).toBe(Math.floor(1234 * 1.3)); // 1604经验
      });

      it('应该正确处理法器助战180%效率', async () => {
        const character = global.testUtils.createTestCharacter();
        const player = {
          playerId: 'TEST_PLAYER_001',
          inventory: { fairy_charms: 5 } // 拥有5个仙符
        };

        const idleResult = await IdleSystem.performAutoBattle(character, 60000, {
          useFairyCharm: true,
          player: player
        });

        // 验证180%效率和仙符消耗
        expect(idleResult.efficiency).toBe(1.8);
        expect(idleResult.itemsConsumed.fairy_charms).toBe(1);
        expect(idleResult.manaGained).toBe(Math.floor(10 * 1.8)); // 18法力
      });

      it('应该在仙符不足时抛出错误', async () => {
        const character = global.testUtils.createTestCharacter();
        const player = {
          playerId: 'TEST_PLAYER_001',
          inventory: { fairy_charms: 0 } // 没有仙符
        };

        await expect(IdleSystem.performAutoBattle(character, 60000, {
          useFairyCharm: true,
          player: player
        })).rejects.toThrow('仙符不足，无法启动法器助战');
      });

      it('应该正确处理双修加成200%效率', async () => {
        const character = global.testUtils.createTestCharacter();
        const player = {
          playerId: 'TEST_PLAYER_001',
          friends: ['FRIEND_001'], // 有好友协助
          sect: { double_cultivation_bonus: true } // 宗门有双修加成
        };

        const idleResult = await IdleSystem.performAutoBattle(character, 60000, {
          doubleCultivation: true,
          player: player
        });

        expect(idleResult.efficiency).toBe(2.0);
        expect(idleResult.manaGained).toBe(20); // 10 * 2.0
      });

      it('应该在渡劫时刻提供250%效率爆发', async () => {
        const character = global.testUtils.createTestCharacter({
          level: 99, // 接近突破等级
          experience: 999800 // 距离升级还差200经验
        });

        const idleResult = await IdleSystem.performAutoBattle(character, 60000, {
          triggerAscension: true // 触发渡劫
        });

        expect(idleResult.efficiency).toBe(2.5);
        expect(idleResult.ascensionTriggered).toBe(true);
        expect(idleResult.experienceGained).toBe(Math.floor(1234 * 2.5)); // 3085经验
      });
    });

    describe('离线挂机机制', () => {

      it('应该正确计算离线挂机累积修为', async () => {
        const character = global.testUtils.createTestCharacter();
        const offlineStartTime = Date.now() - (4 * 60 * 60 * 1000); // 4小时前
        const currentTime = Date.now();

        const offlineResult = await IdleSystem.calculateOfflineRewards(character, offlineStartTime, currentTime);

        // 验证4小时离线收益
        expect(offlineResult.offlineDuration).toBe(4 * 60 * 60 * 1000);
        expect(offlineResult.manaGained).toBe(40); // 10法力/小时 * 4小时
        expect(offlineResult.experienceGained).toBe(4936); // 1234经验/小时 * 4小时
      });

      it('应该在8小时后封顶离线收益', async () => {
        const character = global.testUtils.createTestCharacter();
        const offlineStartTime = Date.now() - (12 * 60 * 60 * 1000); // 12小时前
        const currentTime = Date.now();

        const offlineResult = await IdleSystem.calculateOfflineRewards(character, offlineStartTime, currentTime);

        // 验证8小时封顶机制
        expect(offlineResult.cappedAt8Hours).toBe(true);
        expect(offlineResult.actualOfflineDuration).toBe(12 * 60 * 60 * 1000);
        expect(offlineResult.rewardOfflineDuration).toBe(8 * 60 * 60 * 1000);
        expect(offlineResult.manaGained).toBe(80); // 最多8小时收益
      });

      it('应该根据VIP等级调整离线时长上限', async () => {
        const character = global.testUtils.createTestCharacter();
        const vipPlayer = {
          vipLevel: 3,
          vipBenefits: { maxOfflineHours: 12 } // VIP3可离线12小时
        };

        const offlineStartTime = Date.now() - (10 * 60 * 60 * 1000); // 10小时前
        const offlineResult = await IdleSystem.calculateOfflineRewards(character, offlineStartTime, Date.now(), {
          player: vipPlayer
        });

        expect(offlineResult.cappedAtVIPHours).toBe(false); // 10小时 < 12小时VIP上限
        expect(offlineResult.manaGained).toBe(100); // 完整10小时收益
      });
    });

    describe('法力值衰减系统', () => {

      it('应该在法力值100时保持100%战力', () => {
        const powerCoefficient = global.testUtils.calculatePowerCoefficient(100);
        expect(powerCoefficient).toBe(1.0);

        const basePower = 10000;
        const effectivePower = ManaSystem.calculateEffectivePower(basePower, 100);
        expect(effectivePower).toBe(10000);
      });

      it('应该正确计算法力值80时约90%战力', () => {
        const powerCoefficient = global.testUtils.calculatePowerCoefficient(80);
        const expectedCoefficient = Math.pow(0.95, 2); // k=2, 0.95^2 ≈ 0.9025

        expect(powerCoefficient).toBeCloseTo(expectedCoefficient, 4);

        const effectivePower = ManaSystem.calculateEffectivePower(10000, 80);
        expect(effectivePower).toBeBetween(9000, 9100); // 约90%战力
      });

      it('应该正确计算法力值50时约77%战力', () => {
        const powerCoefficient = global.testUtils.calculatePowerCoefficient(50);
        const expectedCoefficient = Math.pow(0.95, 5); // k=5, 0.95^5 ≈ 0.7738

        expect(powerCoefficient).toBeCloseTo(expectedCoefficient, 4);

        const effectivePower = ManaSystem.calculateEffectivePower(10000, 50);
        expect(effectivePower).toBeBetween(7700, 7800); // 约77%战力
      });

      it('应该正确计算法力值20时约60%战力', () => {
        const powerCoefficient = global.testUtils.calculatePowerCoefficient(20);
        const expectedCoefficient = Math.pow(0.95, 8); // k=8, 0.95^8 ≈ 0.6634

        expect(powerCoefficient).toBeCloseTo(expectedCoefficient, 4);

        const effectivePower = ManaSystem.calculateEffectivePower(10000, 20);
        expect(effectivePower).toBeBetween(6600, 6700); // 约66%战力
      });

      it('应该在法力值为0时保底50%战力', () => {
        const powerCoefficient = global.testUtils.calculatePowerCoefficient(0);
        expect(powerCoefficient).toBe(0.5); // 保底机制

        const effectivePower = ManaSystem.calculateEffectivePower(10000, 0);
        expect(effectivePower).toBe(5000); // 保底50%战力
      });

      it('应该拒绝无效法力值输入', () => {
        expect(() => ManaSystem.calculateEffectivePower(10000, -10)).toThrow('法力值不能为负数');
        expect(() => ManaSystem.calculateEffectivePower(10000, 150)).toThrow('法力值不能超过100');
        expect(() => ManaSystem.calculateEffectivePower(10000, 'invalid')).toThrow('法力值必须为数字');
      });
    });
  });

  describe('45位封神角色体系', () => {

    describe('三大阵营分类', () => {

      it('应该正确定义仙家阵营15位角色', () => {
        const immortalCharacters = CharacterSystem.getCharactersByCamp('Immortal');

        expect(immortalCharacters).toHaveLength(15);

        // 验证昆仑仙人
        const kunlunImmortals = immortalCharacters.filter(c => c.subcategory === '昆仑仙人');
        expect(kunlunImmortals.map(c => c.character_name)).toContain('元始天尊');
        expect(kunlunImmortals.map(c => c.character_name)).toContain('太上老君');
        expect(kunlunImmortals.map(c => c.character_name)).toContain('通天教主');

        // 验证阐教弟子
        const chanjiao = immortalCharacters.filter(c => c.subcategory === '阐教弟子');
        expect(chanjiao.map(c => c.character_name)).toContain('姜子牙');
        expect(chanjiao.map(c => c.character_name)).toContain('杨戬');
        expect(chanjiao.map(c => c.character_name)).toContain('哪吒');
      });

      it('应该正确定义人族英雄15位角色', () => {
        const humanCharacters = CharacterSystem.getCharactersByCamp('Human');

        expect(humanCharacters).toHaveLength(15);

        // 验证商朝将领
        const shangGenerals = humanCharacters.filter(c => c.subcategory === '商朝将领');
        expect(shangGenerals.map(c => c.character_name)).toContain('闻仲');
        expect(shangGenerals.map(c => c.character_name)).toContain('张桂芳');

        // 验证周朝英雄
        const zhouHeroes = humanCharacters.filter(c => c.subcategory === '周朝英雄');
        expect(zhouHeroes.map(c => c.character_name)).toContain('姬发');
        expect(zhouHeroes.map(c => c.character_name)).toContain('姬昌');
      });

      it('应该正确定义妖魔阵营15位角色', () => {
        const demonCharacters = CharacterSystem.getCharactersByCamp('Demon');

        expect(demonCharacters).toHaveLength(15);

        // 验证上古妖王
        const ancientDemons = demonCharacters.filter(c => c.subcategory === '上古妖王');
        expect(ancientDemons.map(c => c.character_name)).toContain('九尾狐');
        expect(ancientDemons.map(c => c.character_name)).toContain('雉鸡精');

        // 验证龙族
        const dragons = demonCharacters.filter(c => c.subcategory === '龙族');
        expect(dragons.map(c => c.character_name)).toContain('龙王');
      });

      it('应该验证每个角色都有正确的阵营标识', () => {
        const allCharacters = CharacterSystem.getAllCharacters();

        expect(allCharacters).toHaveLength(45);

        allCharacters.forEach(character => {
          expect(character.camp).toBeValidCamp();
          expect(character.character_id).toBeValidCharacterId();
          expect(character.character_name).toBeTruthy();
          expect(character.backstory).toBeTruthy();
        });
      });
    });

    describe('五行属性系统', () => {

      it('应该为每个角色分配正确的五行属性', () => {
        const allCharacters = CharacterSystem.getAllCharacters();

        allCharacters.forEach(character => {
          expect(character.element).toBeValidElement();
        });
      });

      it('应该验证五行属性分配的平衡性', () => {
        const allCharacters = CharacterSystem.getAllCharacters();
        const elementDistribution = {};

        allCharacters.forEach(character => {
          elementDistribution[character.element] = (elementDistribution[character.element] || 0) + 1;
        });

        // 验证每个五行属性都有角色，且分配相对均匀
        expect(Object.keys(elementDistribution)).toHaveLength(5);
        Object.values(elementDistribution).forEach(count => {
          expect(count).toBeBetween(7, 11); // 每个属性7-11个角色
        });
      });

      it('应该验证特定角色的五行属性符合设定', () => {
        // 验证金系角色
        const yangJian = CharacterSystem.getCharacterByName('杨戬');
        expect(yangJian.element).toBe('Metal');

        const liJing = CharacterSystem.getCharacterByName('李靖');
        expect(liJing.element).toBe('Metal');

        // 验证火系角色
        const nezha = CharacterSystem.getCharacterByName('哪吒');
        expect(nezha.element).toBe('Fire');

        // 验证水系角色
        const sanxiao = CharacterSystem.getCharacterByName('三霄娘娘');
        expect(sanxiao.element).toBe('Water');
      });
    });

    describe('稀有度等级系统', () => {

      it('应该正确分配SSR/SR/R/N四个稀有度等级', () => {
        const allCharacters = CharacterSystem.getAllCharacters();
        const rarityDistribution = {};

        allCharacters.forEach(character => {
          expect(['SSR', 'SR', 'R', 'N']).toContain(character.rarity);
          rarityDistribution[character.rarity] = (rarityDistribution[character.rarity] || 0) + 1;
        });

        // 验证稀有度分配合理
        expect(rarityDistribution.SSR).toBeBetween(6, 10); // SSR最稀有
        expect(rarityDistribution.SR).toBeBetween(8, 12);
        expect(rarityDistribution.R).toBeBetween(12, 18);
        expect(rarityDistribution.N).toBeBetween(8, 15);
      });

      it('应该验证重要角色具有对应的高稀有度', () => {
        // 三清应该是SSR
        const yuanshi = CharacterSystem.getCharacterByName('元始天尊');
        expect(yuanshi.rarity).toBe('SSR');

        const taishang = CharacterSystem.getCharacterByName('太上老君');
        expect(taishang.rarity).toBe('SSR');

        const tongtian = CharacterSystem.getCharacterByName('通天教主');
        expect(tongtian.rarity).toBe('SSR');

        // 主要角色应该是SR或以上
        const jiangZiya = CharacterSystem.getCharacterByName('姜子牙');
        expect(['SSR', 'SR']).toContain(jiangZiya.rarity);
      });

      it('应该正确计算稀有度系数对属性的影响', () => {
        const baseCharacter = global.testUtils.createTestCharacter({
          base_attack: 100,
          rarity: 'N'
        });

        const ssrCharacter = global.testUtils.createTestCharacter({
          base_attack: 100,
          rarity: 'SSR'
        });

        const nCharacterFinalAttack = CharacterSystem.calculateFinalStats(baseCharacter, 1).attack;
        const ssrCharacterFinalAttack = CharacterSystem.calculateFinalStats(ssrCharacter, 1).attack;

        // SSR应该比N级有2倍属性加成
        expect(ssrCharacterFinalAttack).toBe(nCharacterFinalAttack * 2.0);
      });
    });
  });

  describe('基础数值计算系统', () => {

    describe('角色成长公式', () => {

      it('应该正确计算基础属性成长公式', () => {
        const character = global.testUtils.createTestCharacter({
          base_attack: 100,
          growth_rate: { attack: 0.15 },
          rarity: 'SR' // 1.5x系数
        });

        const level50Stats = CharacterSystem.calculateFinalStats(character, 50);

        // 当前属性 = 基础属性 × (1 + 成长率 × √等级) × 稀有度系数
        // = 100 × (1 + 0.15 × √50) × 1.5
        // = 100 × (1 + 0.15 × 7.071) × 1.5
        // = 100 × (1 + 1.0607) × 1.5
        // = 100 × 2.0607 × 1.5 ≈ 309

        expect(level50Stats.attack).toBeCloseTo(309, 0);
      });

      it('应该正确应用稀有度系数', () => {
        const baseStats = { base_attack: 100, growth_rate: { attack: 0.1 } };

        const nCharacter = CharacterSystem.calculateFinalStats({...baseStats, rarity: 'N'}, 10);
        const rCharacter = CharacterSystem.calculateFinalStats({...baseStats, rarity: 'R'}, 10);
        const srCharacter = CharacterSystem.calculateFinalStats({...baseStats, rarity: 'SR'}, 10);
        const ssrCharacter = CharacterSystem.calculateFinalStats({...baseStats, rarity: 'SSR'}, 10);

        // 验证稀有度系数：N=1.0, R=1.2, SR=1.5, SSR=2.0
        const baseValue = nCharacter.attack;
        expect(rCharacter.attack).toBeCloseTo(baseValue * 1.2, 0);
        expect(srCharacter.attack).toBeCloseTo(baseValue * 1.5, 0);
        expect(ssrCharacter.attack).toBeCloseTo(baseValue * 2.0, 0);
      });

      it('应该处理角色等级边界值', () => {
        const character = global.testUtils.createTestCharacter();

        // 测试等级1（最小值）
        const level1Stats = CharacterSystem.calculateFinalStats(character, 1);
        expect(level1Stats.attack).toBeGreaterThan(0);

        // 测试等级999（最大值）
        const level999Stats = CharacterSystem.calculateFinalStats(character, 999);
        expect(level999Stats.attack).toBeGreaterThan(level1Stats.attack);

        // 测试无效等级
        expect(() => CharacterSystem.calculateFinalStats(character, 0)).toThrow('角色等级必须大于0');
        expect(() => CharacterSystem.calculateFinalStats(character, 1000)).toThrow('角色等级不能超过999');
      });
    });

    describe('境界突破公式', () => {

      it('应该正确计算境界突破战力加成', () => {
        const character = global.testUtils.createTestCharacter({
          base_power: 10000,
          realm_level: 3,
          element: 'Fire'
        });

        // 境界战力 = 基础战力 × (1.2^境界等级) × 五行加成
        // = 10000 × (1.2^3) × 1.0 = 10000 × 1.728 = 17280

        const realmPower = CharacterSystem.calculateRealmPower(character);
        expect(realmPower).toBeCloseTo(17280, 0);
      });

      it('应该在五行齐全时应用五行加成', () => {
        const formation = [
          global.testUtils.createTestCharacter({ element: 'Metal' }),
          global.testUtils.createTestCharacter({ element: 'Wood' }),
          global.testUtils.createTestCharacter({ element: 'Water' }),
          global.testUtils.createTestCharacter({ element: 'Fire' }),
          global.testUtils.createTestCharacter({ element: 'Earth' })
        ];

        const hasAllElements = FormationSystem.checkAllElementsPresent(formation);
        expect(hasAllElements).toBe(true);

        const elementBonus = FormationSystem.calculateElementBonus(formation);
        expect(elementBonus).toBe(2.0); // 五行齐全时获得额外100%加成
      });

      it('应该正确处理境界突破条件', () => {
        const character = global.testUtils.createTestCharacter({
          level: 100,
          experience: 1000000,
          realm_level: 4,
          realm_materials: { spirit_stone: 500, essence: 100 }
        });

        const canBreakthrough = RealmSystem.checkBreakthroughConditions(character);
        expect(canBreakthrough.eligible).toBe(true);
        expect(canBreakthrough.requirements).toEqual({
          level: 100,
          experience: 1000000,
          materials: { spirit_stone: 500, essence: 100 }
        });

        // 材料不足时应该失败
        const poorCharacter = { ...character, realm_materials: { spirit_stone: 100 } };
        const cannotBreakthrough = RealmSystem.checkBreakthroughConditions(poorCharacter);
        expect(cannotBreakthrough.eligible).toBe(false);
        expect(cannotBreakthrough.reason).toBe('材料不足');
      });
    });
  });

  describe('角色获取管理系统', () => {

    describe('角色抽取机制', () => {

      it('应该实现基础角色抽取功能', async () => {
        const player = { playerId: 'TEST_PLAYER_001', gems: 1000 };

        const drawResult = await CharacterDrawSystem.performSingleDraw(player);

        expect(drawResult.character).toBeDefined();
        expect(drawResult.character.character_id).toBeValidCharacterId();
        expect(drawResult.character.rarity).toMatch(/^(SSR|SR|R|N)$/);
        expect(drawResult.cost).toBe(100); // 单抽100宝石
        expect(drawResult.remainingGems).toBe(900);
      });

      it('应该实现十连抽保底机制', async () => {
        const player = { playerId: 'TEST_PLAYER_001', gems: 1000 };

        const drawResult = await CharacterDrawSystem.performTenDraw(player);

        expect(drawResult.characters).toHaveLength(10);
        expect(drawResult.cost).toBe(900); // 十连抽900宝石

        // 验证至少有一个SR或以上
        const highRarityCharacters = drawResult.characters.filter(c => ['SSR', 'SR'].includes(c.rarity));
        expect(highRarityCharacters.length).toBeGreaterThanOrEqual(1);
      });

      it('应该在宝石不足时拒绝抽取', async () => {
        const poorPlayer = { playerId: 'TEST_PLAYER_001', gems: 50 };

        await expect(CharacterDrawSystem.performSingleDraw(poorPlayer))
          .rejects.toThrow('宝石不足，无法进行抽取');
      });

      it('应该实现SSR保底计数器', async () => {
        const player = {
          playerId: 'TEST_PLAYER_001',
          gems: 10000,
          pityCounter: 89 // 已经89抽没出SSR
        };

        const drawResult = await CharacterDrawSystem.performSingleDraw(player);

        // 第90抽必定SSR
        expect(drawResult.character.rarity).toBe('SSR');
        expect(drawResult.pityTriggered).toBe(true);
        expect(drawResult.newPityCounter).toBe(0);
      });
    });

    describe('角色培养升级', () => {

      it('应该正确处理角色升级', async () => {
        const character = global.testUtils.createTestCharacter({
          level: 50,
          experience: 100000,
          required_exp_for_next_level: 120000
        });

        const upgradeResult = await CharacterSystem.upgradeCharacter(character, 25000);

        expect(upgradeResult.newLevel).toBe(51);
        expect(upgradeResult.newExperience).toBe(5000); // 125000 - 120000
        expect(upgradeResult.statsIncrease).toBeDefined();
        expect(upgradeResult.statsIncrease.attack).toBeGreaterThan(0);
      });

      it('应该处理连续多级升级', async () => {
        const character = global.testUtils.createTestCharacter({
          level: 1,
          experience: 0
        });

        const massUpgradeResult = await CharacterSystem.upgradeCharacter(character, 1000000);

        expect(massUpgradeResult.newLevel).toBeGreaterThan(1);
        expect(massUpgradeResult.levelsGained).toBeGreaterThan(0);
        expect(massUpgradeResult.finalStats.attack).toBeGreaterThan(character.base_attack);
      });

      it('应该在达到等级上限时停止升级', async () => {
        const maxLevelCharacter = global.testUtils.createTestCharacter({
          level: 999,
          experience: 999999999
        });

        const upgradeResult = await CharacterSystem.upgradeCharacter(maxLevelCharacter, 100000);

        expect(upgradeResult.newLevel).toBe(999);
        expect(upgradeResult.levelsGained).toBe(0);
        expect(upgradeResult.reachedMaxLevel).toBe(true);
      });
    });
  });

  describe('性能和边界条件测试', () => {

    it('应该在100ms内完成单次挂机计算', async () => {
      const character = global.testUtils.createTestCharacter();

      const { result, executionTime } = await global.measurePerformance(async () => {
        return IdleSystem.performAutoBattle(character, 60000);
      });

      expect(executionTime).toBeWithinPerformanceLimit(100);
      expect(result).toBeDefined();
    });

    it('应该处理极大数值而不溢出', () => {
      const character = global.testUtils.createTestCharacter({
        base_attack: Number.MAX_SAFE_INTEGER / 1000,
        level: 999
      });

      expect(() => {
        const stats = CharacterSystem.calculateFinalStats(character, 999);
        expect(stats.attack).toBeLessThan(Number.MAX_SAFE_INTEGER);
      }).not.toThrow();
    });

    it('应该正确处理空值和边界输入', () => {
      expect(() => CharacterSystem.calculateFinalStats(null, 1)).toThrow('角色数据不能为空');
      expect(() => CharacterSystem.calculateFinalStats({}, 1)).toThrow('缺少必要的角色属性');

      expect(() => ManaSystem.calculateEffectivePower(0, 50)).toThrow('基础战力必须大于0');
      expect(() => ManaSystem.calculateEffectivePower(-100, 50)).toThrow('基础战力不能为负数');
    });

    it('应该在高并发情况下保持数据一致性', async () => {
      const character = global.testUtils.createTestCharacter();

      // 模拟100个并发挂机计算
      const concurrentPromises = Array.from({length: 100}, () =>
        IdleSystem.performAutoBattle(character, 1000)
      );

      const results = await Promise.all(concurrentPromises);

      // 所有结果应该相同（相同输入相同输出）
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.manaGained).toBe(firstResult.manaGained);
        expect(result.experienceGained).toBe(firstResult.experienceGained);
      });
    });
  });

  describe('错误处理和异常情况', () => {

    it('应该正确处理网络错误', async () => {
      // 模拟网络断开
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network Error'));

      await expect(CharacterDrawSystem.performSingleDraw({ playerId: 'TEST', gems: 1000 }))
        .rejects.toThrow('网络连接失败，请检查网络后重试');

      jest.restoreAllMocks();
    });

    it('应该处理数据库连接失败', async () => {
      // 模拟数据库连接失败
      const mockDatabase = {
        connect: jest.fn().mockRejectedValue(new Error('Database Connection Failed'))
      };

      await expect(CharacterSystem.saveCharacterData(mockDatabase, {}))
        .rejects.toThrow('数据保存失败，请稍后重试');
    });

    it('应该处理内存不足情况', () => {
      // 模拟内存不足
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 1024 * 1024 * 1024, // 1GB
        heapUsed: 800 * 1024 * 1024, // 800MB
        heapTotal: 900 * 1024 * 1024 // 900MB
      });

      expect(() => {
        CharacterSystem.loadAllCharacters();
      }).toThrow('内存不足，无法加载所有角色数据');

      process.memoryUsage = originalMemoryUsage;
    });
  });
});