# 文件安全验证机制
**版本**: 1.0
**创建日期**: 2025-09-16
**用途**: 为所有AI agents提供文件操作安全检查机制

---

## 🔒 核心安全验证类

```typescript
/**
 * AI Agents 文件操作安全验证类
 * 防止agents越界操作，确保所有文件操作在项目范围内
 */
export class FileSecurityValidator {
  private static readonly PROJECT_ROOT = "D:\\Develop\\Masterpiece\\game\\hero-idle-game";

  private static readonly AGENT_PERMISSIONS: Record<string, string[]> = {
    // 游戏设计师
    "Game_Designer_Agent": [
      "specs/",
      "docs/design/"
    ],

    // QA测试
    "QA_Tester_Agent": [
      "tests/",
      "tests/fixtures/",
      "tests/mocks/"
    ],

    // 前端开发
    "Frontend_Agent": [
      "assets/scripts/",
      "assets/scenes/",
      "assets/prefabs/",
      "src/components/",
      "src/ui/"
    ],

    // 后端逻辑
    "Backend_Logic_Agent": [
      "src/logic/",
      "src/services/",
      "src/models/",
      "src/utils/",
      "src/types/"
    ],

    // 商业化
    "Monetization_Agent": [
      "src/monetization/",
      "src/payments/",
      "src/ads/"
    ],

    // 重构审查 (只读大部分，可写审查报告)
    "Refactor_And_Review_Agent": [
      "docs/reviews/",
      ".claude/reviews/"
    ],

    // 文档
    "Documentation_Agent": [
      "docs/",
      "docs/api/",
      "docs/architecture/",
      "README.md"
    ],

    // 美术指导
    "Art_Director_Agent": [
      "docs/art/",
      "assets/art-specs/",
      ".claude/art-assets/"
    ],

    // 音效设计
    "Sound_Designer_Agent": [
      "docs/audio/",
      "assets/audio-specs/",
      ".claude/audio-assets/"
    ],

    // 后端架构师
    "Backend_Architect_Agent": [
      "docs/architecture/",
      "docs/database/",
      "src/config/",
      "src/schemas/"
    ],

    // 数据分析师
    "Data_Engineer_Analyst_Agent": [
      "src/analytics/",
      "docs/analytics/",
      "src/tracking/"
    ],

    // 运营管理
    "LiveOps_Manager_Agent": [
      "docs/liveops/",
      "src/events/",
      "content/events/",
      "packages/content/events/"
    ],

    // 社区管理
    "Community_Manager_Agent": [
      "docs/community/",
      ".claude/community/"
    ]
  };

  private static readonly FORBIDDEN_PATHS = [
    // 系统关键目录
    "C:\\Windows\\",
    "C:\\Program Files\\",
    "C:\\Program Files (x86)\\",
    "C:\\Users\\Administrator\\Documents\\",
    "C:\\Users\\Administrator\\Desktop\\",

    // 项目外目录
    "D:\\Develop\\Masterpiece\\game\\", // 除hero-idle-game外

    // 项目内禁止目录
    "temp/",
    "library/",
    ".git/"
  ];

  private static readonly PROTECTED_FILES = [
    "tsconfig.json", // extends字段不可修改
    "package.json",  // uuid字段不可修改
    ".gitignore",
    "creator.d.ts"
  ];

  /**
   * 验证文件路径是否安全且在agent权限范围内
   */
  static validatePath(agentType: string, filePath: string): ValidationResult {
    try {
      // 1. 规范化路径
      const normalizedPath = path.resolve(filePath);

      // 2. 检查是否在项目根目录内
      if (!normalizedPath.startsWith(this.PROJECT_ROOT)) {
        return {
          isValid: false,
          error: `❌ 路径越界: ${filePath} 不在项目根目录内`,
          severity: "CRITICAL"
        };
      }

      // 3. 检查是否访问禁止目录
      const relativePath = path.relative(this.PROJECT_ROOT, normalizedPath);
      for (const forbiddenPath of this.FORBIDDEN_PATHS) {
        if (relativePath.startsWith(forbiddenPath) || normalizedPath.includes(forbiddenPath)) {
          return {
            isValid: false,
            error: `❌ 禁止访问: ${forbiddenPath} 是受保护的目录`,
            severity: "CRITICAL"
          };
        }
      }

      // 4. 检查agent特定权限
      const agentPermissions = this.AGENT_PERMISSIONS[agentType];
      if (!agentPermissions) {
        return {
          isValid: false,
          error: `❌ 未知Agent类型: ${agentType}`,
          severity: "ERROR"
        };
      }

      const hasPermission = agentPermissions.some(allowedPath =>
        relativePath.startsWith(allowedPath)
      );

      if (!hasPermission) {
        return {
          isValid: false,
          error: `❌ 权限不足: ${agentType} 无权访问 ${relativePath}`,
          severity: "ERROR"
        };
      }

      // 5. 检查受保护文件
      const fileName = path.basename(normalizedPath);
      if (this.PROTECTED_FILES.includes(fileName)) {
        return {
          isValid: false,
          error: `⚠️ 受保护文件: ${fileName} 需要特殊权限`,
          severity: "WARNING"
        };
      }

      return {
        isValid: true,
        normalizedPath,
        relativePath
      };

    } catch (error) {
      return {
        isValid: false,
        error: `❌ 路径验证失败: ${error.message}`,
        severity: "ERROR"
      };
    }
  }

  /**
   * 批量验证多个文件路径
   */
  static validatePaths(agentType: string, filePaths: string[]): ValidationResult[] {
    return filePaths.map(filePath => this.validatePath(agentType, filePath));
  }

  /**
   * 获取agent允许的路径列表
   */
  static getAgentPermissions(agentType: string): string[] {
    return this.AGENT_PERMISSIONS[agentType] || [];
  }

  /**
   * 检查路径是否为只读权限
   */
  static isReadOnlyPath(agentType: string, filePath: string): boolean {
    // Refactor_And_Review_Agent 对大部分路径只有读权限
    if (agentType === "Refactor_And_Review_Agent") {
      const relativePath = path.relative(this.PROJECT_ROOT, path.resolve(filePath));
      const writeablePaths = this.AGENT_PERMISSIONS[agentType];
      return !writeablePaths.some(writePath => relativePath.startsWith(writePath));
    }
    return false;
  }
}

/**
 * 验证结果接口
 */
interface ValidationResult {
  isValid: boolean;
  normalizedPath?: string;
  relativePath?: string;
  error?: string;
  severity?: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
}

/**
 * 文件操作安全装饰器
 * 在文件操作方法上使用此装饰器自动进行安全检查
 */
export function SecureFileOperation(agentType: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const filePath = args[0]; // 假设第一个参数是文件路径

      const validation = FileSecurityValidator.validatePath(agentType, filePath);

      if (!validation.isValid) {
        console.error(`🚨 文件操作安全检查失败: ${validation.error}`);

        switch (validation.severity) {
          case "CRITICAL":
            throw new Error(`CRITICAL SECURITY VIOLATION: ${validation.error}`);
          case "ERROR":
            throw new Error(`SECURITY ERROR: ${validation.error}`);
          case "WARNING":
            console.warn(`SECURITY WARNING: ${validation.error}`);
            break;
        }
      }

      console.log(`✅ 文件操作安全检查通过: ${validation.relativePath}`);
      return method.apply(this, args);
    };
  };
}

/**
 * Agent基类，包含文件操作安全检查
 */
export abstract class SecureAgent {
  protected agentType: string;

  constructor(agentType: string) {
    this.agentType = agentType;
  }

  /**
   * 安全文件写入
   */
  protected secureWriteFile(filePath: string, content: string): void {
    const validation = FileSecurityValidator.validatePath(this.agentType, filePath);

    if (!validation.isValid) {
      throw new Error(`File Write Security Violation: ${validation.error}`);
    }

    // 执行实际的文件写入操作
    // fs.writeFileSync(validation.normalizedPath, content);
    console.log(`✅ 安全写入文件: ${validation.relativePath}`);
  }

  /**
   * 安全文件读取
   */
  protected secureReadFile(filePath: string): string {
    const validation = FileSecurityValidator.validatePath(this.agentType, filePath);

    if (!validation.isValid) {
      throw new Error(`File Read Security Violation: ${validation.error}`);
    }

    // 执行实际的文件读取操作
    // return fs.readFileSync(validation.normalizedPath, 'utf8');
    console.log(`✅ 安全读取文件: ${validation.relativePath}`);
    return "";
  }
}
```

