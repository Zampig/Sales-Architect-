-- Enable Row Level Security
alter default privileges revoke execute on functions from public;

-- PROFILES
create table public.profiles (
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

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- SESSIONS
create table public.sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  mode text not null,
  persona text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.sessions enable row level security;

create policy "Users can view their own sessions."
  on sessions for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own sessions."
  on sessions for insert
  with check ( auth.uid() = user_id );

-- USER DOCUMENTS
create table public.user_documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  filename text not null,
  content text, -- extracted text content
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_documents enable row level security;

create policy "Users can view their own documents."
  on user_documents for select
  using ( auth.uid() = user_id );

create policy "Users can upload their own documents."
  on user_documents for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own documents."
  on user_documents for delete
  using ( auth.uid() = user_id );
