-- =====================================================================
-- AI Life OS · 0001_init.sql
-- ---------------------------------------------------------------------
-- Initial database schema for the AI Life OS workspace.
-- Apply via one of:
--     supabase db push
--     psql -f supabase/migrations/0001_init.sql
--
-- All tables are scoped by `user_id` (auth.users) and protected by RLS,
-- so this schema assumes Supabase Auth is enabled.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. Enum Types
-- ---------------------------------------------------------------------
CREATE TYPE public.task_level         AS ENUM ('GOAL', 'STRATEGIC', 'PROJECT', 'TASK', 'SUBTASK');
CREATE TYPE public.priority           AS ENUM ('P0', 'P1', 'P2', 'P3');
CREATE TYPE public.task_status        AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');
CREATE TYPE public.related_module     AS ENUM ('PRODUCT', 'KNOWLEDGE', 'FINANCE', 'HEALTH');
CREATE TYPE public.product_category   AS ENUM ('HARDWARE', 'SOFTWARE', 'ACCESSORY');
CREATE TYPE public.product_stage      AS ENUM ('CONCEPT', 'EVT', 'DVT', 'PVT', 'LAUNCHED');
CREATE TYPE public.knowledge_category AS ENUM ('ARTICLE', 'BOOK', 'RESEARCH', 'MEETING');
CREATE TYPE public.food_category      AS ENUM ('MEAT', 'VEGETABLE', 'FRUIT', 'SUPPLEMENT');
CREATE TYPE public.transaction_type   AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE public.finance_category   AS ENUM ('FIXED_LIVING', 'PROTOTYPING_GEAR', 'SUBSCRIPTION', 'LIFESTYLE', 'HEALTH');

-- ---------------------------------------------------------------------
-- 2. set_updated_at() helper
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. Core Tables
-- ---------------------------------------------------------------------

