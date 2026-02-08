-- WeddingOS Full Schema Migration
-- Tables, RLS policies, triggers, and seed data

-- ===========================================
-- 1. PROFILES
-- ===========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- 2. PROJECTS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  wedding_date DATE,
  location TEXT,
  country TEXT DEFAULT 'US',
  guest_count INT DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  total_budget NUMERIC DEFAULT 0,
  style TEXT DEFAULT 'standard',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 3. PROJECT MEMBERS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of project
CREATE OR REPLACE FUNCTION public.is_project_member(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id AND user_id = auth.uid()
  );
$$;

-- Helper function: get user's role in project
CREATE OR REPLACE FUNCTION public.get_project_role(p_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.project_members
  WHERE project_id = p_id AND user_id = auth.uid()
  LIMIT 1;
$$;

-- Projects policies
CREATE POLICY "projects_select_member" ON public.projects
  FOR SELECT USING (public.is_project_member(id));

CREATE POLICY "projects_insert_auth" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "projects_update_editor" ON public.projects
  FOR UPDATE USING (public.get_project_role(id) IN ('owner', 'editor'));

CREATE POLICY "projects_delete_owner" ON public.projects
  FOR DELETE USING (public.get_project_role(id) = 'owner');

-- Project members policies
CREATE POLICY "pm_select_member" ON public.project_members
  FOR SELECT USING (public.is_project_member(project_id));

CREATE POLICY "pm_insert_owner" ON public.project_members
  FOR INSERT WITH CHECK (
    public.get_project_role(project_id) = 'owner'
    OR (auth.uid() = user_id) -- allow self-insert during project creation or invite accept
  );

CREATE POLICY "pm_update_owner" ON public.project_members
  FOR UPDATE USING (public.get_project_role(project_id) = 'owner');

CREATE POLICY "pm_delete_owner" ON public.project_members
  FOR DELETE USING (public.get_project_role(project_id) = 'owner');

-- ===========================================
-- 4. INVITES
-- ===========================================
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')) DEFAULT 'editor',
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_select_member" ON public.invites
  FOR SELECT USING (public.is_project_member(project_id));

CREATE POLICY "invites_insert_owner" ON public.invites
  FOR INSERT WITH CHECK (public.get_project_role(project_id) = 'owner');

-- Allow anyone to select invite by token (for accepting)
CREATE POLICY "invites_select_by_token" ON public.invites
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ===========================================
-- 5. CATEGORIES
-- ===========================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_percent NUMERIC,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cat_select_member" ON public.categories
  FOR SELECT USING (public.is_project_member(project_id));

CREATE POLICY "cat_insert_editor" ON public.categories
  FOR INSERT WITH CHECK (public.get_project_role(project_id) IN ('owner', 'editor'));

CREATE POLICY "cat_update_editor" ON public.categories
  FOR UPDATE USING (public.get_project_role(project_id) IN ('owner', 'editor'));

CREATE POLICY "cat_delete_editor" ON public.categories
  FOR DELETE USING (public.get_project_role(project_id) IN ('owner', 'editor'));

-- ===========================================
-- 6. BUDGET ITEMS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  estimated NUMERIC DEFAULT 0,
  actual NUMERIC DEFAULT 0,
  notes TEXT,
  vendor_id UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bi_select_member" ON public.budget_items
  FOR SELECT USING (public.is_project_member(project_id));

CREATE POLICY "bi_insert_editor" ON public.budget_items
  FOR INSERT WITH CHECK (public.get_project_role(project_id) IN ('owner', 'editor'));

CREATE POLICY "bi_update_editor" ON public.budget_items
  FOR UPDATE USING (public.get_project_role(project_id) IN ('owner', 'editor'));

CREATE POLICY "bi_delete_editor" ON public.budget_items
  FOR DELETE USING (public.get_project_role(project_id) IN ('owner', 'editor'));

-- ===========================================
-- 7. VENDORS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other',
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'prospect' CHECK (status IN ('prospect', 'quote_received', 'booked', 'paid')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v_select_member" ON public.vendors
  FOR SELECT USING (public.is_project_member(project_id));

CREATE POLICY "v_insert_editor" ON public.vendors
  FOR INSERT WITH CHECK (public.get_project_role(project_id) IN ('owner', 'editor'));

CREATE POLICY "v_update_editor" ON public.vendors
  FOR UPDATE USING (public.get_project_role(project_id) IN ('owner', 'editor'));

CREATE POLICY "v_delete_editor" ON public.vendors
  FOR DELETE USING (public.get_project_role(project_id) IN ('owner', 'editor'));

-- Add FK for budget_items.vendor_id now that vendors table exists
ALTER TABLE public.budget_items
  ADD CONSTRAINT budget_items_vendor_fk FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;

-- ===========================================
-- 8. DOCUMENTS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'upload' CHECK (source IN ('upload', 'email', 'paste')),
  file_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  sender_name TEXT,
  sender_email TEXT,
  received_at TIMESTAMPTZ,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzed', 'needs_review')),
  confidence NUMERIC DEFAULT 0,
  raw_text TEXT,
  analysis_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_select_member" ON public.documents
  FOR SELECT USING (public.is_project_member(project_id));

CREATE POLICY "doc_insert_editor" ON public.documents
  FOR INSERT WITH CHECK (public.get_project_role(project_id) IN ('owner', 'editor'));

CREATE POLICY "doc_update_editor" ON public.documents
  FOR UPDATE USING (public.get_project_role(project_id) IN ('owner', 'editor'));

CREATE POLICY "doc_delete_editor" ON public.documents
  FOR DELETE USING (public.get_project_role(project_id) IN ('owner', 'editor'));

-- ===========================================
-- 9. QUOTES
-- ===========================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "q_select_member" ON public.quotes
  FOR SELECT USING (public.is_project_member(project_id));

CREATE POLICY "q_insert_editor" ON public.quotes
  FOR INSERT WITH CHECK (public.get_project_role(project_id) IN ('owner', 'editor'));

CREATE POLICY "q_update_editor" ON public.quotes
  FOR UPDATE USING (public.get_project_role(project_id) IN ('owner', 'editor'));

CREATE POLICY "q_delete_editor" ON public.quotes
  FOR DELETE USING (public.get_project_role(project_id) IN ('owner', 'editor'));

-- ===========================================
-- 10. CHECKLIST ITEMS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'done')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cl_select_member" ON public.checklist_items
  FOR SELECT USING (public.is_project_member(project_id));

CREATE POLICY "cl_insert_editor" ON public.checklist_items
  FOR INSERT WITH CHECK (public.get_project_role(project_id) IN ('owner', 'editor'));

CREATE POLICY "cl_update_editor" ON public.checklist_items
  FOR UPDATE USING (public.get_project_role(project_id) IN ('owner', 'editor'));

CREATE POLICY "cl_delete_editor" ON public.checklist_items
  FOR DELETE USING (public.get_project_role(project_id) IN ('owner', 'editor'));

-- ===========================================
-- 11. LEGAL TASKS (templates - not project-scoped)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.legal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  offset_days INT
);

