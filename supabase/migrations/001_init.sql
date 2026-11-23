create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (length(trim(name)) > 0),
  color text not null default 'hsl(174 72% 50%)',
  created_at timestamptz not null default now());
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  deck_id uuid references public.decks(id) on delete set null,
  question text not null default '', answer text not null default '',
  image_url text, image_side text not null default 'front' check (image_side in ('front','back')),
  next_review timestamptz not null default now(),
  interval numeric not null default 0, ease numeric not null default 2.5,
  created_at timestamptz not null default now(),
  check ((length(trim(question))>0 and length(trim(answer))>0) or image_url is not null));
create table public.review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  created_at timestamptz not null default now());
create index on public.decks(user_id);
create index on public.cards(user_id, next_review);
create index on public.cards(deck_id);
create index on public.review_logs(user_id, created_at);
create index on public.review_logs(card_id);
alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.review_logs enable row level security;
create policy "own decks" on public.decks for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own cards" on public.cards for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own logs" on public.review_logs for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
