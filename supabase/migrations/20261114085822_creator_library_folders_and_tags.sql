-- Add creator-owned library folders and tags without replacing saved listing data.
alter table public.listings add column folder text not null default 'Uncategorized';
alter table public.listings add column tags text[] not null default '{}';
alter table public.listings add constraint listings_folder_length_check check (char_length(folder) between 1 and 60);
create index listings_user_folder_created_idx on public.listings(user_id,folder,created_at desc);
