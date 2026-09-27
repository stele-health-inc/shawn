-- Instagram saves library schema

create table if not exists public.saves (
  id               uuid primary key default gen_random_uuid(),
  url              text not null,
  shortcode        text not null unique,
  media_type       text,                       -- video | image | carousel
  creator          text,                       -- @handle without the @
  creator_name     text,
  caption          text,
  posted_at        timestamptz,
  saved_at         timestamptz not null default now(),
  thumbnail_url    text,
  image_urls       text[] not null default '{}',
  raw_transcript   text,
  transcript       text,                       -- cleaned script
  summary          text,
  hook             text,
  tags             text[] not null default '{}',
  category         text,
  status           text not null default 'unreviewed'
                     check (status in ('unreviewed', 'keep', 'content', 'done')),
  remake_idea      boolean not null default false,
  remake_note      text,
  notes            text,
  processing_state text not null default 'pending'
                     check (processing_state in ('pending', 'processing', 'ready', 'error')),
  error            text,
  source           text,
  updated_at       timestamptz not null default now()
);

create index if not exists saves_saved_at_idx on public.saves (saved_at desc);
create index if not exists saves_status_idx on public.saves (status);
create index if not exists saves_tags_idx on public.saves using gin (tags);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists saves_touch on public.saves;
create trigger saves_touch before update on public.saves
  for each row execute function public.touch_updated_at();

-- Only the server (service role) talks to this table.
alter table public.saves enable row level security;

-- Public bucket for thumbnails / post images (Instagram CDN links expire).
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
