/**
 * 封神挂机录测试环境设置文件
 *
 * 此文件在所有测试运行前执行，用于：
 * - 配置测试环境
 * - 设置全局模拟
 * - 初始化测试数据库
 * - 配置超时和错误处理
 * - 封神主题专用测试工具
 */

import { performance } from 'perf_hooks';

// 扩展Jest匹配器 - 封神挂机录专用
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeBetween(min: number, max: number): R;
      toBeValidCharacterId(): R;
      toBeValidElement(): R;
      toBeValidCamp(): R;
      toBeValidManaValue(): R;
      toBeValidFormation(): R;
      toBeValidBondLevel(): R;
      toBeValidPvPScore(): R;
      toBeWithinPerformanceLimit(maxTime: number): R;
    }
  }
}

// 自定义Jest匹配器 - 封神挂机录专用
expect.extend({
  toBeBetween(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    if (pass) {
      return {
        message: () => `expected ${received} not to be between ${min} and ${max}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be between ${min} and ${max}`,
        pass: false,
      };
    }
  },

  toBeValidCharacterId(received: string) {
    // 封神角色ID格式：XIAN_001, REN_001, YAO_001
    const characterIdPattern = /^(XIAN|REN|YAO)_\d{3}$/;
    const pass = characterIdPattern.test(received);

    return {
      message: () => pass
        ? `expected ${received} not to be a valid character ID`
        : `expected ${received} to be a valid character ID (format: XIAN_001, REN_001, YAO_001)`,
      pass,
    };
  },

  toBeValidElement(received: string) {
    const validElements = ['Metal', 'Wood', 'Water', 'Fire', 'Earth'];
    const pass = validElements.includes(received);

    return {
      message: () => pass
        ? `expected ${received} not to be a valid element`
        : `expected ${received} to be a valid element (Metal/Wood/Water/Fire/Earth)`,
      pass,
    };
  },

  toBeValidCamp(received: string) {
    const validCamps = ['Immortal', 'Human', 'Demon'];
    const pass = validCamps.includes(received);

    return {
      message: () => pass
        ? `expected ${received} not to be a valid camp`
        : `expected ${received} to be a valid camp (Immortal/Human/Demon)`,
      pass,
    };
  },

  toBeValidManaValue(received: number) {
    const pass = received >= 0 && received <= 100 && Number.isInteger(received);

    return {
      message: () => pass
        ? `expected ${received} not to be a valid mana value`
        : `expected ${received} to be a valid mana value (0-100 integer)`,
      pass,
    };
  },

  toBeValidFormation(received: any) {
    const isArray = Array.isArray(received);
    const hasCorrectLength = isArray && received.length === 5;
    const hasUniqueCharacters = isArray && new Set(received).size === received.length;

    const pass = isArray && hasCorrectLength && hasUniqueCharacters;

    return {
      message: () => {
        if (!isArray) return `expected formation to be an array`;
        if (!hasCorrectLength) return `expected formation to have exactly 5 characters, got ${received.length}`;
        if (!hasUniqueCharacters) return `expected formation to have unique characters, found duplicates`;
        return `expected formation to be invalid`;
      },
      pass,
    };
  },

  toBeValidBondLevel(received: string) {
    const validLevels = ['Legend', 'Myth', 'Epic', 'Rare'];
    const pass = validLevels.includes(received);

    return {
      message: () => pass
        ? `expected ${received} not to be a valid bond level`
        : `expected ${received} to be a valid bond level (Legend/Myth/Epic/Rare)`,
      pass,
    };
  },

  toBeValidPvPScore(received: number) {
    const pass = received >= 0 && Number.isInteger(received);

    return {
      message: () => pass
        ? `expected ${received} not to be a valid PvP score`
        : `expected ${received} to be a valid PvP score (non-negative integer)`,
      pass,
    };
  },

  toBeWithinPerformanceLimit(received: number, maxTime: number) {
    const pass = received <= maxTime;

    return {
      message: () => pass
        ? `expected ${received}ms not to be within performance limit of ${maxTime}ms`
        : `expected ${received}ms to be within performance limit of ${maxTime}ms`,
      pass,
    };
  }
});

// 全局测试配置
beforeAll(async () => {
  console.log('🎮 初始化封神挂机录测试环境...');

  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'sqlite://test.db';
  process.env.REDIS_URL = 'redis://localhost:6379/1';

  // 模拟时间函数（用于测试时间相关功能）
  global.mockTime = (timestamp: number) => {
    jest.spyOn(Date, 'now').mockReturnValue(timestamp);
  };

  global.restoreTime = () => {
    jest.restoreAllMocks();
  };

  // 性能测试辅助函数
  global.measurePerformance = async (fn: () => Promise<any>) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return {
      result,
      executionTime: end - start
    };
  };

  console.log('✅ 封神挂机录测试环境初始化完成');
});

afterAll(async () => {
  console.log('🧹 清理测试环境...');

  // 恢复所有模拟
  jest.restoreAllMocks();

  // 清理测试数据
  // await cleanupTestDatabase();

  console.log('✅ 测试环境清理完成');
});

