create extension if not exists pgcrypto;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  constraint households_invite_code_format check (invite_code ~ '^[A-Z0-9]{6}$')
);

create table public.allowed_emails (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  email text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint allowed_emails_lowercase check (email = lower(email))
);

create table public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  name text not null,
  avatar_color text not null,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  constraint members_email_lowercase check (email = lower(email)),
  constraint members_avatar_hex check (avatar_color ~ '^#[0-9a-fA-F]{6}$')
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  category text not null,
  unit text not null,
  current_qty numeric not null default 0,
  min_threshold numeric not null default 1,
  split_member_ids uuid[] not null default array[]::uuid[],
  split_mode text not null default 'equal',
  split_custom jsonb,
  needs_restock boolean generated always as (current_qty <= min_threshold) stored,
  photo_url text,
  serving_size numeric,
  serving_unit text,
  total_weight numeric,
  daily_servings numeric,
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  constraint items_category_check check (
    category in ('kitchen', 'household', 'gym', 'bathroom', 'other')
  ),
  constraint items_split_mode_check check (split_mode in ('equal', 'custom')),
  constraint items_qty_nonnegative check (current_qty >= 0 and min_threshold >= 0),
  constraint items_gym_numbers_nonnegative check (
    coalesce(serving_size, 0) >= 0
    and coalesce(total_weight, 0) >= 0
    and coalesce(daily_servings, 0) >= 0
  )
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  amount numeric not null,
  paid_by uuid not null references public.members(id),
  source text not null,
  splits jsonb not null default '[]'::jsonb,
  item_id uuid references public.items(id) on delete set null,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  notes text,
  constraint expenses_source_check check (
    source in ('grocery', 'gym', 'rent', 'bill', 'maintenance', 'other')
  ),
  constraint expenses_amount_positive check (amount > 0),
  constraint expenses_splits_array check (jsonb_typeof(splits) = 'array')
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  bill_type text not null,
  amount numeric not null,
  due_day integer not null,
  cadence text not null,
  split_member_ids uuid[] not null default array[]::uuid[],
  split_mode text not null default 'equal',
  split_custom jsonb,
  payer_rotation uuid[] not null default array[]::uuid[],
  current_payer_index integer not null default 0,
  is_active boolean not null default true,
  next_due_date date not null,
  created_at timestamptz not null default now(),
  constraint bills_bill_type_check check (
    bill_type in ('rent', 'electricity', 'wifi', 'water', 'gas', 'maid', 'society', 'other')
  ),
  constraint bills_cadence_check check (
    cadence in ('monthly', 'quarterly', 'weekly', 'one-time')
  ),
  constraint bills_split_mode_check check (split_mode in ('equal', 'custom')),
  constraint bills_amount_positive check (amount > 0),
  constraint bills_due_day_range check (due_day between 1 and 28),
  constraint bills_current_payer_index_nonnegative check (current_payer_index >= 0)
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  from_member_id uuid not null references public.members(id),
  to_member_id uuid not null references public.members(id),
  amount numeric not null,
  settled_at timestamptz not null default now(),
  payment_ref text,
  constraint settlements_amount_positive check (amount > 0),
  constraint settlements_distinct_members check (from_member_id <> to_member_id)
);

create index members_household_id_idx on public.members(household_id);
create index allowed_emails_household_id_idx on public.allowed_emails(household_id);
create index items_household_id_idx on public.items(household_id);
create index expenses_household_id_date_idx on public.expenses(household_id, date desc);
create index bills_household_due_idx on public.bills(household_id, next_due_date);
create index settlements_household_id_idx on public.settlements(household_id);

create or replace function public.auth_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.avatar_palette()
returns text[]
language sql
immutable
as $$
  select array['#6366f1', '#14b8a6', '#fb7185', '#f59e0b', '#a855f7'];
$$;

create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i integer;
begin
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;

  return code;
end;
$$;

