-- Development seed data for testing in v0 preview
-- This creates a demo user, project, and sample data

-- Insert demo profile (must match DEV_USER id in dev-auth.ts)
INSERT INTO public.profiles (id, full_name, avatar_url) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo User',
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Insert demo project
INSERT INTO public.projects (id, name, wedding_date, location, country, guest_count, currency, total_budget, style, created_by) 
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Marie & Lucas Wedding',
  '2025-09-15',
  'Château de Versailles',
  'FR',
  120,
  'EUR',
  50000,
  'elegant',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Add demo user as project owner
INSERT INTO public.project_members (project_id, user_id, role) 
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'owner'
) ON CONFLICT (project_id, user_id) DO NOTHING;

-- Create default categories with French wedding budget allocations
INSERT INTO public.categories (project_id, name, default_percent, sort_order)
SELECT 
  '00000000-0000-0000-0000-000000000010',
  name,
  percent,
  sort
FROM (VALUES
  ('Venue & Catering', 40, 1),
  ('Photography & Video', 12, 2),
  ('Flowers & Decoration', 10, 3),
  ('Music & Entertainment', 8, 4),
  ('Wedding Attire', 8, 5),
  ('Invitations & Stationery', 3, 6),
  ('Wedding Rings', 3, 7),
  ('Transportation', 3, 8),
  ('Wedding Planner', 5, 9),
  ('Miscellaneous', 8, 10)
) AS t(name, percent, sort)
ON CONFLICT DO NOTHING;

-- Create sample vendors
INSERT INTO public.vendors (project_id, name, type, email, phone, status)
SELECT 
  '00000000-0000-0000-0000-000000000010',
  name,
  type,
  email,
  phone,
  status
FROM (VALUES
  ('Château de Versailles', 'venue', 'events@chateauversailles.fr', '+33 1 30 83 78 00', 'contracted'),
  ('Pierre Leblanc Photography', 'photographer', 'pierre@leblanc-photo.fr', '+33 6 12 34 56 78', 'contacted'),
  ('Fleurs de Paris', 'florist', 'contact@fleursdeparis.fr', '+33 1 42 36 20 20', 'contacted'),
  ('DJ Antoine Music', 'entertainment', 'antoine@djmusic.fr', '+33 6 98 76 54 32', 'prospect')
) AS t(name, type, email, phone, status)
ON CONFLICT DO NOTHING;

-- Create sample checklist items
INSERT INTO public.checklist_items (project_id, title, description, due_date, status)
SELECT 
  '00000000-0000-0000-0000-000000000010',
  title,
  description,
  due_date,
  status
FROM (VALUES
  ('Book the venue', 'Finalize contract with Château de Versailles', '2025-01-15', 'completed'),
  ('Hire photographer', 'Review portfolios and book Pierre Leblanc', '2025-02-01', 'in_progress'),
  ('Order flowers', 'Meet with florist to select arrangements', '2025-05-01', 'not_started'),
  ('Send invitations', 'Mail invitations 3 months before wedding', '2025-06-15', 'not_started'),
  ('Book accommodation for guests', 'Reserve hotel blocks near venue', '2025-03-01', 'not_started')
) AS t(title, description, due_date, status)
ON CONFLICT DO NOTHING;

-- Create project legal tasks for France
INSERT INTO public.project_legal_tasks (project_id, legal_task_id, due_date, status)
SELECT 
  '00000000-0000-0000-0000-000000000010',
  lt.id,
  DATE '2025-09-15' + (lt.offset_days || ' days')::INTERVAL,
  CASE 
    WHEN lt.offset_days < -180 THEN 'completed'
    WHEN lt.offset_days < -90 THEN 'in_progress'
    ELSE 'not_started'
  END
FROM public.legal_tasks lt
WHERE lt.country = 'FR'
ON CONFLICT DO NOTHING;
