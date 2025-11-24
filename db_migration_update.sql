-- Safe Migration Script
-- Run this in the Supabase SQL Editor. It will update existing tables and policies without deleting data.

-- 1. Ensure Tables Exist (Idempotent)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  title text,
  company text,
  email text,
  coaching_style text,
  voice_preference text,
  updated_at timestamp with time zone,
  constraint username_length check (char_length(full_name) >= 3)
);

create table if not exists public.sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  mode text not null,
  persona text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.user_documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  filename text not null,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS (Idempotent)
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.user_documents enable row level security;

-- 3. Update Policies (Drop and Recreate to ensure correctness)

-- Profiles
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Sessions
drop policy if exists "Users can view their own sessions." on sessions;
create policy "Users can view their own sessions."
  on sessions for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own sessions." on sessions;
create policy "Users can insert their own sessions."
  on sessions for insert
  with check ( auth.uid() = user_id );

-- User Documents
drop policy if exists "Users can view their own documents." on user_documents;
create policy "Users can view their own documents."
  on user_documents for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can upload their own documents." on user_documents;
create policy "Users can upload their own documents."
  on user_documents for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can delete their own documents." on user_documents;
create policy "Users can delete their own documents."
  on user_documents for delete
  using ( auth.uid() = user_id );
