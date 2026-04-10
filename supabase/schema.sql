-- ============================================================
-- eboxy Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- PROJECTS
create table public.projects (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default '',
  role text not null default '',
  forms jsonb not null default '{}',
  locked_sections text[] not null default '{}',
  saved_sections text[] not null default '{}',
  eboxy_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
create policy "Users manage own projects" on public.projects
  for all using (auth.uid() = user_id);

-- YOUR DETAILS (one row per user)
create table public.your_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  registered_name text default '',
  trading_name text default '',
  company_number text default '',
  vat_number text default '',
  eori_number text default '',
  address text default '',
  country text default 'United Kingdom',
  contact_name text default '',
  telephone text default '',
  email text default '',
  updated_at timestamptz default now()
);
alter table public.your_details enable row level security;
create policy "Users manage own details" on public.your_details
  for all using (auth.uid() = user_id);

-- CONTACTS
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  registered_name text default '',
  trading_name text default '',
  company_number text default '',
  vat_number text default '',
  eori_number text default '',
  address text default '',
  country text default '',
  contact_name text default '',
  telephone text default '',
  email text default '',
  created_at timestamptz default now()
);
alter table public.contacts enable row level security;
create policy "Users manage own contacts" on public.contacts
  for all using (auth.uid() = user_id);

-- BANK ACCOUNTS
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('your', 'party')),
  key text not null,
  account_name text default '',
  bank_name text default '',
  sort_code text default '',
  account_number text default '',
  iban text default '',
  bic_swift text default '',
  currency text default '',
  created_at timestamptz default now(),
  unique (user_id, type, key)
);
alter table public.bank_accounts enable row level security;
create policy "Users manage own bank accounts" on public.bank_accounts
  for all using (auth.uid() = user_id);

-- PRODUCT CATALOGUE
create table public.product_catalogue (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  code text default '',
  hs_code text default '',
  name text not null default '',
  description text default '',
  unit_price numeric not null default 0,
  vat_percent numeric not null default 0,
  created_at timestamptz default now()
);
alter table public.product_catalogue enable row level security;
create policy "Users manage own products" on public.product_catalogue
  for all using (auth.uid() = user_id);
