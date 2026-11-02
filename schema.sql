-- PropFirm Africa database schema
-- Run this entire file in Supabase Dashboard > SQL Editor.
-- Then create your user in Authentication > Users and grant admin access
-- using the final INSERT statement below.

create extension if not exists pgcrypto;

create table if not exists public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  description text,
  country text,
  account_sizes text[] not null default '{}',
  challenge_type text,
  profit_split numeric(5,2),
  min_days integer,
  daily_drawdown numeric(6,2),
  max_drawdown numeric(6,2),
  challenge_fee numeric(12,2),
  payout_frequency text,
  platform text,
  discount_code text,
  affiliate_url text,
  status text not null default 'draft' check (status in ('active','draft')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references public.firms(id) on delete set null,
  page text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  reviewer_name text not null check (char_length(reviewer_name) between 1 and 60),
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 1500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Public view: only active firms are visible. Affiliate destinations are included
-- because visitors need them to use the offers. Commission data is not stored here.
create or replace view public.firms_public
with (security_invoker = true)
as
select id, name, website, description, country, account_sizes, challenge_type,
       profit_split, min_days, daily_drawdown, max_drawdown, challenge_fee,
       payout_frequency, platform, discount_code, affiliate_url, featured, status
from public.firms
where status = 'active';

alter table public.firms enable row level security;
alter table public.user_roles enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.reviews enable row level security;

-- Firms: public reads only via the active-only view; admins manage all records.
drop policy if exists "Admins manage firms" on public.firms;
create policy "Admins manage firms" on public.firms
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- View needs select permission on the underlying table; RLS policy exposes active rows only.
drop policy if exists "Public can read active firms" on public.firms;
create policy "Public can read active firms" on public.firms
for select to anon, authenticated using (status = 'active' or public.is_admin());

-- Roles: only admins can inspect roles. Users cannot self-assign.
drop policy if exists "Admins read roles" on public.user_roles;
create policy "Admins read roles" on public.user_roles
for select to authenticated using (public.is_admin());

-- Clicks: anonymous visitors can record a click; only admins can read.
drop policy if exists "Anyone can record affiliate clicks" on public.affiliate_clicks;
create policy "Anyone can record affiliate clicks" on public.affiliate_clicks
for insert to anon, authenticated with check (true);
drop policy if exists "Admins read affiliate clicks" on public.affiliate_clicks;
create policy "Admins read affiliate clicks" on public.affiliate_clicks
for select to authenticated using (public.is_admin());

-- Reviews: visitors submit pending reviews; only admins read/moderate.
drop policy if exists "Anyone can submit a review" on public.reviews;
create policy "Anyone can submit a review" on public.reviews
for insert to anon, authenticated with check (status = 'pending');
drop policy if exists "Admins manage reviews" on public.reviews;
create policy "Admins manage reviews" on public.reviews
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.firms_public to anon, authenticated;
grant select on public.firms to anon, authenticated;
grant insert, update, delete on public.firms to authenticated;
grant insert on public.affiliate_clicks to anon, authenticated;
grant select on public.affiliate_clicks to authenticated;
grant insert on public.reviews to anon, authenticated;
grant select, update, delete on public.reviews to authenticated;
grant select on public.user_roles to authenticated;

-- IMPORTANT: Replace the email with the email address of the user you create
-- in Supabase Authentication > Users. Run this after creating that user.
-- insert into public.user_roles (id, role)
-- select id, 'admin' from auth.users where email = 'YOUR-ADMIN-EMAIL';
