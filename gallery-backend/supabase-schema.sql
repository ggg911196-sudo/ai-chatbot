-- ============================================
-- گالری مشترک تصاویر — اسکیمای Supabase
-- اجرا در: Supabase Dashboard → SQL Editor → New query
-- ============================================

-- ۱) جدول گالری
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  created_at timestamptz not null default now()
);

alter table public.gallery enable row level security;

drop policy if exists "gallery public read" on public.gallery;
create policy "gallery public read"
  on public.gallery for select using (true);

drop policy if exists "gallery public insert" on public.gallery;
create policy "gallery public insert"
  on public.gallery for insert with check (true);

-- ۲) باکت ذخیره‌سازی عکس‌ها (عمومی، حداکثر ۳۰۰ کیلوبایت، فقط JPEG)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 307200, array['image/jpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = 307200,
      allowed_mime_types = array['image/jpeg'];

drop policy if exists "gallery storage public read" on storage.objects;
create policy "gallery storage public read"
  on storage.objects for select using (bucket_id = 'gallery');

drop policy if exists "gallery storage anon upload" on storage.objects;
create policy "gallery storage anon upload"
  on storage.objects for insert with check (bucket_id = 'gallery');