-- No RLS needed - these are public seed data
ALTER TABLE public.legal_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legal_tasks_select_all" ON public.legal_tasks FOR SELECT USING (true);

-- ===========================================
-- 12. PROJECT LEGAL TASKS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.project_legal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  legal_task_id UUID NOT NULL REFERENCES public.legal_tasks(id) ON DELETE CASCADE,
  due_date DATE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'done')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_legal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plt_select_member" ON public.project_legal_tasks
  FOR SELECT USING (public.is_project_member(project_id));

CREATE POLICY "plt_insert_editor" ON public.project_legal_tasks
  FOR INSERT WITH CHECK (public.get_project_role(project_id) IN ('owner', 'editor'));

CREATE POLICY "plt_update_editor" ON public.project_legal_tasks
  FOR UPDATE USING (public.get_project_role(project_id) IN ('owner', 'editor'));

-- ===========================================
-- SEED DATA: Legal Tasks
-- ===========================================

-- France
INSERT INTO public.legal_tasks (country, code, title, description, offset_days) VALUES
  ('FR', 'FR-01', 'Gather birth certificates', 'Obtain recent copies of birth certificates (less than 3 months old)', -90),
  ('FR', 'FR-02', 'Publish marriage banns', 'File banns at the town hall (mairie) at least 10 days before ceremony', -30),
  ('FR', 'FR-03', 'Book civil ceremony at mairie', 'Schedule the official civil ceremony with the local mairie', -120),
  ('FR', 'FR-04', 'Prepare marriage file (dossier)', 'Compile all required documents: ID, proof of residence, witness info', -60),
  ('FR', 'FR-05', 'Notarize prenuptial agreement', 'If applicable, have prenup drafted and notarized', -45),
  ('FR', 'FR-06', 'Obtain certificate of celibacy', 'Required for foreign nationals marrying in France', -60),
  ('FR', 'FR-07', 'Submit witness information', 'Provide full names and details of at least 2 witnesses to the mairie', -30),
  ('FR', 'FR-08', 'Collect livret de famille', 'Pick up the family booklet after the ceremony', 1);

-- United States
INSERT INTO public.legal_tasks (country, code, title, description, offset_days) VALUES
  ('US', 'US-01', 'Apply for marriage license', 'Apply at the county clerk office; most states require both partners present', -30),
  ('US', 'US-02', 'Blood test (if required)', 'Some states require blood tests before issuing a license', -45),
  ('US', 'US-03', 'Hire licensed officiant', 'Ensure your officiant is legally authorized to perform marriages in your state', -60),
  ('US', 'US-04', 'Obtain witness signatures', 'Most states require 1-2 witnesses to sign the marriage certificate', 0),
  ('US', 'US-05', 'File signed certificate', 'Submit the signed marriage certificate to the county clerk after the ceremony', 5),
  ('US', 'US-06', 'Update Social Security card', 'If changing name, apply for a new Social Security card', 14),
  ('US', 'US-07', 'Update driver license', 'Visit the DMV to update your name on your driver license', 30);

-- United Kingdom
INSERT INTO public.legal_tasks (country, code, title, description, offset_days) VALUES
  ('UK', 'UK-01', 'Give notice of marriage', 'Both partners must give notice at their local register office at least 28 days before', -35),
  ('UK', 'UK-02', 'Book registrar or venue', 'Ensure your venue is licensed for ceremonies or book a registrar', -180),
  ('UK', 'UK-03', 'Obtain visa (if applicable)', 'Non-UK nationals may need a marriage visitor visa', -90),
  ('UK', 'UK-04', 'Prepare ID documents', 'Passport, birth certificate, proof of address, decree absolute if divorced', -60),
  ('UK', 'UK-05', 'Arrange witnesses', 'At least 2 witnesses aged 16+ must be present at the ceremony', -14),
  ('UK', 'UK-06', 'Collect marriage certificate', 'Order official copies of the marriage certificate after the ceremony', 7),
  ('UK', 'UK-07', 'Update passport and records', 'Apply for updated passport and notify HMRC, bank, etc.', 30);
