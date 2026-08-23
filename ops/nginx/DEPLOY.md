# Paper & Pen nginx release procedure

The website files and nginx configuration use separate explicit deployment wrappers. Both wrappers default to dry-run mode.

## Production sequence

1. Review, commit, and push the complete release to `main`.
2. Confirm the worktree is clean and `HEAD` exactly matches `origin/main`.
3. Run `scripts/deploy_site.sh --dry-run`.
4. Run `scripts/deploy_nginx.sh --dry-run`.
5. Run `scripts/deploy_site.sh --deploy`.
6. Run `scripts/deploy_nginx.sh --deploy`.
7. Verify `https://paperandpen.om/llms.txt` returns UTF-8 text.
8. Verify `https://crm.paperandpen.om/` returns a permanent redirect to `https://erp.paperandpen.om/`.

Do not run either live command from an uncommitted branch or a commit that has not reached `origin/main`.

## Nginx safety controls

The nginx wrapper uses only these production targets:

- `/www/server/panel/vhost/nginx/paperandpen.om.conf`
- `/www/server/panel/vhost/nginx/crm.paperandpen.om.conf`

Before live mode it verifies the CRM hostname against the installed certificate, requires at least seven days of certificate validity, validates the proposed configuration in a Linux memory file, checks the current full nginx configuration, records the exact production checksums, and confirms the nginx service is active.

Live mode holds the fixed nonblocking lock `/run/lock/paperandpen-nginx-deploy.lock` for the complete transaction. It stages both files outside the nginx include glob, refuses concurrent changes to either production target, retains timestamped backups under `/www/server/panel/vhost/nginx/.paperandpen-backups/`, checks SHA-256 values, installs through exact temporary paths, runs `nginx -t`, and reloads nginx.

Any installation, validation, reload, service-health, INT, TERM, or HUP failure stages and checksum-verifies both previous files before restoring them. It reloads the restored configuration only after every restore step and the restored `nginx -t` succeed. A failed restore or failed restored configuration test performs no reload and exits with critical status 90.

The wrapper does not change DNS and does not perform broad or recursive deletion.
