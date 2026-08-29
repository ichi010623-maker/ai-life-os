/**
 * AI Life OS · 核心数据模型
 * --------------------------------------------------------------------------
 * 所有跨模块共享的 TypeScript 类型统一在此文件导出。
 * 约定：
 *   - 数据库行 / API DTO / UI 状态 均复用同一组 Interface，避免类型漂移。
 *   - 字段命名保持与 Supabase 表结构一一对应（snake_case 业务字段 + camelCase TS）。
 *   - 关联字段（如 TaskItem.relatedId）使用 UUID，且与 relatedModule 共同决定目标实体。
 */

// ==================== 0. 通用基础类型 ====================

/** ISO 8601 时间字符串，例如 "2026-08-29T10:26:00.000Z" */
export type ISODateString = string;

/** 数据库主键，Supabase 默认 UUID v4 */
export type UUID = string;

/** 模块间 "可关联实体" 的联合辅助类型 */
export type RelatedModule = 'PRODUCT' | 'KNOWLEDGE' | 'FINANCE' | 'HEALTH';

/** 所有带审计字段的实体可继承该基类 */
export interface BaseEntity {
  id: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ==================== 1. 任务系统（5 层嵌套） ====================

/** 任务层级（从战略到执行） */
export type TaskLevel = 'GOAL' | 'STRATEGIC' | 'PROJECT' | 'TASK' | 'SUBTASK';

/** 优先级：P0 最高，P3 最低 */
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

/** 任务状态机 */
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

/**
 * 单个任务节点。注意：
 *   - `level` + `parentId` 共同描述其在 5 层树中的位置。
 *   - `relatedModule` + `relatedId` 用于跨模块联动（例如任务关联到某个 ProductIdea）。
 */
export interface TaskItem extends BaseEntity {
  title: string;
  description?: string;
  level: TaskLevel;
  parentId?: UUID;
  priority: Priority;
  status: TaskStatus;
  dueDate?: ISODateString;
  relatedModule?: RelatedModule;
  relatedId?: UUID;
}

/** 层级 → 深度，便于递归渲染时判断缩进与权限 */
export const TASK_LEVEL_DEPTH: Record<TaskLevel, number> = {
  GOAL: 0,
  STRATEGIC: 1,
  PROJECT: 2,
  TASK: 3,
  SUBTASK: 4,
};

/** 已展开为树的递归节点类型，供 UI 渲染使用 */
export interface TaskTreeNode extends TaskItem {
  children: TaskTreeNode[];
}

// ==================== 2. 产品工作区与灵感库 ====================

export type ProductCategory = 'HARDWARE' | 'SOFTWARE' | 'ACCESSORY';

/** 产品研发阶段（硬件行业标准流程） */
export type ProductStage = 'CONCEPT' | 'EVT' | 'DVT' | 'PVT' | 'LAUNCHED';

export interface ProductIdea extends BaseEntity {
  title: string;
  category: ProductCategory;
  stage: ProductStage;
  /** 竞品分析笔记 */
  competitorNotes?: string;
  /** 自由扩展的规格 / 参数，例如 { battery: '3000mAh', weight: '120g' } */
  specs?: Record<string, unknown>;
  /** 与该产品关联的任务节点（正向链接） */
  linkedTaskIds?: UUID[];
}

// ==================== 3. 知识库与学习中心 ====================

export type KnowledgeCategory = 'ARTICLE' | 'BOOK' | 'RESEARCH' | 'MEETING';

export interface KnowledgeNote extends BaseEntity {
  title: string;
  /** Markdown 文本 */
  content: string;
  tags: string[];
  sourceUrl?: string;
  category: KnowledgeCategory;
}

// ==================== 4. 健康、生活与食材冰箱 ====================

export type FoodCategory = 'MEAT' | 'VEGETABLE' | 'FRUIT' | 'SUPPLEMENT';

export interface FoodStockItem {
  id: UUID;
  name: string;
  quantity: number;
  /** 单位，如 'kg'、'g'、'个'、'瓶' */
  unit: string;
  category: FoodCategory;
  expirationDate: ISODateString;
  /** 库存是否低于预警阈值（前端或后端计算字段） */
  isLowStock: boolean;
}

// ==================== 5. 财富管理 ====================

export type TransactionType = 'INCOME' | 'EXPENSE';

export type FinanceCategory =
  | 'FIXED_LIVING' // 固定生活支出
  | 'PROTOTYPING_GEAR' // 打样 / 硬件投入
  | 'SUBSCRIPTION' // SaaS / 服务订阅
  | 'LIFESTYLE' // 弹性生活方式
  | 'HEALTH'; // 健康相关

export interface FinanceRecord {
  id: UUID;
  amount: number;
  type: TransactionType;
  category: FinanceCategory;
  note: string;
  date: ISODateString;
  /** 关联的物品/打样配件 ID，可与 ProductIdea 等互链 */
  linkedItemId?: UUID;
}

// ==================== 联合辅助类型 ====================

/**
 * 任务 "relatedModule" 字段在运行时真正指向的实体集合。
 * 用法：做 type guard 时可使用 `RelatedEntityMap[T]['entity']`。
 */
export interface RelatedEntityMap {
  PRODUCT: ProductIdea;
  KNOWLEDGE: KnowledgeNote;
  FINANCE: FinanceRecord;
  HEALTH: FoodStockItem;
}

/** 用于 TypeScript 联合分发 */
export type RelatedEntity = {
  [K in keyof RelatedEntityMap]: { module: K; entity: RelatedEntityMap[K] };
}[keyof RelatedEntityMap];
