-- Run once on existing Postgres (e.g. Aiven) if full schema.sql was applied before invites existed.
alter table employees add column if not exists admin_owner_id uuid references users (id) on delete set null;
alter table employees add column if not exists created_via_invite_id uuid;

create table if not exists staff_invites (
  id uuid primary key default gen_random_uuid(),
  raw_token text,
  token_hash text not null unique,
  admin_user_id uuid not null references users (id) on delete cascade,
  label text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_staff_invites_admin on staff_invites (admin_user_id);
alter table staff_invites add column if not exists raw_token text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'employees_created_via_invite_fk'
  ) then
    alter table employees
      add constraint employees_created_via_invite_fk
      foreign key (created_via_invite_id) references staff_invites (id) on delete set null;
  end if;
end $$;

update employees e
set admin_owner_id = u.id
from users u
where u.email = 'mabubakar@galaxyitt.com.ng'
  and e.admin_owner_id is null;
