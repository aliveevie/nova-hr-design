-- Additive migration: browser-captured (DigitalPersona WebSDK) fingerprints
-- matched server-side with SourceAFIS. Production-safe: only ADDS columns,
-- never drops/truncates. Existing libfprint rows keep working untouched.
--
-- New enrollments store:
--   * template_data      = SourceAFIS serialized template (bytea, existing col)
--   * template_format    = 'sourceafis-3'   (existing col, distinguishes engine)
--   * fingerprint_image  = original PNG captured in the browser (for re-extraction
--                          if the SourceAFIS version ever changes)
--   * image_dpi          = DPI used when extracting the template

alter table employee_fingerprint_templates
  add column if not exists fingerprint_image bytea;

alter table employee_fingerprint_templates
  add column if not exists image_dpi integer;