---

## 🛡️ 使用示例

```typescript
// 1. 直接使用验证器
const validation = FileSecurityValidator.validatePath("Frontend_Agent", "src/components/HeroPanel.ts");
if (!validation.isValid) {
  console.error(validation.error);
}

// 2. 使用装饰器
class MyAgent {
  @SecureFileOperation("Frontend_Agent")
  writeComponentFile(filePath: string, content: string) {
    // 文件操作逻辑
  }
}

// 3. 继承安全基类
class FrontendAgent extends SecureAgent {
  constructor() {
    super("Frontend_Agent");
  }

  createComponent(name: string) {
    const content = `// ${name} Component`;
    this.secureWriteFile(`src/components/${name}.ts`, content);
  }
}
```

---

## 📊 安全监控

```typescript
/**
 * 安全事件监控类
 */
export class SecurityMonitor {
  private static violations: SecurityViolation[] = [];

  static recordViolation(agentType: string, filePath: string, error: string, severity: string) {
    const violation: SecurityViolation = {
      timestamp: new Date(),
      agentType,
      filePath,
      error,
      severity,
      stackTrace: new Error().stack
    };

    this.violations.push(violation);

    // 严重违规立即报警
    if (severity === "CRITICAL") {
      this.alertCriticalViolation(violation);
    }
  }

