-- Create notification_settings table for cross-device notification preferences
create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

-- Policy: users can read their own settings
create policy "Users can select own notification_settings"
on public.notification_settings
for select
using (auth.uid() = user_id);

-- Policy: users can insert their own settings
create policy "Users can insert own notification_settings"
on public.notification_settings
for insert
with check (auth.uid() = user_id);

-- Policy: users can update their own settings
create policy "Users can update own notification_settings"
on public.notification_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Helpful index for updated_at queries
create index if not exists idx_notification_settings_updated_at
  on public.notification_settings(updated_at desc);

comment on table public.notification_settings is 'Stores user notification preferences (sound, browser toggles, types) for cross-device sync.';
