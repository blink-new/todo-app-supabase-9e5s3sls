
-- Create enum for todo categories
create type todo_category as enum (
  'personal',
  'work',
  'shopping',
  'health',
  'other'
);

-- Add new columns to todos table
alter table todos 
  add column category todo_category default 'other',
  add column due_date timestamp with time zone;

-- Add index for faster category filtering
create index todos_category_idx on todos(category);

-- Add index for due date queries
create index todos_due_date_idx on todos(due_date);