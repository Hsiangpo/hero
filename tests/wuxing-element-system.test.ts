/**
 * 《封神挂机录》五行相克系统测试套件
 *
 * 测试覆盖范围：
 * 1. 五行循环克制关系（金→木→土→水→火→金的完整循环）
 * 2. 克制伤害计算机制（+30%克制伤害，-15%被克伤害）
 * 3. 同属性技能加成（+20%威力，+25%配合效果）
 * 4. 五行大阵终极效果（五行齐全时的特殊加成）
 * 5. 角色五行属性分配（45个角色的五行平衡性）
 * 6. 战斗伤害计算验证（实际伤害输出的准确性）
 * 7. 边界条件测试（无效属性、空值、异常输入处理）
 * 8. 平衡性验证（无绝对强势属性，策略多样性）
 *
 * 注意：所有测试当前应为失败状态，因为实现代码尚未存在（TDD原则）
 */

import './setup';

describe('封神挂机录 - 五行相克系统', () => {

  describe('五行循环克制关系', () => {

    describe('基础克制关系验证', () => {

      it('应该正确定义金→木→土→水→火→金的循环克制', () => {
        const elementSystem = ElementSystem.getElementRelations();

        // 验证完整的五行克制循环
        expect(elementSystem.Metal.defeats).toBe('Wood');
        expect(elementSystem.Wood.defeats).toBe('Earth');
        expect(elementSystem.Earth.defeats).toBe('Water');
        expect(elementSystem.Water.defeats).toBe('Fire');
        expect(elementSystem.Fire.defeats).toBe('Metal');

        // 验证被克制关系
        expect(elementSystem.Metal.defeated_by).toBe('Fire');
        expect(elementSystem.Wood.defeated_by).toBe('Metal');
        expect(elementSystem.Earth.defeated_by).toBe('Wood');
        expect(elementSystem.Water.defeated_by).toBe('Earth');
        expect(elementSystem.Fire.defeated_by).toBe('Water');
      });

      it('应该验证五行克制关系的对称性', () => {
        const elements = ['Metal', 'Wood', 'Earth', 'Water', 'Fire'];

        elements.forEach(element => {
          const defeatedElement = ElementSystem.getDefeatedElement(element);
          const counterElement = ElementSystem.getCounterElement(defeatedElement);

          expect(counterElement).toBe(element);
        });
      });

      it('应该正确识别克制关系类型', () => {
        // 克制关系
        expect(ElementSystem.getRelationType('Metal', 'Wood')).toBe('defeats');
        expect(ElementSystem.getRelationType('Water', 'Fire')).toBe('defeats');
        expect(ElementSystem.getRelationType('Earth', 'Water')).toBe('defeats');

        // 被克关系
        expect(ElementSystem.getRelationType('Wood', 'Metal')).toBe('defeated_by');
        expect(ElementSystem.getRelationType('Fire', 'Water')).toBe('defeated_by');

        // 同属性
        expect(ElementSystem.getRelationType('Fire', 'Fire')).toBe('same_element');
        expect(ElementSystem.getRelationType('Metal', 'Metal')).toBe('same_element');

        // 无关系
        expect(ElementSystem.getRelationType('Metal', 'Water')).toBe('neutral');
        expect(ElementSystem.getRelationType('Wood', 'Fire')).toBe('neutral');
      });

      it('应该拒绝无效的五行属性', () => {
        expect(() => ElementSystem.getRelationType('Metal', 'Lightning')).toThrow('无效的五行属性');
        expect(() => ElementSystem.getRelationType('Ice', 'Fire')).toThrow('无效的五行属性');
        expect(() => ElementSystem.getRelationType('Metal', null)).toThrow('五行属性不能为空');
        expect(() => ElementSystem.getRelationType('Metal', '')).toThrow('五行属性不能为空');
      });
    });

    describe('五行属性验证工具', () => {

      it('应该正确验证有效的五行属性', () => {
        const validElements = ['Metal', 'Wood', 'Water', 'Fire', 'Earth'];

        validElements.forEach(element => {
          expect(element).toBeValidElement();
          expect(ElementSystem.isValidElement(element)).toBe(true);
        });
      });

      it('应该拒绝无效的五行属性', () => {
        const invalidElements = ['Air', 'Lightning', 'Ice', 'Shadow', 'Light', null, undefined, ''];

        invalidElements.forEach(element => {
          expect(ElementSystem.isValidElement(element)).toBe(false);
        });
      });

      it('应该支持大小写不敏感的属性验证', () => {
        const mixedCaseElements = ['metal', 'WOOD', 'WaTeR', 'fIrE', 'earth'];

        mixedCaseElements.forEach(element => {
          expect(ElementSystem.normalizeElement(element)).toBeValidElement();
        });

        expect(ElementSystem.normalizeElement('metal')).toBe('Metal');
        expect(ElementSystem.normalizeElement('FIRE')).toBe('Fire');
      });
    });
  });

  describe('克制伤害计算机制', () => {

    describe('基础伤害计算', () => {

      it('应该对克制关系应用30%伤害加成', () => {
        const attacker = global.testUtils.createTestCharacter({
          character_name: '杨戬',
          element: 'Metal',
          base_attack: 1000
        });

        const defender = global.testUtils.createTestCharacter({
          character_name: '申公豹',
          element: 'Wood', // 被金克制
          base_defense: 500
        });

        const damageResult = CombatSystem.calculateElementalDamage(attacker, defender, 1000);

        // 基础伤害1000，克制加成30% = 1300
        expect(damageResult.baseDamage).toBe(1000);
        expect(damageResult.elementalMultiplier).toBe(1.3);
        expect(damageResult.finalDamage).toBe(1300);
        expect(damageResult.relationship).toBe('defeats');
      });

      it('应该对被克关系应用15%伤害减免', () => {
        const attacker = global.testUtils.createTestCharacter({
          character_name: '申公豹',
          element: 'Wood',
          base_attack: 1000
        });

        const defender = global.testUtils.createTestCharacter({
          character_name: '杨戬',
          element: 'Metal', // 克制木系
          base_defense: 500
        });

        const damageResult = CombatSystem.calculateElementalDamage(attacker, defender, 1000);

        // 基础伤害1000，被克减免15% = 850
        expect(damageResult.baseDamage).toBe(1000);
        expect(damageResult.elementalMultiplier).toBe(0.85);
        expect(damageResult.finalDamage).toBe(850);
        expect(damageResult.relationship).toBe('defeated_by');
      });

      it('应该对同属性应用20%技能威力加成', () => {
        const attacker = global.testUtils.createTestCharacter({
          character_name: '哪吒',
          element: 'Fire'
        });

        const defender = global.testUtils.createTestCharacter({
          character_name: '红孩儿',
          element: 'Fire' // 同属性
        });

        const damageResult = CombatSystem.calculateElementalDamage(attacker, defender, 1000);

        expect(damageResult.baseDamage).toBe(1000);
        expect(damageResult.elementalMultiplier).toBe(1.2); // 同属性20%加成
        expect(damageResult.finalDamage).toBe(1200);
        expect(damageResult.relationship).toBe('same_element');
      });

      it('应该对无关系属性保持原始伤害', () => {
        const attacker = global.testUtils.createTestCharacter({
          character_name: '杨戬',
          element: 'Metal'
        });

        const defender = global.testUtils.createTestCharacter({
          character_name: '龙王',
          element: 'Water' // 金与水无直接克制关系
        });

        const damageResult = CombatSystem.calculateElementalDamage(attacker, defender, 1000);

        expect(damageResult.baseDamage).toBe(1000);
        expect(damageResult.elementalMultiplier).toBe(1.0); // 无加成或减免
        expect(damageResult.finalDamage).toBe(1000);
        expect(damageResult.relationship).toBe('neutral');
      });
    });

    describe('复杂伤害计算', () => {

      it('应该正确处理多重伤害修正', () => {
        const attacker = global.testUtils.createTestCharacter({
          element: 'Fire',
          base_attack: 1000,
          level: 50,
          criticalRate: 0.25,
          criticalDamage: 1.5
        });

        const defender = global.testUtils.createTestCharacter({
          element: 'Metal', // 火克金
          base_defense: 400,
          level: 50
        });

        const damageResult = CombatSystem.calculateCompleteDamage(attacker, defender);

        // 验证计算步骤
        expect(damageResult.baseAttack).toBe(1000);
        expect(damageResult.elementalMultiplier).toBe(1.3); // 火克金
        expect(damageResult.levelModifier).toBeGreaterThan(1); // 等级修正
        expect(damageResult.defenseReduction).toBeLessThan(1); // 防御减免

        // 最终伤害应该考虑所有因素
        expect(damageResult.finalDamage).toBeGreaterThan(1300);
      });

      it('应该处理暴击与五行相克的叠加', () => {
        const attacker = global.testUtils.createTestCharacter({
          element: 'Water',
          base_attack: 1000
        });

        const defender = global.testUtils.createTestCharacter({
          element: 'Fire' // 水克火
        });

        // 强制触发暴击
        const criticalDamage = CombatSystem.calculateElementalDamage(attacker, defender, 1000, {
          forceCritical: true,
          criticalMultiplier: 2.0
        });

        // 水克火(1.3倍) × 暴击(2.0倍) = 2.6倍
        expect(criticalDamage.elementalMultiplier).toBe(1.3);
        expect(criticalDamage.criticalMultiplier).toBe(2.0);
        expect(criticalDamage.finalDamage).toBe(2600);
      });

      it('应该限制伤害修正的极端值', () => {
        const attacker = global.testUtils.createTestCharacter({
          element: 'Metal',
          base_attack: 999999 // 极高攻击力
        });

        const defender = global.testUtils.createTestCharacter({
          element: 'Wood',
          base_defense: 1 // 极低防御
        });

        const damageResult = CombatSystem.calculateElementalDamage(attacker, defender, 999999);

        // 即使是克制关系，伤害也应该有合理上限
        expect(damageResult.finalDamage).toBeLessThan(Number.MAX_SAFE_INTEGER);
        expect(damageResult.finalDamage).toBeGreaterThan(0);
      });
    });
  });

  describe('同属性技能加成系统', () => {

    describe('技能威力加成', () => {

      it('应该为同属性角色技能提供20%威力加成', () => {
        const fireCharacter = global.testUtils.createTestCharacter({
          character_name: '哪吒',
          element: 'Fire'
        });

        const fireSkill = {
          skillId: 'fire_spear_attack',
          element: 'Fire',
          baseDamage: 1500,
          caster: fireCharacter
        };

        const skillResult = SkillSystem.calculateSkillDamage(fireSkill);

        expect(skillResult.baseDamage).toBe(1500);
        expect(skillResult.elementalBonus).toBe(0.2); // 20%同属性加成
        expect(skillResult.finalDamage).toBe(1800); // 1500 * 1.2
      });

      it('应该为跨属性技能保持原威力', () => {
        const metalCharacter = global.testUtils.createTestCharacter({
          character_name: '杨戬',
          element: 'Metal'
        });

        const waterSkill = {
          skillId: 'water_wave_attack',
          element: 'Water', // 与角色属性不符
          baseDamage: 1500,
          caster: metalCharacter
        };

        const skillResult = SkillSystem.calculateSkillDamage(waterSkill);

        expect(skillResult.baseDamage).toBe(1500);
        expect(skillResult.elementalBonus).toBe(0); // 无同属性加成
        expect(skillResult.finalDamage).toBe(1500);
      });

      it('应该支持技能属性与角色属性的验证', () => {
        const character = global.testUtils.createTestCharacter({
          element: 'Earth'
        });

        const validSkill = { element: 'Earth', caster: character };
        const invalidSkill = { element: 'Lightning', caster: character };

        expect(SkillSystem.validateSkillElement(validSkill)).toBe(true);
        expect(SkillSystem.validateSkillElement(invalidSkill)).toBe(false);
      });
    });

    describe('配合效果加成', () => {

      it('应该为同属性角色配合提供25%效果加成', () => {
        const fireTeam = [
          global.testUtils.createTestCharacter({ element: 'Fire', character_name: '哪吒' }),
          global.testUtils.createTestCharacter({ element: 'Fire', character_name: '红孩儿' }),
          global.testUtils.createTestCharacter({ element: 'Fire', character_name: '火德星君' })
        ];

        const cooperationResult = TeamSystem.calculateCooperationBonus(fireTeam);

        expect(cooperationResult.sameElementCount).toBe(3);
        expect(cooperationResult.cooperationMultiplier).toBe(1.25); // 25%配合加成
        expect(cooperationResult.teamElement).toBe('Fire');
      });

      it('应该计算混合属性队伍的配合效果', () => {
        const mixedTeam = [
          global.testUtils.createTestCharacter({ element: 'Metal' }),
          global.testUtils.createTestCharacter({ element: 'Metal' }),
          global.testUtils.createTestCharacter({ element: 'Wood' }),
          global.testUtils.createTestCharacter({ element: 'Water' }),
          global.testUtils.createTestCharacter({ element: 'Fire' })
        ];

        const cooperationResult = TeamSystem.calculateCooperationBonus(mixedTeam);

        // 只有2个金系角色有配合，其他没有
        expect(cooperationResult.metalCooperation).toBe(1.25);
        expect(cooperationResult.overallCooperation).toBe(1.05); // 略微加成
      });

      it('应该处理单一角色无配合情况', () => {
        const soloCharacter = [
          global.testUtils.createTestCharacter({ element: 'Earth' })
        ];

        const cooperationResult = TeamSystem.calculateCooperationBonus(soloCharacter);

        expect(cooperationResult.sameElementCount).toBe(1);
        expect(cooperationResult.cooperationMultiplier).toBe(1.0); // 无配合加成
      });
    });
  });

  describe('五行大阵终极效果', () => {

    describe('五行齐全检测', () => {

      it('应该正确检测五行齐全的队伍', () => {
        const fullElementTeam = [
          global.testUtils.createTestCharacter({ element: 'Metal' }),
          global.testUtils.createTestCharacter({ element: 'Wood' }),
          global.testUtils.createTestCharacter({ element: 'Water' }),
          global.testUtils.createTestCharacter({ element: 'Fire' }),
          global.testUtils.createTestCharacter({ element: 'Earth' })
        ];

        const elementCheck = FormationSystem.checkAllElementsPresent(fullElementTeam);

        expect(elementCheck.hasAllElements).toBe(true);
        expect(elementCheck.elementTypes).toHaveLength(5);
        expect(elementCheck.elementTypes).toContain('Metal');
        expect(elementCheck.elementTypes).toContain('Wood');
        expect(elementCheck.elementTypes).toContain('Water');
        expect(elementCheck.elementTypes).toContain('Fire');
        expect(elementCheck.elementTypes).toContain('Earth');
      });

      it('应该检测缺失五行的队伍', () => {
        const incompleteTeam = [
          global.testUtils.createTestCharacter({ element: 'Metal' }),
          global.testUtils.createTestCharacter({ element: 'Metal' }),
          global.testUtils.createTestCharacter({ element: 'Wood' }),
          global.testUtils.createTestCharacter({ element: 'Water' }),
          global.testUtils.createTestCharacter({ element: 'Fire' })
          // 缺少土系
        ];

        const elementCheck = FormationSystem.checkAllElementsPresent(incompleteTeam);

        expect(elementCheck.hasAllElements).toBe(false);
        expect(elementCheck.elementTypes).toHaveLength(4);
        expect(elementCheck.missingElements).toContain('Earth');
      });

      it('应该处理重复属性的队伍', () => {
        const duplicateTeam = [
          global.testUtils.createTestCharacter({ element: 'Fire' }),
          global.testUtils.createTestCharacter({ element: 'Fire' }),
          global.testUtils.createTestCharacter({ element: 'Fire' }),
          global.testUtils.createTestCharacter({ element: 'Fire' }),
          global.testUtils.createTestCharacter({ element: 'Fire' })
        ];

        const elementCheck = FormationSystem.checkAllElementsPresent(duplicateTeam);

        expect(elementCheck.hasAllElements).toBe(false);
        expect(elementCheck.elementTypes).toHaveLength(1);
        expect(elementCheck.dominantElement).toBe('Fire');
        expect(elementCheck.missingElements).toHaveLength(4);
      });
    });

    describe('五行大阵效果计算', () => {

      it('应该为五行齐全队伍提供100%属性加成', () => {
        const fullElementTeam = [
          global.testUtils.createTestCharacter({ element: 'Metal', base_attack: 1000 }),
          global.testUtils.createTestCharacter({ element: 'Wood', base_attack: 1000 }),
          global.testUtils.createTestCharacter({ element: 'Water', base_attack: 1000 }),
          global.testUtils.createTestCharacter({ element: 'Fire', base_attack: 1000 }),
          global.testUtils.createTestCharacter({ element: 'Earth', base_attack: 1000 })
        ];

        const formationBonus = FormationSystem.calculateFiveElementFormation(fullElementTeam);

        expect(formationBonus.active).toBe(true);
        expect(formationBonus.attributeMultiplier).toBe(2.0); // 100%加成 = 2倍
        expect(formationBonus.formationType).toBe('五行大阵');

        // 验证每个角色都获得加成
        formationBonus.enhancedTeam.forEach(character => {
          expect(character.finalAttack).toBe(2000); // 1000 * 2.0
        });
      });

      it('应该计算五行大阵的特殊技能效果', () => {
        const fullElementTeam = [
          global.testUtils.createTestCharacter({ element: 'Metal' }),
          global.testUtils.createTestCharacter({ element: 'Wood' }),
          global.testUtils.createTestCharacter({ element: 'Water' }),
          global.testUtils.createTestCharacter({ element: 'Fire' }),
          global.testUtils.createTestCharacter({ element: 'Earth' })
        ];

        const ultimateSkill = FormationSystem.activateFiveElementUltimate(fullElementTeam);

        expect(ultimateSkill.skillName).toBe('五行轮回大阵');
        expect(ultimateSkill.damageMultiplier).toBe(5.0); // 5倍伤害
        expect(ultimateSkill.specialEffects).toContain('全屏攻击');
        expect(ultimateSkill.specialEffects).toContain('五行轮回');
        expect(ultimateSkill.cooldown).toBe(120000); // 2分钟冷却
      });

      it('应该为不完整五行阵容计算部分加成', () => {
        const partialTeam = [
          global.testUtils.createTestCharacter({ element: 'Metal' }),
          global.testUtils.createTestCharacter({ element: 'Wood' }),
          global.testUtils.createTestCharacter({ element: 'Water' }),
          global.testUtils.createTestCharacter({ element: 'Fire' })
          // 缺少土系
        ];

        const formationBonus = FormationSystem.calculateElementFormation(partialTeam);

        expect(formationBonus.active).toBe(false); // 五行大阵未激活
        expect(formationBonus.partialBonus).toBe(1.2); // 4个不同属性，20%加成
        expect(formationBonus.missingForComplete).toBe(1);
      });
    });

    describe('五行大阵条件验证', () => {

      it('应该要求所有角色达到最低等级', () => {
        const lowLevelTeam = [
          global.testUtils.createTestCharacter({ element: 'Metal', level: 20 }),
          global.testUtils.createTestCharacter({ element: 'Wood', level: 25 }),
          global.testUtils.createTestCharacter({ element: 'Water', level: 15 }), // 低于要求
          global.testUtils.createTestCharacter({ element: 'Fire', level: 30 }),
          global.testUtils.createTestCharacter({ element: 'Earth', level: 22 })
        ];

        const formationCheck = FormationSystem.validateFiveElementFormation(lowLevelTeam, {
          minimumLevel: 20
        });

        expect(formationCheck.eligible).toBe(false);
        expect(formationCheck.reason).toBe('部分角色等级不足');
        expect(formationCheck.ineligibleCharacters).toHaveLength(1);
      });

      it('应该验证角色之间的羁绊条件', () => {
        const fullElementTeam = [
          global.testUtils.createTestCharacter({ element: 'Metal' }),
          global.testUtils.createTestCharacter({ element: 'Wood' }),
          global.testUtils.createTestCharacter({ element: 'Water' }),
          global.testUtils.createTestCharacter({ element: 'Fire' }),
          global.testUtils.createTestCharacter({ element: 'Earth' })
        ];

        const bondRequirement = {
          requiredBonds: ['五行相生', '天地和谐'],
          minimumBondLevel: 3
        };

        const formationCheck = FormationSystem.validateFiveElementFormation(fullElementTeam, bondRequirement);

        // 如果缺少必要羁绊，五行大阵可能无法完全激活
        if (!formationCheck.hasRequiredBonds) {
          expect(formationCheck.reducedEffectiveness).toBe(0.8); // 效果降至80%
        }
      });
    });
  });

  describe('角色五行属性分配', () => {

    describe('属性分配平衡性', () => {

      it('应该确保45个角色的五行分配相对均衡', () => {
        const allCharacters = CharacterSystem.getAllCharacters();
        const elementDistribution = {};

        // 统计每个五行属性的角色数量
        allCharacters.forEach(character => {
          const element = character.element;
          elementDistribution[element] = (elementDistribution[element] || 0) + 1;
        });

        // 验证五行分配的平衡性
        const counts = Object.values(elementDistribution);
        const averageCount = 45 / 5; // 平均每个属性9个角色
        const tolerance = 3; // 允许±3的偏差

        counts.forEach(count => {
          expect(count).toBeBetween(averageCount - tolerance, averageCount + tolerance);
        });

        // 验证所有五行都有角色
        expect(Object.keys(elementDistribution)).toHaveLength(5);
      });

      it('应该验证特定角色群体的五行设定', () => {
        // 验证金系角色符合设定
        const metalCharacters = CharacterSystem.getCharactersByElement('Metal');
        const expectedMetalCharacters = ['杨戬', '李靖', '黄飞虎'];

        expectedMetalCharacters.forEach(name => {
          const character = metalCharacters.find(c => c.character_name === name);
          expect(character).toBeDefined();
          expect(character.element).toBe('Metal');
        });

        // 验证火系角色符合设定
        const fireCharacters = CharacterSystem.getCharactersByElement('Fire');
        const expectedFireCharacters = ['哪吒', '红孩儿', '火德星君'];

        expectedFireCharacters.forEach(name => {
          const character = fireCharacters.find(c => c.character_name === name);
          expect(character).toBeDefined();
          expect(character.element).toBe('Fire');
        });
      });

      it('应该确保每个阵营都有五行覆盖', () => {
        const camps = ['Immortal', 'Human', 'Demon'];

        camps.forEach(camp => {
          const campCharacters = CharacterSystem.getCharactersByCamp(camp);
          const campElements = [...new Set(campCharacters.map(c => c.element))];

          // 每个阵营应该有至少4个不同的五行属性
          expect(campElements.length).toBeGreaterThanOrEqual(4);
        });
      });
    });

    describe('五行属性的战术意义', () => {

      it('应该为每个五行属性定义明确的战术特色', () => {
        const elementCharacteristics = ElementSystem.getElementCharacteristics();

        expect(elementCharacteristics.Metal.style).toBe('刚猛型');
        expect(elementCharacteristics.Metal.traits).toContain('高攻击');
        expect(elementCharacteristics.Metal.traits).toContain('锐利');

        expect(elementCharacteristics.Wood.style).toBe('成长型');
        expect(elementCharacteristics.Wood.traits).toContain('恢复能力');
        expect(elementCharacteristics.Wood.traits).toContain('持续成长');

        expect(elementCharacteristics.Water.style).toBe('法术型');
        expect(elementCharacteristics.Water.traits).toContain('法术强化');
        expect(elementCharacteristics.Water.traits).toContain('流动性');

        expect(elementCharacteristics.Fire.style).toBe('爆发型');
        expect(elementCharacteristics.Fire.traits).toContain('高爆发');
        expect(elementCharacteristics.Fire.traits).toContain('瞬间输出');

        expect(elementCharacteristics.Earth.style).toBe('防御型');
        expect(elementCharacteristics.Earth.traits).toContain('高防御');
        expect(elementCharacteristics.Earth.traits).toContain('稳定性');
      });

      it('应该根据五行特色调整角色基础属性倾向', () => {
        // 金系角色应该攻击力倾向更高
        const metalCharacters = CharacterSystem.getCharactersByElement('Metal');
        const metalAvgAttack = metalCharacters.reduce((sum, c) => sum + c.base_attack, 0) / metalCharacters.length;

        // 土系角色应该防御力倾向更高
        const earthCharacters = CharacterSystem.getCharactersByElement('Earth');
        const earthAvgDefense = earthCharacters.reduce((sum, c) => sum + c.base_defense, 0) / earthCharacters.length;

        // 水系角色应该法力值倾向更高
        const waterCharacters = CharacterSystem.getCharactersByElement('Water');
        const waterAvgMana = waterCharacters.reduce((sum, c) => sum + c.base_mana, 0) / waterCharacters.length;

        // 验证属性倾向符合设定
        const allCharacters = CharacterSystem.getAllCharacters();
        const overallAvgAttack = allCharacters.reduce((sum, c) => sum + c.base_attack, 0) / allCharacters.length;
        const overallAvgDefense = allCharacters.reduce((sum, c) => sum + c.base_defense, 0) / allCharacters.length;
        const overallAvgMana = allCharacters.reduce((sum, c) => sum + c.base_mana, 0) / allCharacters.length;

        expect(metalAvgAttack).toBeGreaterThan(overallAvgAttack);
        expect(earthAvgDefense).toBeGreaterThan(overallAvgDefense);
        expect(waterAvgMana).toBeGreaterThan(overallAvgMana);
      });
    });
  });

  describe('战斗中的五行相克实际表现', () => {

    describe('实战伤害验证', () => {

      it('应该在实际战斗中正确应用五行相克', async () => {
        const metalAttacker = global.testUtils.createTestCharacter({
          character_name: '杨戬',
          element: 'Metal',
          base_attack: 1000,
          level: 50
        });

        const woodDefender = global.testUtils.createTestCharacter({
          character_name: '申公豹',
          element: 'Wood',
          base_defense: 600,
          level: 50
        });

        const battleResult = await CombatSystem.performAttack(metalAttacker, woodDefender);

        expect(battleResult.damageDealt).toBeGreaterThan(1000); // 应该有克制加成
        expect(battleResult.elementalRelation).toBe('defeats');
        expect(battleResult.effectivenessRating).toBe('super_effective');

        // 验证伤害日志
        expect(battleResult.combatLog).toContain('杨戬 对 申公豹 造成克制伤害');
        expect(battleResult.combatLog).toContain('金克木');
      });

      it('应该在群体战斗中正确计算五行相克', async () => {
        const team1 = [
          global.testUtils.createTestCharacter({ element: 'Fire' }),
          global.testUtils.createTestCharacter({ element: 'Water' })
        ];

        const team2 = [
          global.testUtils.createTestCharacter({ element: 'Metal' }),
          global.testUtils.createTestCharacter({ element: 'Wood' })
        ];

        const battleResult = await CombatSystem.performTeamBattle(team1, team2);

        // 验证克制关系：火克金、水克火、金克木、木克土
        const damageMatrix = battleResult.damageMatrix;

        expect(damageMatrix['Fire_vs_Metal'].effectiveness).toBe('super_effective');
        expect(damageMatrix['Water_vs_Fire'].effectiveness).toBe('super_effective');
        expect(damageMatrix['Metal_vs_Wood'].effectiveness).toBe('super_effective');

        // 验证战斗结果受五行相克影响
        expect(battleResult.elementalAdvantage).toBeDefined();
      });

      it('应该处理复杂的多重五行相克场景', async () => {
        const mixedBattle = {
          attacker: global.testUtils.createTestCharacter({ element: 'Water' }),
          defender: global.testUtils.createTestCharacter({ element: 'Fire' }),
          environment: { dominantElement: 'Wood' }, // 环境属性
          weather: { type: 'rainy', elementBonus: 'Water' } // 天气加成
        };

        const complexResult = await CombatSystem.performComplexBattle(mixedBattle);

        // 水克火(1.3) + 环境加成 + 天气加成
        expect(complexResult.totalMultiplier).toBeGreaterThan(1.3);
        expect(complexResult.environmentBonus).toBeTruthy();
        expect(complexResult.weatherBonus).toBeTruthy();
      });
    });

    describe('战斗策略验证', () => {

      it('应该能够通过五行相克实现策略反制', () => {
        const fireTeam = [
          global.testUtils.createTestCharacter({ element: 'Fire' }),
          global.testUtils.createTestCharacter({ element: 'Fire' }),
          global.testUtils.createTestCharacter({ element: 'Fire' })
        ];

        // AI应该推荐水系角色来反制火系队伍
        const counterStrategy = AIStrategy.recommendCounter(fireTeam);

        expect(counterStrategy.recommendedElement).toBe('Water');
        expect(counterStrategy.reason).toBe('水克火，有效压制对方火系阵容');
        expect(counterStrategy.effectiveness).toBeGreaterThan(0.7);
      });

      it('应该验证五行循环无绝对最强', () => {
        const elements = ['Metal', 'Wood', 'Water', 'Fire', 'Earth'];

        elements.forEach(element => {
          const counterElement = ElementSystem.getCounterElement(element);
          const defeatedElement = ElementSystem.getDefeatedElement(element);

          // 每个属性都有克制者和被克制者
          expect(counterElement).toBeTruthy();
          expect(defeatedElement).toBeTruthy();
          expect(counterElement).not.toBe(element);
          expect(defeatedElement).not.toBe(element);
        });

        // 验证没有无敌属性
        const winRates = {};
        elements.forEach(elem => {
          winRates[elem] = StrategyAnalysis.calculateElementWinRate(elem);
          expect(winRates[elem]).toBeBetween(0.15, 0.25); // 理论胜率约20%（1/5）
        });
      });
    });
  });

  describe('边界条件和异常处理', () => {

    describe('无效输入处理', () => {

      it('应该正确处理空值和未定义属性', () => {
        expect(() => ElementSystem.calculateDamage(null, 'Fire', 1000)).toThrow('攻击者属性不能为空');
        expect(() => ElementSystem.calculateDamage('Metal', undefined, 1000)).toThrow('防御者属性不能为空');
        expect(() => ElementSystem.calculateDamage('Metal', 'Fire', null)).toThrow('基础伤害不能为空');
        expect(() => ElementSystem.calculateDamage('Metal', 'Fire', -100)).toThrow('基础伤害不能为负数');
      });

      it('应该处理不存在的五行属性', () => {
        expect(() => ElementSystem.getRelationType('Lightning', 'Fire')).toThrow('无效的五行属性: Lightning');
        expect(() => ElementSystem.getRelationType('Metal', 'Ice')).toThrow('无效的五行属性: Ice');
        expect(() => ElementSystem.getRelationType('', 'Fire')).toThrow('五行属性不能为空');
      });

      it('应该处理异常的伤害计算参数', () => {
        const result1 = ElementSystem.calculateDamage('Metal', 'Wood', 0);
        expect(result1.finalDamage).toBe(0);

        const result2 = ElementSystem.calculateDamage('Metal', 'Wood', Infinity);
        expect(result2.finalDamage).toBeLessThan(Number.MAX_SAFE_INTEGER);

        expect(() => ElementSystem.calculateDamage('Metal', 'Wood', NaN)).toThrow('基础伤害必须为有效数字');
      });
    });

    describe('数值边界测试', () => {

      it('应该处理极小伤害值', () => {
        const minDamage = ElementSystem.calculateDamage('Metal', 'Wood', 0.1);
        expect(minDamage.finalDamage).toBeGreaterThan(0);
        expect(minDamage.finalDamage).toBe(0.13); // 0.1 * 1.3
      });

      it('应该处理极大伤害值', () => {
        const hugeDamage = Number.MAX_SAFE_INTEGER / 10;
        const result = ElementSystem.calculateDamage('Fire', 'Metal', hugeDamage);

        expect(result.finalDamage).toBeLessThan(Number.MAX_SAFE_INTEGER);
        expect(result.finalDamage).toBeGreaterThan(hugeDamage);
        expect(Number.isFinite(result.finalDamage)).toBe(true);
      });

      it('应该限制五行加成的最大倍数', () => {
        // 即使有多重加成，也应该有合理上限
        const multipleBonus = ElementSystem.calculateCompoundBonus({
          elementalAdvantage: 1.3,
          sameElementBonus: 1.2,
          formationBonus: 2.0,
          environmentBonus: 1.5,
          criticalHit: 2.0
        });

        expect(multipleBonus.totalMultiplier).toBeLessThan(10.0); // 不超过10倍
        expect(multipleBonus.cappedAtMaximum).toBeTruthy();
      });
    });

    describe('性能压力测试', () => {

      it('应该在大量五行计算中保持性能', async () => {
        const calculations = Array.from({length: 10000}, () => ({
          attacker: global.testUtils.randomElement(),
          defender: global.testUtils.randomElement(),
          damage: global.testUtils.randomInt(100, 2000)
        }));

        const { result, executionTime } = await global.measurePerformance(async () => {
          return calculations.map(calc =>
            ElementSystem.calculateDamage(calc.attacker, calc.defender, calc.damage)
          );
        });

        expect(result).toHaveLength(10000);
        expect(executionTime).toBeWithinPerformanceLimit(1000); // 1秒内完成10000次计算
      });

      it('应该支持并发的五行相克计算', async () => {
        const concurrentBattles = Array.from({length: 100}, () =>
          CombatSystem.performElementalBattle(
            global.testUtils.createTestCharacter({ element: global.testUtils.randomElement() }),
            global.testUtils.createTestCharacter({ element: global.testUtils.randomElement() })
          )
        );

        const { result, executionTime } = await global.measurePerformance(async () => {
          return Promise.all(concurrentBattles);
        });

        expect(result).toHaveLength(100);
        expect(executionTime).toBeWithinPerformanceLimit(2000); // 2秒内完成100场并发战斗
      });
    });
  });
});