-- ============================================================
-- Universal Exports — Supabase schema (shared platform DB)
--
-- Every table is prefixed `exports_` because this app shares the
-- `universal-platform` Supabase project (rygfxgalojojppxmhddo) with the rest
-- of the suite, where bare names like `projects` / `contacts` already belong
-- to other apps. Matches the suite's domain-prefixed convention
-- (workplace_*, coshh_*, signing_events, …).
--
-- CANONICAL APPLY PATH: backoffice/universal-platform/supabase/migrations/
-- 0031_exports_schema.sql (this file is the app-local mirror / reference; keep
-- the two in sync). Apply with `npx supabase db push` from universal-platform,
-- or paste the migration into the Dashboard → SQL Editor.
-- ============================================================

-- PROJECTS
create table public.exports_projects (
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
alter table public.exports_projects enable row level security;
create policy "Users manage own exports projects" on public.exports_projects
  for all using (auth.uid() = user_id);

-- YOUR DETAILS (one row per user)
create table public.exports_your_details (
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
alter table public.exports_your_details enable row level security;
create policy "Users manage own exports details" on public.exports_your_details
  for all using (auth.uid() = user_id);

-- CONTACTS
create table public.exports_contacts (
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
alter table public.exports_contacts enable row level security;
create policy "Users manage own exports contacts" on public.exports_contacts
  for all using (auth.uid() = user_id);

-- BANK ACCOUNTS
create table public.exports_bank_accounts (
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
alter table public.exports_bank_accounts enable row level security;
create policy "Users manage own exports bank accounts" on public.exports_bank_accounts
  for all using (auth.uid() = user_id);

-- PRODUCT CATALOGUE
create table public.exports_product_catalogue (
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
alter table public.exports_product_catalogue enable row level security;
create policy "Users manage own exports products" on public.exports_product_catalogue
  for all using (auth.uid() = user_id);

-- COUNTER-SIGN TOKENS — backs the "They Sign" flow on the Export Agreement page.
-- The drafter creates a token, sends the QR / link to the other party, who opens
-- /sign/:token and counter-signs. The drafter polls/refreshes to see the
-- completed signature plus the counter-signer's name + timestamp.
create table public.exports_agreement_signatures (
  -- Token used in the public URL — random uuid so it can't be guessed.
  id uuid primary key default gen_random_uuid(),
  -- Owner (drafter) project. Plain text, deliberately NO foreign key (same call
  -- as exports_agreement_views): the client-side demo project has no
  -- exports_projects row, so a FK would reject it. Rows are self-contained
  -- snapshots (project_name below), so cascade cleanup isn't needed.
  project_id text not null default '',
  -- Owner. Always set in practice — creating a token requires a saved project and
  -- saving requires sign-in, so anonymous drafting is vestigial (the demo project
  -- mints tokens client-side and never reaches the backend). Kept nullable only to
  -- match the historical column shape.
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
alter table public.exports_agreement_signatures enable row level security;

-- Drafter can manage their own tokens (create + see + revoke).
create policy "Drafter manages own exports agreement signatures"
  on public.exports_agreement_signatures
  for all using (auth.uid() = user_id);

-- NO public insert policy. The old `with check (true)` insert was only ever
-- bounded by the now-removed projects FK; without it, an anon caller could write
-- orphan rows. Inserts are owner-only via the "Drafter manages own…" policy
-- above (its using clause doubles as the insert WITH CHECK, so user_id must equal
-- auth.uid()). Anonymous drafting is vestigial, so nothing legitimate needs the
-- public insert path.

-- NO public select policy. A bare `using (true)` select would let anyone with
-- the anon key dump every row (counter-signer names, base64 signature images,
-- project names and all token uuids) via `GET /exports_agreement_signatures?select=*`.
-- The counter-signer (/sign/:token) instead reads through the token-gated
-- SECURITY DEFINER function below — you only get a row if you already hold its
-- unguessable uuid. The authenticated drafter still lists / polls their own
-- tokens through the "Drafter manages own exports agreement signatures" policy.
create or replace function public.exports_get_agreement_signature(sig_token uuid)
returns setof public.exports_agreement_signatures
language sql
security definer
set search_path = public
stable
as $$
  select * from public.exports_agreement_signatures where id = sig_token;
$$;
grant execute on function public.exports_get_agreement_signature(uuid) to anon, authenticated;

-- NO public update policy either. The old `for update using (status='pending')`
-- policy let any token holder rewrite ANY column (project_name, user_id, …) on a
-- pending row. The counter-signer's two writes go through these column-locked
-- SECURITY DEFINER functions instead: each touches only its own fields and
-- re-checks the pending gate, so a token can still only ever be used once and
-- nothing else on the row can be tampered with.
create or replace function public.exports_mark_agreement_pdf_viewed(sig_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.exports_agreement_signatures
     set viewed_pdf_at = now()
   where id = sig_token and status = 'pending';
$$;
grant execute on function public.exports_mark_agreement_pdf_viewed(uuid) to anon, authenticated;

create or replace function public.exports_submit_agreement_counter_signature(
  sig_token        uuid,
  signer_name      text,
  signer_signature text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.exports_agreement_signatures
     set counter_signer_name      = signer_name,
         counter_signer_signature = signer_signature,
         counter_signed_at        = now(),
         status                   = 'signed'
   where id = sig_token and status = 'pending';
$$;
grant execute on function public.exports_submit_agreement_counter_signature(uuid, text, text)
  to anon, authenticated;

create index if not exists exports_agreement_signatures_user_project_idx
  on public.exports_agreement_signatures(user_id, project_id);

-- READ-ONLY AGREEMENT VIEWS — backs the QR code stamped on every generated
-- Export Agreement PDF. Each generate / sign mints one immutable row: a JSON
-- snapshot of the agreement data plus the PDF itself (data URL, same pattern
-- as the stored signature images), keyed by the random uuid token used in the
-- public /view/:token URL.
create table public.exports_agreement_views (
  -- Token used in the public URL. Supplied by the client (crypto.randomUUID)
  -- because the QR has to be baked into the PDF *before* the row is written.
  id uuid primary key,
  -- Plain text, deliberately NO foreign key: the client-side demo project and
  -- unauthenticated drafters have no exports_projects row, but their QR links
  -- must still work. Rows are self-contained snapshots, so cascade cleanup isn't
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
alter table public.exports_agreement_views enable row level security;

-- Drafter keeps ownership of their own rows (list / revoke later).
create policy "Drafter manages own exports agreement views"
  on public.exports_agreement_views
  for all using (auth.uid() = user_id);

-- No public insert. In a shared prod DB an anon insert path is an
-- unauthenticated-write vector for large base64-PDF rows. Inserts are owner-only
-- via the "Drafter manages own…" for-all policy above (its using clause doubles
-- as the insert WITH CHECK). An unauthenticated drafter / the demo walkthrough
-- simply gets a QR-less PDF — buildPdfWithViewLink falls back when the insert is
-- refused. Mirrors exports_agreement_signatures (also owner-only insert).

-- NO public select policy: a bare `using (true)` select would let anyone with
-- the anon key list every row (PDFs included). Reads instead go through this
-- token-gated SECURITY DEFINER function — you only get the row if you already
-- know its unguessable uuid.
create or replace function public.exports_get_agreement_view(view_token uuid)
returns setof public.exports_agreement_views
language sql
security definer
set search_path = public
stable
as $$
  select * from public.exports_agreement_views where id = view_token;
$$;
grant execute on function public.exports_get_agreement_view(uuid) to anon, authenticated;

create index if not exists exports_agreement_views_user_project_idx
  on public.exports_agreement_views(user_id, project_id);

-- ── PROJECT DELETE CLEANUP + SIGNER PDF (platform migration 0193) ──────────
-- Deleting a project deletes its public agreement views (QR copies, PDFs
-- included) and its counter-sign rows, matched on project id AND owner; and the
-- /sign/:token page reads the newest stored agreement PDF for its project.
create or replace function public.exports_project_delete_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.exports_agreement_views
   where project_id = old.id
     and user_id = old.user_id;

  delete from public.exports_agreement_signatures
   where project_id = old.id
     and user_id = old.user_id;

  return old;
end;
$$;

revoke all on function public.exports_project_delete_cleanup() from public;
revoke all on function public.exports_project_delete_cleanup() from anon, authenticated;

comment on function public.exports_project_delete_cleanup() is
  'Universal Exports (0193): AFTER DELETE on exports_projects — removes the '
  'project''s public agreement views (QR copies, PDFs included) and its '
  'counter-sign rows, matched on project id AND owner.';

drop trigger if exists exports_projects_after_delete_cleanup on public.exports_projects;
create trigger exports_projects_after_delete_cleanup
after delete on public.exports_projects
for each row execute function public.exports_project_delete_cleanup();

-- ── 2. The real PDF for the counter-signer ──────────────────────────────────
create or replace function public.exports_get_agreement_signature_pdf(sig_token uuid)
returns table (view_id uuid, pdf_data text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select v.id, v.pdf_data, v.created_at
    from public.exports_agreement_signatures s
    join public.exports_agreement_views v
      on v.project_id = s.project_id
     and v.user_id    = s.user_id          -- null owner matches nothing
   where s.id = sig_token
   order by v.created_at desc
   limit 1;
$$;

revoke all on function public.exports_get_agreement_signature_pdf(uuid) from public;
grant execute on function public.exports_get_agreement_signature_pdf(uuid) to anon, authenticated;

comment on function public.exports_get_agreement_signature_pdf(uuid) is
  'Universal Exports (0193): for the holder of a counter-sign token, the newest '
  'stored agreement PDF of that token''s project (same owner). Empty when none '
  'has been generated. SECURITY DEFINER: exports_agreement_views has no public '
  'select.';

-- ── LINK-HOLDER HARDENING (platform migration 0241) ─────────────────────────
-- Applied on top of everything above. Replaces the two select-* read RPCs, the
-- owner FOR ALL policies, and the submit RPC.
-- ── 3. What counts as a stored PDF ──────────────────────────────────────────
create or replace function public.exports_pdf_data_ok(p text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  b bytea;
begin
  if p is null or octet_length(p) > 20000000 then
    return false;
  end if;
  if left(p, 28) <> 'data:application/pdf;base64,' then
    return false;
  end if;
  begin
    b := decode(substr(p, 29), 'base64');
  exception when others then
    return false;
  end;
  -- '%PDF-' at the start, '%%EOF' somewhere in the last KB (writers add a
  -- trailing newline or incremental-update padding after it).
  if octet_length(b) < 32 or substring(b from 1 for 5) <> '\x255044462d'::bytea then
    return false;
  end if;
  if position('\x2525454f46'::bytea in substring(b from greatest(1, octet_length(b) - 1023))) = 0 then
    return false;
  end if;
  return true;
end;
$$;

comment on function public.exports_pdf_data_ok(text) is
  'Universal Exports: true for a data:application/pdf;base64 URL of a real PDF '
  '(%PDF- header, %%EOF trailer) under 20 MB of text. Used by a CHECK on '
  'exports_agreement_views.pdf_data.';

alter table public.exports_agreement_views
  drop constraint if exists exports_agreement_views_pdf_ok,
  drop constraint if exists exports_agreement_views_snapshot_size,
  drop constraint if exists exports_agreement_views_name_len;
alter table public.exports_agreement_views
  add constraint exports_agreement_views_pdf_ok check (public.exports_pdf_data_ok(pdf_data)),
  add constraint exports_agreement_views_snapshot_size check (octet_length(snapshot::text) <= 1000000),
  add constraint exports_agreement_views_name_len check (char_length(project_name) <= 500);

alter table public.exports_agreement_signatures
  drop constraint if exists exports_agreement_signatures_name_len,
  drop constraint if exists exports_agreement_signatures_signer_len,
  drop constraint if exists exports_agreement_signatures_signature_ok;
alter table public.exports_agreement_signatures
  add constraint exports_agreement_signatures_name_len check (char_length(project_name) <= 500),
  add constraint exports_agreement_signatures_signer_len check (char_length(coalesce(counter_signer_name, '')) <= 200),
  add constraint exports_agreement_signatures_signature_ok check (
    coalesce(counter_signer_signature, '') = ''
    or (octet_length(counter_signer_signature) <= 2000000
        and counter_signer_signature ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$')
  );

-- ── 4. Owners read, create and delete; nobody updates directly ──────────────
drop policy if exists "Drafter manages own exports agreement signatures" on public.exports_agreement_signatures;
drop policy if exists "Drafter reads own exports agreement signatures" on public.exports_agreement_signatures;
drop policy if exists "Drafter creates pending exports agreement signatures" on public.exports_agreement_signatures;
drop policy if exists "Drafter deletes own exports agreement signatures" on public.exports_agreement_signatures;

create policy "Drafter reads own exports agreement signatures"
  on public.exports_agreement_signatures for select
  using (auth.uid() = user_id);
create policy "Drafter creates pending exports agreement signatures"
  on public.exports_agreement_signatures for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and coalesce(counter_signer_name, '') = ''
    and coalesce(counter_signer_signature, '') = ''
    and counter_signed_at is null
    and viewed_pdf_at is null
  );
create policy "Drafter deletes own exports agreement signatures"
  on public.exports_agreement_signatures for delete
  using (auth.uid() = user_id);

drop policy if exists "Drafter manages own exports agreement views" on public.exports_agreement_views;
drop policy if exists "Drafter reads own exports agreement views" on public.exports_agreement_views;
drop policy if exists "Drafter creates own exports agreement views" on public.exports_agreement_views;
drop policy if exists "Drafter deletes own exports agreement views" on public.exports_agreement_views;

create policy "Drafter reads own exports agreement views"
  on public.exports_agreement_views for select
  using (auth.uid() = user_id);
create policy "Drafter creates own exports agreement views"
  on public.exports_agreement_views for insert
  with check (auth.uid() = user_id);
create policy "Drafter deletes own exports agreement views"
  on public.exports_agreement_views for delete
  using (auth.uid() = user_id);

revoke update, truncate, references, trigger on public.exports_agreement_signatures from anon, authenticated;
revoke update, truncate, references, trigger on public.exports_agreement_views from anon, authenticated;

-- ── 1. Explicit columns for link holders ────────────────────────────────────
drop function if exists public.exports_get_agreement_signature(uuid);
create function public.exports_get_agreement_signature(sig_token uuid)
returns table (
  id                       uuid,
  project_name             text,
  status                   text,
  counter_signer_name      text,
  counter_signer_signature text,
  counter_signed_at        timestamptz,
  viewed_pdf_at            timestamptz,
  created_at               timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select s.id, s.project_name, s.status, s.counter_signer_name,
         s.counter_signer_signature, s.counter_signed_at, s.viewed_pdf_at,
         s.created_at
    from public.exports_agreement_signatures s
   where s.id = sig_token;
$$;
revoke all on function public.exports_get_agreement_signature(uuid) from public;
grant execute on function public.exports_get_agreement_signature(uuid) to anon, authenticated;

drop function if exists public.exports_get_agreement_view(uuid);
create function public.exports_get_agreement_view(view_token uuid)
returns table (
  id           uuid,
  project_name text,
  snapshot     jsonb,
  pdf_data     text,
  created_at   timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select v.id, v.project_name, v.snapshot, v.pdf_data, v.created_at
    from public.exports_agreement_views v
   where v.id = view_token;
$$;
revoke all on function public.exports_get_agreement_view(uuid) from public;
grant execute on function public.exports_get_agreement_view(uuid) to anon, authenticated;

-- ── 2. Viewed means a PDF was there to view; signing needs it ───────────────
create or replace function public.exports_mark_agreement_pdf_viewed(sig_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.exports_agreement_signatures s
     set viewed_pdf_at = now()
   where s.id = sig_token
     and s.status = 'pending'
     and exists (
       select 1 from public.exports_agreement_views v
        where v.project_id = s.project_id
          and v.user_id    = s.user_id
     );
$$;
revoke all on function public.exports_mark_agreement_pdf_viewed(uuid) from public;
grant execute on function public.exports_mark_agreement_pdf_viewed(uuid) to anon, authenticated;

create or replace function public.exports_submit_agreement_counter_signature(
  sig_token        uuid,
  signer_name      text,
  signer_signature text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name   text := btrim(coalesce(signer_name, ''));
  v_status text;
  v_viewed timestamptz;
begin
  if v_name = '' or char_length(v_name) > 200 then
    raise exception 'exports: the signer''s name must be 1 to 200 characters'
      using errcode = '22023';
  end if;
  if signer_signature is null
     or octet_length(signer_signature) > 2000000
     or signer_signature !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' then
    raise exception 'exports: the signature must be a PNG, JPEG or WebP image under 2 MB'
      using errcode = '22023';
  end if;

  select s.status, s.viewed_pdf_at into v_status, v_viewed
    from public.exports_agreement_signatures s
   where s.id = sig_token
   for update;

  if not found or v_status <> 'pending' then
    -- Unknown, revoked or already used: nothing to do (the page reads the row
    -- back and shows what is on record, as it always has).
    return;
  end if;
  if v_viewed is null then
    raise exception 'exports: open the agreement before signing it'
      using errcode = '42501';
  end if;

  update public.exports_agreement_signatures
     set counter_signer_name      = v_name,
         counter_signer_signature = signer_signature,
         counter_signed_at        = now(),
         status                   = 'signed'
   where id = sig_token
     and status = 'pending';
end;
$$;
revoke all on function public.exports_submit_agreement_counter_signature(uuid, text, text) from public;
grant execute on function public.exports_submit_agreement_counter_signature(uuid, text, text) to anon, authenticated;
