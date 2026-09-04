create extension if not exists pgcrypto;

create table if not exists public.owner_settings (
  id boolean primary key default true check (id = true),
  owner_id uuid not null references auth.users(id) on delete cascade
);

create or replace function public.is_current_user_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.owner_settings where owner_id = auth.uid());
$$;

create or replace function public.claim_owner() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into public.owner_settings (id, owner_id) values (true, auth.uid()) on conflict (id) do nothing;
  return public.is_current_user_owner();
end;
$$;
grant execute on function public.claim_owner() to authenticated;
grant execute on function public.is_current_user_owner() to anon, authenticated;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  slug text not null,
  description text not null default '' check (char_length(description) <= 240),
  category text not null default 'Notes',
  tags text[] not null default '{}',
  body_html text not null default '',
  cover_image_path text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create table if not exists public.document_images (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  alt_text text not null check (char_length(alt_text) between 1 and 180),
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index if not exists documents_published_idx on public.documents (is_published, updated_at desc);
create index if not exists documents_category_idx on public.documents (category);
create index if not exists document_images_document_idx on public.document_images (document_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();

alter table public.owner_settings enable row level security;
alter table public.documents enable row level security;
alter table public.document_images enable row level security;

-- The first signed-in account claims the single owner slot. Disable sign-up after claiming it.
drop policy if exists "owner can view owner setting" on public.owner_settings;
create policy "owner can view owner setting" on public.owner_settings for select using (auth.uid() = owner_id);

drop policy if exists "published documents are readable" on public.documents;
create policy "published documents are readable" on public.documents for select using (is_published = true);
drop policy if exists "owner can read all documents" on public.documents;
create policy "owner can read all documents" on public.documents for select using (public.is_current_user_owner() and auth.uid() = owner_id);
drop policy if exists "owner can create documents" on public.documents;
create policy "owner can create documents" on public.documents for insert with check (public.is_current_user_owner() and auth.uid() = owner_id);
drop policy if exists "owner can update documents" on public.documents;
create policy "owner can update documents" on public.documents for update using (public.is_current_user_owner() and auth.uid() = owner_id) with check (public.is_current_user_owner() and auth.uid() = owner_id);
drop policy if exists "owner can delete documents" on public.documents;
create policy "owner can delete documents" on public.documents for delete using (public.is_current_user_owner() and auth.uid() = owner_id);

drop policy if exists "published images are readable" on public.document_images;
create policy "published images are readable" on public.document_images for select using (exists (select 1 from public.documents d where d.id = document_id and d.is_published = true));
drop policy if exists "owner can read image metadata" on public.document_images;
create policy "owner can read image metadata" on public.document_images for select using (public.is_current_user_owner() and auth.uid() = owner_id);
drop policy if exists "owner can create image metadata" on public.document_images;
create policy "owner can create image metadata" on public.document_images for insert with check (public.is_current_user_owner() and auth.uid() = owner_id);
drop policy if exists "owner can update image metadata" on public.document_images;
create policy "owner can update image metadata" on public.document_images for update using (public.is_current_user_owner() and auth.uid() = owner_id) with check (public.is_current_user_owner() and auth.uid() = owner_id);
drop policy if exists "owner can delete image metadata" on public.document_images;
create policy "owner can delete image metadata" on public.document_images for delete using (public.is_current_user_owner() and auth.uid() = owner_id);

insert into storage.buckets (id, name, public) values ('document-images', 'document-images', true) on conflict (id) do nothing;
drop policy if exists "owner uploads document images" on storage.objects;
create policy "owner uploads document images" on storage.objects for insert to authenticated with check (bucket_id = 'document-images' and public.is_current_user_owner() and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "owner updates document images" on storage.objects;
create policy "owner updates document images" on storage.objects for update to authenticated using (bucket_id = 'document-images' and public.is_current_user_owner() and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "owner deletes document images" on storage.objects;
create policy "owner deletes document images" on storage.objects for delete to authenticated using (bucket_id = 'document-images' and public.is_current_user_owner() and (storage.foldername(name))[1] = (select auth.uid()::text));
-- The bucket is public so published readers can load images without a backend proxy.
-- Keep paths random and do not store sensitive images in this bucket.