  static getViolationReport(): SecurityReport {
    return {
      totalViolations: this.violations.length,
      criticalViolations: this.violations.filter(v => v.severity === "CRITICAL").length,
      errorViolations: this.violations.filter(v => v.severity === "ERROR").length,
      warningViolations: this.violations.filter(v => v.severity === "WARNING").length,
      violationsByAgent: this.groupViolationsByAgent(),
      recentViolations: this.violations.slice(-10)
    };
  }

  private static alertCriticalViolation(violation: SecurityViolation) {
    console.error(`🚨🚨🚨 CRITICAL SECURITY VIOLATION 🚨🚨🚨`);
    console.error(`Agent: ${violation.agentType}`);
    console.error(`Path: ${violation.filePath}`);
    console.error(`Error: ${violation.error}`);
    console.error(`Time: ${violation.timestamp}`);

    // 可以在这里添加更多的报警机制，如发送邮件、Webhook等
  }

  private static groupViolationsByAgent(): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const violation of this.violations) {
      groups[violation.agentType] = (groups[violation.agentType] || 0) + 1;
    }
    return groups;
  }
}

interface SecurityViolation {
  timestamp: Date;
  agentType: string;
  filePath: string;
  error: string;
  severity: string;
  stackTrace?: string;
}

interface SecurityReport {
  totalViolations: number;
  criticalViolations: number;
  errorViolations: number;
  warningViolations: number;
  violationsByAgent: Record<string, number>;
  recentViolations: SecurityViolation[];
}
```

---

## 🚨 应急响应程序

### 发现违规时的处理步骤

1. **立即停止** - 违规agent的当前操作
2. **记录详情** - 违规路径、时间、错误信息
3. **评估影响** - 判断是否对项目造成损害
4. **报告Orchestrator** - 提交违规报告
5. **权限回收** - 根据严重程度调整agent权限

### 违规等级处理

- **INFO**: 记录日志，继续执行
- **WARNING**: 警告提示，允许继续但监控
- **ERROR**: 阻止操作，要求修正
- **CRITICAL**: 立即终止，永久禁用agent

**此安全机制确保所有AI agents在安全边界内工作，保护项目完整性和系统安全。**