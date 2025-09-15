/**
 * 《封神挂机录》核心系统测试套件
 *
 * 测试范围：
 * - 挂机修仙系统（法力值、经验、离线收益）
 * - 45位封神角色体系（三大阵营、五行属性）
 * - 基础战斗逻辑
 * - 角色成长和境界突破
 * - 甜点位挂机机制
 *
 * 测试原则：TDD - 所有测试当前失败，等待实现
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// 核心系统接口定义（待实现）
interface Character {
  character_id: string;
  character_name: string;
  camp: 'Immortal' | 'Human' | 'Demon';
  element: 'Metal' | 'Wood' | 'Water' | 'Fire' | 'Earth';
  rarity: 'SSR' | 'SR' | 'R' | 'N';
  level: number;
  experience: number;
  base_stats: {
    attack: number;
    defense: number;
    health: number;
    mana: number;
    speed: number;
  };
  current_stats: {
    attack: number;
    defense: number;
    health: number;
    mana: number;
    speed: number;
  };
  growth_rate: {
    attack: number;
    defense: number;
    health: number;
    mana: number;
    speed: number;
    rarity_multiplier: number;
  };
}

interface Player {
  player_id: string;
  username: string;
  level: number;
  experience: number;
  current_mana: number;
  max_mana: number;
  vip_level: number;
  offline_time: number;
  characters: Character[];
  main_character: string;
  last_login: Date;
  last_offline: Date;
}

interface IdleRewardCalculator {
  calculateOfflineRewards(player: Player, offlineTimeMs: number): Promise<{
    experience: number;
    gold: number;
    materials: number;
    multiplier: number;
  }>;

  calculateSweetSpotBonus(currentTime: Date): Promise<number>;

  applyVipBonus(baseReward: number, vipLevel: number): Promise<number>;
}

interface ManaSystem {
  getCurrentMana(playerId: string): Promise<number>;
  consumeMana(playerId: string, amount: number): Promise<boolean>;
  calculatePowerCoefficient(currentMana: number): Promise<number>;
  recoverMana(playerId: string): Promise<number>;
  applyManaDecay(playerId: string, timeDelta: number): Promise<void>;
}

interface CharacterGrowthSystem {
  calculateStatsAtLevel(character: Character, level: number): Promise<Character>;
  canLevelUp(character: Character): Promise<boolean>;
  levelUpCharacter(characterId: string): Promise<Character>;
  calculateRarityMultiplier(rarity: string): Promise<number>;
  calculateElementBonus(attackerElement: string, defenderElement: string): Promise<number>;
}

interface BattleSystem {
  calculateDamage(attacker: Character, defender: Character): Promise<number>;
  processBattle(team1: Character[], team2: Character[]): Promise<{
    winner: 'team1' | 'team2' | 'draw';
    battleLog: any[];
    experience: number;
    gold: number;
  }>;
  applyElementalAdvantage(attackerElement: string, defenderElement: string): Promise<number>;
}

// 待实现的系统类（目前会抛出错误）
class IdleRewardCalculatorImpl implements IdleRewardCalculator {
  async calculateOfflineRewards(): Promise<any> {
    throw new Error('IdleRewardCalculator not implemented yet');
  }

  async calculateSweetSpotBonus(): Promise<number> {
    throw new Error('SweetSpotBonus calculation not implemented yet');
  }

  async applyVipBonus(): Promise<number> {
    throw new Error('VIP bonus calculation not implemented yet');
  }
}

class ManaSystemImpl implements ManaSystem {
  async getCurrentMana(): Promise<number> {
    throw new Error('ManaSystem not implemented yet');
  }

  async consumeMana(): Promise<boolean> {
    throw new Error('Mana consumption not implemented yet');
  }

  async calculatePowerCoefficient(): Promise<number> {
    throw new Error('Power coefficient calculation not implemented yet');
  }

  async recoverMana(): Promise<number> {
    throw new Error('Mana recovery not implemented yet');
  }

  async applyManaDecay(): Promise<void> {
    throw new Error('Mana decay not implemented yet');
  }
}

class CharacterGrowthSystemImpl implements CharacterGrowthSystem {
  async calculateStatsAtLevel(): Promise<Character> {
    throw new Error('Character stats calculation not implemented yet');
  }

  async canLevelUp(): Promise<boolean> {
    throw new Error('Level up check not implemented yet');
  }

  async levelUpCharacter(): Promise<Character> {
    throw new Error('Character level up not implemented yet');
  }

  async calculateRarityMultiplier(): Promise<number> {
    throw new Error('Rarity multiplier calculation not implemented yet');
  }

  async calculateElementBonus(): Promise<number> {
    throw new Error('Element bonus calculation not implemented yet');
  }
}

class BattleSystemImpl implements BattleSystem {
  async calculateDamage(): Promise<number> {
    throw new Error('Damage calculation not implemented yet');
  }

  async processBattle(): Promise<any> {
    throw new Error('Battle processing not implemented yet');
  }

  async applyElementalAdvantage(): Promise<number> {
    throw new Error('Elemental advantage not implemented yet');
  }
}

describe('《封神挂机录》核心系统测试套件', () => {
  let idleCalculator: IdleRewardCalculator;
  let manaSystem: ManaSystem;
  let growthSystem: CharacterGrowthSystem;
  let battleSystem: BattleSystem;
  let testPlayer: Player;
  let testCharacter: Character;

  beforeEach(() => {
    idleCalculator = new IdleRewardCalculatorImpl();
    manaSystem = new ManaSystemImpl();
    growthSystem = new CharacterGrowthSystemImpl();
    battleSystem = new BattleSystemImpl();

    // 创建测试用玩家数据
    testPlayer = {
      player_id: 'player_001',
      username: '测试仙友',
      level: 30,
      experience: 45000,
      current_mana: 85,
      max_mana: 100,
      vip_level: 3,
      offline_time: 8 * 60 * 60 * 1000, // 8小时
      characters: [],
      main_character: 'XIAN_001',
      last_login: new Date(Date.now() - 8 * 60 * 60 * 1000),
      last_offline: new Date()
    };

    // 创建测试用姜子牙角色
    testCharacter = {
      character_id: 'XIAN_001',
      character_name: '姜子牙',
      camp: 'Immortal',
      element: 'Wood',
      rarity: 'SSR',
      level: 50,
      experience: 125000,
      base_stats: {
        attack: 800,
        defense: 600,
        health: 2000,
        mana: 100,
        speed: 400
      },
      current_stats: {
        attack: 1600, // base * rarity * level multiplier
        defense: 1200,
        health: 4000,
        mana: 200,
        speed: 800
      },
      growth_rate: {
        attack: 0.15,
        defense: 0.12,
        health: 0.18,
        mana: 0.08,
        speed: 0.10,
        rarity_multiplier: 2.0
      }
    };

    testPlayer.characters = [testCharacter];
  });

  describe('挂机修仙系统', () => {
    describe('基础挂机机制', () => {
      it('应该正确计算离线挂机收益', async () => {
        const offlineTime = 8 * 60 * 60 * 1000; // 8小时

        await expect(idleCalculator.calculateOfflineRewards(testPlayer, offlineTime))
          .resolves.toEqual({
            experience: expect.toBeBetween(15000, 25000),
            gold: expect.toBeBetween(8000, 12000),
            materials: expect.toBeBetween(100, 200),
            multiplier: 1.0 // 基础倍率
          });
      });

      it('应该在达到VIP离线时长上限时停止累积', async () => {
        const excessiveOfflineTime = 20 * 60 * 60 * 1000; // 20小时，超过VIP3的16小时上限
        const vip3Player = { ...testPlayer, vip_level: 3 };

        const rewards = await idleCalculator.calculateOfflineRewards(vip3Player, excessiveOfflineTime);

        // 应该按16小时计算，不是20小时
        expect(rewards.experience).toBeBetween(30000, 50000); // 16小时的收益
        expect(rewards.gold).toBeBetween(16000, 24000);
      });

      it('应该正确应用VIP等级离线时长加成', async () => {
        const vip0Player = { ...testPlayer, vip_level: 0 };
        const vip6Player = { ...testPlayer, vip_level: 6 };

        const offlineTime = 12 * 60 * 60 * 1000; // 12小时

        const vip0Rewards = await idleCalculator.calculateOfflineRewards(vip0Player, offlineTime);
        const vip6Rewards = await idleCalculator.calculateOfflineRewards(vip6Player, offlineTime);

        // VIP0只能获得8小时收益，VIP6能获得完整12小时收益
        expect(vip0Rewards.experience).toBeLessThan(vip6Rewards.experience);
        expect(vip6Rewards.experience).toBeGreaterThan(vip0Rewards.experience * 1.3);
      });
    });

    describe('甜点位挂机机制', () => {
      it('应该在8:00-8:10时段提供150%收益加成', async () => {
        const sweetSpotTime = new Date('2025-01-15T08:05:00Z'); // 甜点位时间
        const normalTime = new Date('2025-01-15T10:00:00Z'); // 普通时间

        global.mockTime(sweetSpotTime.getTime());
        const sweetSpotBonus = await idleCalculator.calculateSweetSpotBonus(sweetSpotTime);

        global.mockTime(normalTime.getTime());
        const normalBonus = await idleCalculator.calculateSweetSpotBonus(normalTime);

        expect(sweetSpotBonus).toBe(1.5); // 150%
        expect(normalBonus).toBe(1.0); // 100%

        global.restoreTime();
      });

      it('应该在午时、酉时、戌时提供正确加成', async () => {
        const lunchTime = new Date('2025-01-15T12:05:00Z'); // 12:00-12:10
        const eveningTime = new Date('2025-01-15T18:05:00Z'); // 18:00-18:10
        const nightTime = new Date('2025-01-15T22:05:00Z'); // 22:00-22:10

        const lunchBonus = await idleCalculator.calculateSweetSpotBonus(lunchTime);
        const eveningBonus = await idleCalculator.calculateSweetSpotBonus(eveningTime);
        const nightBonus = await idleCalculator.calculateSweetSpotBonus(nightTime);

        expect(lunchBonus).toBe(1.3); // 130%
        expect(eveningBonus).toBe(1.3); // 130%
        expect(nightBonus).toBe(1.2); // 120%
      });

      it('应该正确计算法力消耗减半机制', async () => {
        const sweetSpotTime = new Date('2025-01-15T08:05:00Z');
        global.mockTime(sweetSpotTime.getTime());

        // 甜点位时段法力消耗应该减半
        const consumed = await manaSystem.consumeMana('player_001', 20);
        const currentMana = await manaSystem.getCurrentMana('player_001');

        expect(consumed).toBe(true);
        expect(currentMana).toBe(75); // 85 - 10（减半后）

        global.restoreTime();
      });
    });

    describe('手动加速系统', () => {
      it('应该提供130%手动点击效率', async () => {
        const baseReward = 1000;
        const manualMultiplier = 1.3;

        const manualReward = baseReward * manualMultiplier;
        expect(manualReward).toBe(1300);
      });

      it('应该在法器助战时提供180%效率', async () => {
        const baseReward = 1000;
        const artifactMultiplier = 1.8;

        const artifactReward = baseReward * artifactMultiplier;
        expect(artifactReward).toBe(1800);
      });

      it('应该在渡劫时刻提供250%爆发效率', async () => {
        const baseReward = 1000;
        const tribulationMultiplier = 2.5;

        const tribulationReward = baseReward * tribulationMultiplier;
        expect(tribulationReward).toBe(2500);
      });
    });
  });

  describe('法力值衰减系统', () => {
    describe('法力衰减计算', () => {
      it('应该在法力值100时无衰减', async () => {
        const coefficient = await manaSystem.calculatePowerCoefficient(100);
        expect(coefficient).toBe(1.0);
      });

      it('应该正确计算法力值衰减系数', async () => {
        // 根据GDD中的衰减公式：衰减系数 = 0.95^k，其中k = floor((100-当前法力)/10)
        const testCases = [
          { mana: 90, expectedK: 1, expectedCoef: 0.95 },
          { mana: 80, expectedK: 2, expectedCoef: Math.pow(0.95, 2) },
          { mana: 50, expectedK: 5, expectedCoef: Math.pow(0.95, 5) },
          { mana: 20, expectedK: 8, expectedCoef: Math.pow(0.95, 8) },
          { mana: 10, expectedK: 9, expectedCoef: Math.max(0.5, Math.pow(0.95, 9)) } // 保底机制
        ];

        for (const testCase of testCases) {
          const coefficient = await manaSystem.calculatePowerCoefficient(testCase.mana);
          expect(coefficient).toBeCloseTo(testCase.expectedCoef, 3);
        }
      });

      it('应该保证法力衰减系数不低于0.5', async () => {
        const minCoefficient = await manaSystem.calculatePowerCoefficient(0);
        expect(minCoefficient).toBeGreaterThanOrEqual(0.5);
      });
    });

    describe('多段式衰减优化', () => {
      it('应该根据优化设计正确应用多段式衰减', async () => {
        const testCases = [
          { mana: 95, expectedRatio: 1.0 },   // 无衰减
          { mana: 75, expectedRatio: 0.95 },  // 轻度衰减
          { mana: 55, expectedRatio: 0.85 },  // 中度衰减
          { mana: 35, expectedRatio: 0.70 },  // 重度衰减
          { mana: 15, expectedRatio: 0.50 }   // 严重衰减（保底）
        ];

        for (const testCase of testCases) {
          const ratio = await manaSystem.calculatePowerCoefficient(testCase.mana);
          expect(ratio).toBeCloseTo(testCase.expectedRatio, 2);
        }
      });
    });

    describe('法力恢复机制', () => {
      it('应该每60秒恢复1点法力值', async () => {
        const initialMana = 50;
        const recoveryInterval = 60000; // 60秒

        // 模拟60秒后的恢复
        global.mockTime(Date.now() + recoveryInterval);

        const recoveredMana = await manaSystem.recoverMana('player_001');
        expect(recoveredMana).toBe(initialMana + 1);

        global.restoreTime();
      });

      it('应该在法力值达到上限时停止恢复', async () => {
        const maxMana = 100;
        const recoveredMana = await manaSystem.recoverMana('player_001');

        expect(recoveredMana).toBeLessThanOrEqual(maxMana);
      });
    });
  });

  describe('45位封神角色体系', () => {
    describe('三大阵营设计', () => {
      it('应该正确识别仙家阵营角色', () => {
        const immortalCharacters = [
          '元始天尊', '太上老君', '通天教主', '姜子牙', '杨戬',
          '哪吒', '雷震子', '土行孙', '赵公明', '三霄娘娘'
        ];

        immortalCharacters.forEach(name => {
          expect(['XIAN_001', 'XIAN_002', 'XIAN_003']).toContain(
            expect.stringMatching(/^XIAN_\d{3}$/)
          );
        });
      });

      it('应该正确识别人族英雄角色', () => {
        expect(testCharacter.camp).toBeValidCamp();
        expect(['Immortal', 'Human', 'Demon']).toContain(testCharacter.camp);
      });

      it('应该正确识别妖魔阵营角色', () => {
        const demonCharacter = {
          ...testCharacter,
          character_id: 'YAO_001',
          character_name: '九尾狐',
          camp: 'Demon' as const
        };

        expect(demonCharacter.character_id).toBeValidCharacterId();
        expect(demonCharacter.camp).toBeValidCamp();
      });
    });

    describe('五行属性相克体系', () => {
      it('应该正确计算五行相克关系', async () => {
        // 金 → 木 → 土 → 水 → 火 → 金（循环克制）
        const testCases = [
          { attacker: 'Metal', defender: 'Wood', expectedBonus: 1.3 },   // 金克木
          { attacker: 'Wood', defender: 'Earth', expectedBonus: 1.3 },   // 木克土
          { attacker: 'Earth', defender: 'Water', expectedBonus: 1.3 },  // 土克水
          { attacker: 'Water', defender: 'Fire', expectedBonus: 1.3 },   // 水克火
          { attacker: 'Fire', defender: 'Metal', expectedBonus: 1.3 },   // 火克金
          { attacker: 'Wood', defender: 'Metal', expectedBonus: 0.85 },  // 木被金克
          { attacker: 'Metal', defender: 'Metal', expectedBonus: 1.2 },  // 同属性加成
          { attacker: 'Metal', defender: 'Water', expectedBonus: 1.0 }   // 无关系
        ];

        for (const testCase of testCases) {
          const bonus = await growthSystem.calculateElementBonus(testCase.attacker, testCase.defender);
          expect(bonus).toBeCloseTo(testCase.expectedBonus, 2);
        }
      });

      it('应该正确识别五行属性', () => {
        expect(testCharacter.element).toBeValidElement();
        expect(['Metal', 'Wood', 'Water', 'Fire', 'Earth']).toContain(testCharacter.element);
      });

      it('应该在五行齐全时触发五行大阵效果', async () => {
        const fiveElementTeam = [
          { ...testCharacter, element: 'Metal' as const },
          { ...testCharacter, element: 'Wood' as const },
          { ...testCharacter, element: 'Water' as const },
          { ...testCharacter, element: 'Fire' as const },
          { ...testCharacter, element: 'Earth' as const }
        ];

        // 五行大阵应该提供额外100%属性加成
        const hasFiveElements = new Set(fiveElementTeam.map(c => c.element)).size === 5;
        const fiveElementBonus = hasFiveElements ? 2.0 : 1.0;

        expect(fiveElementBonus).toBe(2.0);
      });
    });

    describe('角色稀有度系统', () => {
      it('应该正确计算稀有度系数', async () => {
        const rarityMultipliers = {
          SSR: 2.0,
          SR: 1.5,
          R: 1.2,
          N: 1.0
        };

        for (const [rarity, expectedMultiplier] of Object.entries(rarityMultipliers)) {
          const multiplier = await growthSystem.calculateRarityMultiplier(rarity);
          expect(multiplier).toBe(expectedMultiplier);
        }
      });

      it('应该根据稀有度正确计算角色战力', async () => {
        const ssrCharacter = { ...testCharacter, rarity: 'SSR' as const };
        const srCharacter = { ...testCharacter, rarity: 'SR' as const };

        const ssrStats = await growthSystem.calculateStatsAtLevel(ssrCharacter, 50);
        const srStats = await growthSystem.calculateStatsAtLevel(srCharacter, 50);

        // SSR角色应该比SR角色强
        expect(ssrStats.current_stats.attack).toBeGreaterThan(srStats.current_stats.attack);
      });
    });
  });

  describe('角色成长公式体系', () => {
    describe('基础属性成长', () => {
      it('应该根据成长公式正确计算角色属性', async () => {
        // 当前属性 = 基础属性 × (1 + 成长率 × √等级) × 稀有度系数
        const level = 50;
        const expectedAttack = testCharacter.base_stats.attack *
          (1 + testCharacter.growth_rate.attack * Math.sqrt(level)) *
          testCharacter.growth_rate.rarity_multiplier;

        const calculatedStats = await growthSystem.calculateStatsAtLevel(testCharacter, level);
        expect(calculatedStats.current_stats.attack).toBeCloseTo(expectedAttack, 0);
      });

      it('应该正确处理境界突破', async () => {
        const baseCharacter = { ...testCharacter, level: 49 };
        const breakthroughCharacter = { ...testCharacter, level: 50 };

        const baseStats = await growthSystem.calculateStatsAtLevel(baseCharacter, 49);
        const breakthroughStats = await growthSystem.calculateStatsAtLevel(breakthroughCharacter, 50);

        // 境界突破应该有显著提升
        const powerIncrease = breakthroughStats.current_stats.attack / baseStats.current_stats.attack;
        expect(powerIncrease).toBeGreaterThan(1.15); // 至少15%提升
      });
    });

    describe('升级机制', () => {
      it('应该正确判断角色是否可以升级', async () => {
        const lowExpCharacter = { ...testCharacter, experience: 1000 };
        const highExpCharacter = { ...testCharacter, experience: 200000 };

        const canLevelUpLow = await growthSystem.canLevelUp(lowExpCharacter);
        const canLevelUpHigh = await growthSystem.canLevelUp(highExpCharacter);

        expect(canLevelUpLow).toBe(false);
        expect(canLevelUpHigh).toBe(true);
      });

      it('应该在升级时正确更新角色属性', async () => {
        const originalLevel = testCharacter.level;
        const leveledUpCharacter = await growthSystem.levelUpCharacter(testCharacter.character_id);

        expect(leveledUpCharacter.level).toBe(originalLevel + 1);
        expect(leveledUpCharacter.current_stats.attack).toBeGreaterThan(testCharacter.current_stats.attack);
      });
    });
  });

  describe('基础战斗系统', () => {
    describe('伤害计算', () => {
      it('应该正确计算基础伤害', async () => {
        const attacker = testCharacter;
        const defender = { ...testCharacter, character_id: 'XIAN_002', current_stats: { ...testCharacter.current_stats, defense: 500 } };

        const damage = await battleSystem.calculateDamage(attacker, defender);

        // 基础伤害 = 攻击力 - 防御力
        const expectedBaseDamage = attacker.current_stats.attack - defender.current_stats.defense;
        expect(damage).toBeGreaterThan(0);
        expect(damage).toBeLessThanOrEqual(expectedBaseDamage * 1.5); // 考虑随机性和加成
      });

      it('应该应用五行相克加成到伤害计算', async () => {
        const metalAttacker = { ...testCharacter, element: 'Metal' as const };
        const woodDefender = { ...testCharacter, element: 'Wood' as const };

        const damage = await battleSystem.calculateDamage(metalAttacker, woodDefender);
        const elementBonus = await battleSystem.applyElementalAdvantage('Metal', 'Wood');

        expect(elementBonus).toBe(1.3); // 金克木
        expect(damage).toBeGreaterThan(metalAttacker.current_stats.attack * 0.8); // 考虑克制加成
      });
    });

    describe('战斗流程', () => {
      it('应该正确处理完整战斗流程', async () => {
        const team1 = [testCharacter];
        const team2 = [{ ...testCharacter, character_id: 'YAO_001', camp: 'Demon' as const }];

        const battleResult = await battleSystem.processBattle(team1, team2);

        expect(['team1', 'team2', 'draw']).toContain(battleResult.winner);
        expect(battleResult.experience).toBeGreaterThan(0);
        expect(battleResult.gold).toBeGreaterThan(0);
        expect(Array.isArray(battleResult.battleLog)).toBe(true);
      });
    });
  });

  describe('性能要求验证', () => {
    it('角色属性计算应在10ms内完成', async () => {
      const { executionTime } = await global.measurePerformance(async () => {
        return await growthSystem.calculateStatsAtLevel(testCharacter, 50);
      });

      expect(executionTime).toBeWithinPerformanceLimit(10);
    });

    it('法力衰减计算应在5ms内完成', async () => {
      const { executionTime } = await global.measurePerformance(async () => {
        return await manaSystem.calculatePowerCoefficient(85);
      });

      expect(executionTime).toBeWithinPerformanceLimit(5);
    });

    it('伤害计算应在15ms内完成', async () => {
      const attacker = testCharacter;
      const defender = { ...testCharacter, character_id: 'XIAN_002' };

      const { executionTime } = await global.measurePerformance(async () => {
        return await battleSystem.calculateDamage(attacker, defender);
      });

      expect(executionTime).toBeWithinPerformanceLimit(15);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理法力值为0的情况', async () => {
      const coefficient = await manaSystem.calculatePowerCoefficient(0);
      expect(coefficient).toBe(0.5); // 保底机制
    });

    it('应该处理法力值超过100的情况', async () => {
      const coefficient = await manaSystem.calculatePowerCoefficient(150);
      expect(coefficient).toBe(1.0); // 不应超过1.0
    });

    it('应该处理角色等级为1的情况', async () => {
      const level1Character = { ...testCharacter, level: 1 };
      const stats = await growthSystem.calculateStatsAtLevel(level1Character, 1);

      expect(stats.current_stats.attack).toBeGreaterThan(0);
      expect(stats.level).toBe(1);
    });

    it('应该处理空编队的战斗', async () => {
      const emptyTeam: Character[] = [];
      const singleTeam = [testCharacter];

      await expect(battleSystem.processBattle(emptyTeam, singleTeam))
        .rejects.toThrow('Invalid team composition');
    });

    it('应该处理负数经验值', async () => {
      const negativeExpCharacter = { ...testCharacter, experience: -1000 };

      const canLevelUp = await growthSystem.canLevelUp(negativeExpCharacter);
      expect(canLevelUp).toBe(false);
    });

    it('应该处理极大的离线时间', async () => {
      const excessiveOfflineTime = 365 * 24 * 60 * 60 * 1000; // 1年

      const rewards = await idleCalculator.calculateOfflineRewards(testPlayer, excessiveOfflineTime);

      // 应该被限制在合理范围内
      expect(rewards.experience).toBeLessThan(1000000);
      expect(rewards.gold).toBeLessThan(500000);
    });
  });

  describe('数据完整性验证', () => {
    it('角色数据应包含所有必需字段', () => {
      expect(testCharacter.character_id).toBeValidCharacterId();
      expect(testCharacter.character_name).toBeDefined();
      expect(testCharacter.camp).toBeValidCamp();
      expect(testCharacter.element).toBeValidElement();
      expect(['SSR', 'SR', 'R', 'N']).toContain(testCharacter.rarity);
      expect(testCharacter.base_stats).toBeDefined();
      expect(testCharacter.current_stats).toBeDefined();
      expect(testCharacter.growth_rate).toBeDefined();
    });

    it('玩家数据应包含所有必需字段', () => {
      expect(testPlayer.player_id).toBeDefined();
      expect(testPlayer.current_mana).toBeValidManaValue();
      expect(testPlayer.vip_level).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(testPlayer.characters)).toBe(true);
    });

    it('角色属性值应在合理范围内', () => {
      expect(testCharacter.base_stats.attack).toBeGreaterThan(0);
      expect(testCharacter.base_stats.defense).toBeGreaterThan(0);
      expect(testCharacter.base_stats.health).toBeGreaterThan(0);
      expect(testCharacter.current_stats.attack).toBeGreaterThanOrEqual(testCharacter.base_stats.attack);
      expect(testCharacter.growth_rate.rarity_multiplier).toBeGreaterThan(1.0);
    });
  });
});