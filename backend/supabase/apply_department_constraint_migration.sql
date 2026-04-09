do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'employees_department_allowed_chk'
  ) then
    alter table employees
      add constraint employees_department_allowed_chk
      check (
        department in (
          'Finance and Accounting (Financial Control, Treasury, Financial Operations, Credit Control)',
          'Corporate Services (Facility Management, Fleet Management, Physical Security)',
          'Sales and Marketing',
          'Customer Support Services',
          'Research and Development',
          'Technical Operations',
          'Digital Skills Development',
          'Information Security'
        )
      ) not valid;
  end if;
end $$;
