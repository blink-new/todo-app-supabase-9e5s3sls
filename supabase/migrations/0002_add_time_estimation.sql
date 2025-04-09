
-- Add time_estimate column to todos table
alter table todos 
  add column time_estimate text;

-- Drop existing index if it exists
drop index if exists todos_time_estimate_idx;

-- Create index for time estimates
create index todos_time_estimate_idx on todos(time_estimate);

-- Update existing todos to have null time_estimate
update todos set time_estimate = null where time_estimate is null;