// 每个测试前的通用设置
beforeEach(() => {
  // 重置控制台警告/错误计数
  jest.clearAllMocks();
});

// 每个测试后的通用清理
afterEach(() => {
  // 恢复时间模拟
  if (jest.isMockFunction(Date.now)) {
    Date.now.mockRestore();
  }
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('测试中发现未处理的Promise拒绝:', reason);
  throw reason;
});

// 封神挂机录测试工具函数
global.testUtils = {
  // 创建测试用封神角色数据
  createTestCharacter: (overrides = {}) => ({
    character_id: 'XIAN_001',
    character_name: '姜子牙',
    camp: 'Immortal',
    element: 'Wood',
    rarity: 'SSR',
    base_attack: 800,
    base_defense: 600,
    base_health: 2000,
    base_mana: 100,
    base_speed: 400,
    growth_rate: {
      attack: 0.15,
      defense: 0.12,
      health: 0.18,
      mana: 0.08,
      speed: 0.10,
      rarity_multiplier: 2.0
    },
    backstory: '封神演义第一军师，昆仑山玉虚宫元始天尊座下弟子。',
    ...overrides
  }),

  // 创建测试用编队
  createTestFormation: () => ({
    formation_id: 'TEST_FORMATION_001',
    player_id: 'TEST_PLAYER_001',
    formation_name: '封神试验编队',
    position_1: 'XIAN_001', // 姜子牙
    position_2: 'XIAN_002', // 杨戬
    position_3: 'XIAN_003', // 哪吒
    position_4: 'REN_001',  // 黄飞虎
    position_5: 'DEMON_001', // 九尾狐
    total_power: 25000,
    active_bonds: ['师徒情深', '父子同心']
  }),

  // 创建测试用羁绊技能
  createTestBond: (overrides = {}) => ({
    bond_id: 'TEST_BOND_001',
    bond_name: '师徒情深',
    bond_level: 'Legend',
    required_characters: ['XIAN_001', 'XIAN_002'], // 姜子牙+杨戬
    min_character_level: 50,
    friendship_level: 80,
    special_item: '封神榜',
    bond_effects: {
      damage_multiplier: 2.0,
      special_effect: '封神榜召唤',
      cooldown: 45000,
      description: '全屏范围神力降临，伤害+200%'
    },
    skill_animation: 'fengshen_summon',
    ...overrides
  }),

  // 创建测试用宗门数据
  createTestSect: (overrides = {}) => ({
    sect_id: 'TEST_SECT_001',
    sect_name: '测试昆仑派',
    sect_level: 3,
    leader_id: 'TEST_PLAYER_001',
    member_count: 25,
    max_members: 30,
    sect_power: 500000,
    sect_resources: {
      gold: 100000,
      materials: 5000,
      contribution: 25000
    },
    buildings: {
      main_hall: 3,
      library: 2,
      alchemy_room: 2,
      training_ground: 1,
      prayer_altar: 2,
      teleport_array: 1
    },
    active_score: 85,
    ...overrides
  }),

  // 创建测试用PvP战场数据
  createTestBattlefield: (overrides = {}) => ({
    battlefield_id: 'TEST_BATTLEFIELD_001',
    battle_type: 'Weekly',
    participating_sects: Array.from({length: 20}, (_, i) => `SECT_${String(i+1).padStart(3, '0')}`),
    map_layout: {
      size: 120,
      control_points: {
        main_halls: 9,
        gold_veins: 18,
        silver_veins: 36,
        copper_veins: 57
      }
    },
    control_points: {},
    battle_duration: 3600, // 1小时
    current_scores: {},
    battle_status: 'Preparing',
    ...overrides
  }),

  // 创建测试用法力值数据
  createTestManaData: (overrides = {}) => ({
    player_id: 'TEST_PLAYER_001',
    current_mana: 85,
    mana_recovery_rate: 1.0,
    mana_consumption_log: [],
    power_coefficient: 0.9025, // 85法力对应的系数
    base_power: 10000,
    effective_power: 9025, // 基础战力 * 系数
    last_update_time: new Date(),
    ...overrides
  }),

  // 等待异步操作完成
  waitFor: (condition: () => boolean, timeout = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`等待条件超时 (${timeout}ms)`));
        } else {
          setTimeout(check, 100);
        }
      };

      check();
    });
  },

  // 模拟延迟
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // 生成随机测试数据
  randomInt: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  randomString: (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // 计算法力值衰减系数
  calculatePowerCoefficient: (currentMana: number): number => {
    if (currentMana >= 100) return 1.0;
    const k = Math.floor((100 - currentMana) / 10);
    return Math.max(0.5, Math.pow(0.95, k));
  },

  // 生成随机五行属性
  randomElement: (): string => {
    const elements = ['Metal', 'Wood', 'Water', 'Fire', 'Earth'];
    return elements[Math.floor(Math.random() * elements.length)];
  },

  // 生成随机阵营
  randomCamp: (): string => {
    const camps = ['Immortal', 'Human', 'Demon'];
    return camps[Math.floor(Math.random() * camps.length)];
  }
};

console.log('🧪 封神挂机录测试设置文件加载完成');