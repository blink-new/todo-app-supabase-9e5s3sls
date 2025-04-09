
-- Create todos table if it doesn't exist
create table if not exists todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  is_complete boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table todos enable row level security;

-- Create RLS policies
create policy "Users can create their own todos"
  on todos for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own todos"
  on todos for select
  using (auth.uid() = user_id);

create policy "Users can update their own todos"
  on todos for update
  using (auth.uid() = user_id);

create policy "Users can delete their own todos"
  on todos for delete
  using (auth.uid() = user_id);

-- Create indexes
create index todos_user_id_idx on todos(user_id);
create index todos_created_at_idx on todos(created_at);