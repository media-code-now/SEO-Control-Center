## Staging QA Checklist

1. **Environment & Auth**
   - [ ] Confirm `.env` values (Google OAuth, database, `QA_PASSCODE`) are configured on staging.
   - [ ] Visit `/signin`, verify Google SSO button renders and QA login form is hidden in production.
   - [ ] Validate QA credentials work on staging preview (if allowed) and that prod hides the form.

2. **Integrations & Secrets**
   - [ ] Connect a Search Console + GA4 project and ensure tokens are stored server-side (check DB).
   - [ ] Trigger manual GSC/GA4 imports from Settings → integrations; confirm success toast/log entry.
   - [ ] Verify audit log records each import with actor + timestamp under Settings → Audit log.

3. **Core CRUD Flows**
   - [ ] Create/edit/delete Keywords and Pages from their dashboards; ensure tables refresh immediately.
   - [ ] Add a content brief via generator, attach it to a task, and confirm mapping visible on the Kanban card.
   - [ ] Create/drag/delete a task across Kanban columns and check audit log entries.

4. **Data Imports & Dashboards**
   - [ ] Run nightly cron equivalent (manual trigger if needed) for GSC/GA4 and confirm dashboard charts update.
   - [ ] Validate Top Opportunities + metric cards show data from latest seed/import.
   - [ ] Run link suggestions + mail merge export to ensure CSV download and audit log capture.

5. **Prospect Manager**
   - [ ] Add/edit/delete a prospect and template, update stages, and confirm counts update.
   - [ ] Export mail merge CSV filtered by stage and verify file contents.

6. **Security & Access**
   - [ ] Ensure sensitive env vars (Google secrets, QA passcode) are never exposed in client bundles.
   - [ ] Confirm audit viewer only displays for workspace owners.
   - [ ] Attempt to call protected APIs without session and verify 401/403 responses.

7. **Automated Regression**
   - [ ] Run `npm run test:e2e` and `npm run test:unit`; ensure both suites pass in staging CI.
   - [ ] Capture Playwright report artifact for recordkeeping when running in CI.
