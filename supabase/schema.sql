-- ============================================================
--  Faiz.Money — skema Supabase
--  Jalankan seluruh isi file ini di SQL Editor Supabase.
-- ============================================================

create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount numeric(16, 2) not null check (amount >= 0),
  category text not null default 'lainnya',
  note text not null default '',
  merchant text not null default '',
  occurred_at timestamptz not null,
  source text not null default 'manual' check (source in ('manual', 'voice', 'receipt', 'qris')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc);

create index if not exists transactions_user_updated_idx
  on public.transactions (user_id, updated_at desc);

alter table public.transactions enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Catatan: updated_at diisi oleh aplikasi (last-write-wins),
-- jadi sengaja tidak memakai trigger agar sinkronisasi tetap konsisten.
