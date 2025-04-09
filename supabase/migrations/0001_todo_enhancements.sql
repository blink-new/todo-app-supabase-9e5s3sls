
-- Create enum for todo categories
create type todo_category as enum (
  'personal',
  'work',
  'shopping',
  'health',
  'other'
);

-- Drop existing category column and constraints
alter table todos drop column category;

-- Add new category column with enum type
alter table todos 
  add column category todo_category default 'other';

-- Drop existing indexes if they exist
drop index if exists todos_category_idx;
drop index if exists todos_due_date_idx;

-- Add index for faster category filtering
create index todos_category_idx on todos(category);

-- Add index for due date queries
create index todos_due_date_idx on todos(due_date);