create or replace function public.generate_unique_invite_code()
returns text
language plpgsql
volatile
as $$
declare
  code text;
begin
  loop
    code := public.generate_invite_code();
    exit when not exists (
      select 1 from public.households where invite_code = code
    );
  end loop;

  return code;
end;
$$;

create or replace function public.is_active_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.id = auth.uid()
      and m.household_id = p_household_id
      and m.is_active
  );
$$;

create or replace function public.is_household_admin(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.id = auth.uid()
      and m.household_id = p_household_id
      and m.is_active
      and m.is_admin
  );
$$;

create or replace function public.member_belongs_to_household(
  p_member_id uuid,
  p_household_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.id = p_member_id
      and m.household_id = p_household_id
  );
$$;

create or replace function public.assert_email_allowed(
  p_email text,
  p_household_id uuid default null
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.allowed_emails ae
    where ae.email = lower(p_email)
      and (p_household_id is null or ae.household_id is null or ae.household_id = p_household_id)
  ) then
    raise exception 'This email is not allowlisted for HomeOS.';
  end if;
end;
$$;

create or replace function public.create_household(
  p_name text,
  p_member_name text
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household public.households;
  user_email text := public.auth_email();
  palette text[] := public.avatar_palette();
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  perform public.assert_email_allowed(user_email, null);

  if exists (select 1 from public.members where id = auth.uid()) then
    raise exception 'This account already belongs to a household.';
  end if;

  insert into public.households (name, invite_code)
  values (p_name, public.generate_unique_invite_code())
  returning * into new_household;

  insert into public.members (
    id,
    household_id,
    email,
    name,
    avatar_color,
    is_admin
  )
  values (
    auth.uid(),
    new_household.id,
    user_email,
    coalesce(nullif(trim(p_member_name), ''), split_part(user_email, '@', 1)),
    palette[1],
    true
  );

  update public.allowed_emails
  set household_id = new_household.id,
      accepted_at = now()
  where email = user_email;

  return new_household;
end;
$$;

create or replace function public.join_household(
  p_invite_code text,
  p_member_name text
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household public.households;
  user_email text := public.auth_email();
  palette text[] := public.avatar_palette();
  member_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into target_household
  from public.households
  where invite_code = upper(trim(p_invite_code));

  if target_household.id is null then
    raise exception 'Invalid invite code.';
  end if;

  perform public.assert_email_allowed(user_email, target_household.id);

  if exists (select 1 from public.members where id = auth.uid()) then
    raise exception 'This account already belongs to a household.';
  end if;

  select count(*)
  into member_count
  from public.members
  where household_id = target_household.id;

  if member_count >= 6 then
    raise exception 'HomeOS supports up to 6 members per household.';
  end if;

  insert into public.members (
    id,
    household_id,
    email,
    name,
    avatar_color,
    is_admin
  )
  values (
    auth.uid(),
    target_household.id,
    user_email,
    coalesce(nullif(trim(p_member_name), ''), split_part(user_email, '@', 1)),
    palette[(member_count % array_length(palette, 1)) + 1],
    false
  );

  update public.allowed_emails
  set household_id = target_household.id,
      accepted_at = now()
  where email = user_email;

  return target_household;
end;
$$;

create or replace function public.regenerate_invite_code(p_household_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if not public.is_household_admin(p_household_id) then
    raise exception 'Only admins can regenerate invite codes.';
  end if;

  new_code := public.generate_unique_invite_code();

  update public.households
  set invite_code = new_code
  where id = p_household_id;

  return new_code;
end;
$$;

create or replace function public.update_member_profile(
  p_name text,
  p_avatar_color text
)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_member public.members;
begin
  update public.members
  set name = coalesce(nullif(trim(p_name), ''), name),
      avatar_color = p_avatar_color
  where id = auth.uid()
    and is_active
  returning * into updated_member;

  if updated_member.id is null then
    raise exception 'Active member profile not found.';
  end if;

  return updated_member;
end;
$$;

create or replace function public.deactivate_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_member public.members;
  remaining_admins integer;
begin
  select * into target_member
  from public.members
  where id = p_member_id;

  if target_member.id is null then
    raise exception 'Member not found.';
  end if;

  if not public.is_household_admin(target_member.household_id) then
    raise exception 'Only admins can deactivate members.';
  end if;

  if target_member.is_admin then
    select count(*)
    into remaining_admins
    from public.members
    where household_id = target_member.household_id
      and is_active
      and is_admin
      and id <> p_member_id;

    if remaining_admins = 0 then
      raise exception 'A household must always have at least one active admin.';
    end if;
  end if;

  update public.members
  set is_active = false
  where id = p_member_id;
end;
$$;

create or replace function public.before_user_created_allowlist(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  incoming_email text := lower(coalesce(event -> 'user' ->> 'email', event ->> 'email', ''));
begin
  if incoming_email = '' then
    raise exception 'Email is required.';
  end if;

  if not exists (
    select 1 from public.allowed_emails where email = incoming_email
  ) then
    raise exception 'This email is not allowlisted for HomeOS.';
  end if;

  return event;
end;
$$;

alter table public.households enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.members enable row level security;
alter table public.items enable row level security;
alter table public.expenses enable row level security;
alter table public.bills enable row level security;
alter table public.settlements enable row level security;

create policy "active members can read their household"
on public.households for select
using (public.is_active_member(id));

create policy "admins can update household"
on public.households for update
using (public.is_household_admin(id))
with check (public.is_household_admin(id));

create policy "active members can read household members"
on public.members for select
using (public.is_active_member(household_id));

create policy "admins can manage allowed emails"
on public.allowed_emails for all
using (household_id is not null and public.is_household_admin(household_id))
with check (household_id is not null and public.is_household_admin(household_id));

create policy "active members can read items"
on public.items for select
using (public.is_active_member(household_id));

create policy "active members can create items"
on public.items for insert
with check (
  public.is_active_member(household_id)
  and created_by = auth.uid()
);

create policy "active members can update items"
on public.items for update
using (public.is_active_member(household_id))
with check (public.is_active_member(household_id));

create policy "active members can delete items"
on public.items for delete
using (public.is_active_member(household_id));

create policy "active members can read expenses"
on public.expenses for select
using (public.is_active_member(household_id));

create policy "active members can create expenses"
on public.expenses for insert
with check (
  public.is_active_member(household_id)
  and public.member_belongs_to_household(paid_by, household_id)
);

create policy "active members can read bills"
on public.bills for select
using (public.is_active_member(household_id));

create policy "active members can create bills"
on public.bills for insert
with check (public.is_active_member(household_id));

create policy "active members can update bills"
on public.bills for update
using (public.is_active_member(household_id))
with check (public.is_active_member(household_id));

create policy "active members can read settlements"
on public.settlements for select
using (public.is_active_member(household_id));

create policy "active members can create settlements"
on public.settlements for insert
with check (
  public.is_active_member(household_id)
  and public.member_belongs_to_household(from_member_id, household_id)
  and public.member_belongs_to_household(to_member_id, household_id)
);

alter table public.items replica identity full;
alter table public.expenses replica identity full;
alter table public.bills replica identity full;
alter table public.settlements replica identity full;

alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.bills;
alter publication supabase_realtime add table public.settlements;

insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', false)
on conflict (id) do nothing;

create policy "active members can read item photos"
on storage.objects for select
using (
  bucket_id = 'item-photos'
  and exists (
    select 1
    from public.members m
    where m.id = auth.uid()
      and m.is_active
  )
);

create policy "active members can upload item photos"
on storage.objects for insert
with check (
  bucket_id = 'item-photos'
  and exists (
    select 1
    from public.members m
    where m.id = auth.uid()
      and m.is_active
  )
);
