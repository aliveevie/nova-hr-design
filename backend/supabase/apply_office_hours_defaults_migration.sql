-- Safe defaults: normalize legacy 00:00–23:59 office hours to 09:00–17:00 (additive update only).

update office_locations
set open_time = '09:00'
where open_time is null or open_time in ('00:00', '');

update office_locations
set close_time = '17:00'
where close_time is null or close_time in ('23:59', '');

update office_locations
set auto_start_enabled = true
where auto_start_enabled is null;
