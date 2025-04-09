
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create todos table
create table if not exists todos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  is_complete boolean default false,
  category text check (category in ('personal', 'work', 'shopping', 'health', 'other')) default 'other',
  due_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table todos enable row level security;

-- Create policies
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
create index todos_category_idx on todos(category);
create index todos_due_date_idx on todos(due_date);

-- Create updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_todos_updated_at
  before update on todos
  for each row
  execute function update_updated_at_column();