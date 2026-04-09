alter table employee_documents add column if not exists doc_kind text;
alter table employee_documents add column if not exists mime_type text;
alter table employee_documents add column if not exists size_bytes integer;
alter table employee_documents add column if not exists content_base64 text;
alter table employee_documents add column if not exists text_content text;
alter table employee_documents add column if not exists uploaded_by_user_id uuid references users(id) on delete set null;
alter table employee_documents add column if not exists is_employee_submission boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employee_documents_doc_kind_chk'
  ) then
    alter table employee_documents
      add constraint employee_documents_doc_kind_chk
      check (doc_kind in ('job_profile', 'okr_admin', 'okr_employee')) not valid;
  end if;
end $$;

create index if not exists idx_employee_documents_employee_kind_date
  on employee_documents (employee_id, doc_kind, uploaded_date desc);
