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

-- COUNTER-SIGN TOKENS — backs the "They Sign" flow on the Export Agreement page.
-- The drafter creates a token, sends the QR / link to the other party, who opens
-- /sign/:token and counter-signs. The drafter polls/refreshes to see the
-- completed signature plus the counter-signer's name + timestamp.
create table public.agreement_signatures (
  -- Token used in the public URL — random uuid so it can't be guessed.
  id uuid primary key default gen_random_uuid(),
  -- Owner (drafter) project. Cascade so deleting the project cleans up tokens.
  project_id text references public.projects(id) on delete cascade not null,
  -- Nullable: an unauthenticated drafter can still generate a counter-sign link
  -- (the token uuid in the URL is the bearer credential). Set when signed in so
  -- the drafter retains ownership of their tokens.
  user_id uuid references auth.users(id) on delete cascade,
  -- Snapshot of the project name at token creation so the counter-signer sees
  -- a sensible header even if the drafter renames the project later.
  project_name text not null default '',
  status text not null default 'pending' check (status in ('pending', 'signed')),
  -- Captured from the counter-signer after they sign.
  counter_signer_name text default '',
  counter_signer_signature text default '',      -- base64 PNG data URL
  counter_signed_at timestamptz,
  -- Set when they click "Open document" — gates the signature pad until they
  -- have actually viewed the PDF. Prevents blind-signing.
  viewed_pdf_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.agreement_signatures enable row level security;

-- Drafter can manage their own tokens (create + see + revoke).
create policy "Drafter manages own agreement signatures"
  on public.agreement_signatures
  for all using (auth.uid() = user_id);

-- Public create so an unauthenticated drafter can still generate a link. The
-- random uuid token is the bearer credential; rows expose only the project
-- name, not PII. Authenticated drafters are covered by the policy above (this
-- one simply permits the anonymous insert path too).
create policy "Public create agreement signatures"
  on public.agreement_signatures
  for insert with check (true);

-- Public read so the counter-signer can load the token row without auth.
-- The token itself (random uuid in the URL) is the bearer credential — no
-- enumeration possible and the row exposes only the project name, not PII.
create policy "Public read by token"
  on public.agreement_signatures
  for select using (true);

-- Public update so the counter-signer can mark `viewed_pdf_at` and submit
-- their signature. The check constraint locks them out once `status='signed'`
-- so a token can only ever be used once.
create policy "Public update pending signatures"
  on public.agreement_signatures
  for update using (status = 'pending')
  with check (status in ('pending', 'signed'));

create index if not exists agreement_signatures_user_project_idx
  on public.agreement_signatures(user_id, project_id);

-- READ-ONLY AGREEMENT VIEWS — backs the QR code stamped on every generated
-- Export Agreement PDF. Each generate / sign mints one immutable row: a JSON
-- snapshot of the agreement data plus the PDF itself (data URL, same pattern
-- as the stored signature images), keyed by the random uuid token used in the
-- public /view/:token URL.
create table public.agreement_views (
  -- Token used in the public URL. Supplied by the client (crypto.randomUUID)
  -- because the QR has to be baked into the PDF *before* the row is written.
  id uuid primary key,
  -- Plain text, deliberately NO foreign key: the client-side demo project and
  -- unauthenticated drafters have no `projects` row, but their QR links must
  -- still work. Rows are self-contained snapshots, so cascade cleanup isn't
  -- needed for correctness.
  project_id text not null default '',
  user_id uuid references auth.users(id) on delete cascade,
  project_name text not null default '',
  -- AgreementPdfInput snapshot (signature image stripped) for the page render.
  snapshot jsonb not null default '{}',
  -- The generated PDF as a data URL (data:application/pdf;base64,...).
  pdf_data text not null default '',
  created_at timestamptz not null default now()
);
alter table public.agreement_views enable row level security;

-- Drafter keeps ownership of their own rows (list / revoke later).
create policy "Drafter manages own agreement views"
  on public.agreement_views
  for all using (auth.uid() = user_id);

-- Public insert so an unauthenticated drafter can still mint a view link.
-- The check stops callers stamping someone else's user_id onto a row.
create policy "Public create agreement views"
  on public.agreement_views
  for insert with check (user_id is null or user_id = auth.uid());

-- NO public select policy: a bare `using (true)` select would let anyone with
-- the anon key list every row (PDFs included). Reads instead go through this
-- token-gated SECURITY DEFINER function — you only get the row if you already
-- know its unguessable uuid.
create or replace function public.get_agreement_view(view_token uuid)
returns setof public.agreement_views
language sql
security definer
set search_path = public
stable
as $$
  select * from public.agreement_views where id = view_token;
$$;
grant execute on function public.get_agreement_view(uuid) to anon, authenticated;

create index if not exists agreement_views_user_project_idx
  on public.agreement_views(user_id, project_id);