-- 3.1 tasks：5 层嵌套任务树（GOAL → STRATEGIC → PROJECT → TASK → SUBTASK）
CREATE TABLE public.tasks (
  id              uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid                    REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text                    NOT NULL,
  description     text,
  level           public.task_level       NOT NULL,
  parent_id       uuid                    REFERENCES public.tasks(id) ON DELETE CASCADE,
  priority        public.priority         NOT NULL DEFAULT 'P2',
  status          public.task_status      NOT NULL DEFAULT 'TODO',
  due_date        timestamptz,
  related_module  public.related_module,
  related_id      uuid,
  created_at      timestamptz             NOT NULL DEFAULT now(),
  updated_at      timestamptz             NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tasks IS '5 层嵌套任务树：通过 parent_id 自引用实现父子层级';

-- 3.2 product_ideas：产品灵感库 / 工作区
CREATE TABLE public.product_ideas (
  id                uuid                       PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid                       REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text                       NOT NULL,
  category          public.product_category    NOT NULL,
  stage             public.product_stage       NOT NULL DEFAULT 'CONCEPT',
  competitor_notes  text,
  specs             jsonb                      NOT NULL DEFAULT '{}'::jsonb,
  linked_task_ids   uuid[]                     NOT NULL DEFAULT ARRAY[]::uuid[],
  created_at        timestamptz                NOT NULL DEFAULT now(),
  updated_at        timestamptz                NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.product_ideas.linked_task_ids IS '正向关联到 tasks.id 的 UUID 数组';

-- 3.3 knowledge_notes：知识库 / 学习笔记
CREATE TABLE public.knowledge_notes (
  id          uuid                         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid                         REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text                         NOT NULL,
  content     text                         NOT NULL,
  tags        text[]                       NOT NULL DEFAULT ARRAY[]::text[],
  source_url  text,
  category    public.knowledge_category    NOT NULL,
  created_at  timestamptz                  NOT NULL DEFAULT now(),
  updated_at  timestamptz                  NOT NULL DEFAULT now()
);

-- 3.4 food_stock：食材冰箱 / 库存
CREATE TABLE public.food_stock (
  id               uuid                       PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid                       REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text                       NOT NULL,
  quantity         numeric                    NOT NULL DEFAULT 0,
  unit             text                       NOT NULL,
  category         public.food_category       NOT NULL,
  expiration_date  timestamptz                NOT NULL,
  is_low_stock     boolean                    NOT NULL DEFAULT false,
  created_at       timestamptz                NOT NULL DEFAULT now(),
  updated_at       timestamptz                NOT NULL DEFAULT now()
);

-- 3.5 finance_records：财富管理流水
CREATE TABLE public.finance_records (
  id              uuid                         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid                         REFERENCES auth.users(id) ON DELETE CASCADE,
  amount          numeric(12, 2)               NOT NULL,
  type            public.transaction_type      NOT NULL,
  category        public.finance_category      NOT NULL,
  note            text                         NOT NULL DEFAULT '',
  date            timestamptz                  NOT NULL DEFAULT now(),
  linked_item_id  uuid,
  created_at      timestamptz                  NOT NULL DEFAULT now(),
  updated_at      timestamptz                  NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.finance_records.amount IS '单位：元（CNY），numeric(12,2) 支持最大 9,999,999,999.99';

-- ---------------------------------------------------------------------
-- 4. Triggers：自动维护 updated_at
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_product_ideas_updated_at
  BEFORE UPDATE ON public.product_ideas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_knowledge_notes_updated_at
  BEFORE UPDATE ON public.knowledge_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_food_stock_updated_at
  BEFORE UPDATE ON public.food_stock
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_finance_records_updated_at
  BEFORE UPDATE ON public.finance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Indexes
-- ---------------------------------------------------------------------
-- tasks
CREATE INDEX idx_tasks_user_id   ON public.tasks (user_id);
CREATE INDEX idx_tasks_parent_id ON public.tasks (parent_id);
CREATE INDEX idx_tasks_status    ON public.tasks (status);
CREATE INDEX idx_tasks_level     ON public.tasks (level);
CREATE INDEX idx_tasks_due_date  ON public.tasks (due_date);

-- product_ideas
CREATE INDEX idx_product_ideas_user_id       ON public.product_ideas (user_id);
CREATE INDEX idx_product_ideas_stage         ON public.product_ideas (stage);
CREATE INDEX idx_product_ideas_linked_tasks  ON public.product_ideas USING GIN (linked_task_ids);

-- knowledge_notes
CREATE INDEX idx_knowledge_notes_user_id ON public.knowledge_notes (user_id);
CREATE INDEX idx_knowledge_notes_tags    ON public.knowledge_notes USING GIN (tags);

-- food_stock
CREATE INDEX idx_food_stock_user_id        ON public.food_stock (user_id);
CREATE INDEX idx_food_stock_category       ON public.food_stock (category);
CREATE INDEX idx_food_stock_expiration     ON public.food_stock (expiration_date);

-- finance_records
CREATE INDEX idx_finance_records_user_id   ON public.finance_records (user_id);
CREATE INDEX idx_finance_records_date      ON public.finance_records (date);
CREATE INDEX idx_finance_records_category  ON public.finance_records (category);
CREATE INDEX idx_finance_records_type      ON public.finance_records (type);

-- ---------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------
ALTER TABLE public.tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ideas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_notes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_stock       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_records  ENABLE ROW LEVEL SECURITY;

-- 单条策略覆盖 SELECT / INSERT / UPDATE / DELETE
CREATE POLICY "Users manage own tasks"
  ON public.tasks
  FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own product_ideas"
  ON public.product_ideas
  FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own knowledge_notes"
  ON public.knowledge_notes
  FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own food_stock"
  ON public.food_stock
  FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own finance_records"
  ON public.finance_records
  FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- End of 0001_init.sql
-- =====================================================================
