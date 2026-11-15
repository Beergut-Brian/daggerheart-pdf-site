#!/usr/bin/env bash
# Local WordPress + Bricks environment for one web job on the mini PC (rootless Docker, cto user).
#   wp-site.sh setup    <job-dir> <port>   create the job's containers, install WordPress, Kaden's stack,
#                                         Bricks abilities, MCP, Bricks skills (safe to re-run)
#   wp-site.sh up       <job-dir>          start the job's containers again (after `down`)
#   wp-site.sh down     <job-dir>          stop them (data kept)
#   wp-site.sh status   <job-dir>
#   wp-site.sh wp       <job-dir> <args>   run WP-CLI against the job's site (e.g. `wp-site.sh wp $JOB plugin list`)
#   wp-site.sh export   <job-dir>          database dump + uploads list into site/exports/ (run at every phase end)
#   wp-site.sh restore  <job-dir>          empty database: re-import site/exports/db.sql
#   wp-site.sh package  <job-dir>          handoff: db dump + wp-content zip in <job-dir>/handoff/, AI tools off, WPVivid on
#   wp-site.sh teardown <job-dir> --confirm
#                                         REMOVE the local site after launch (Kaden's approval only): both containers,
#                                         the database volume and wp/. Keeps site/ (git) and handoff/.
#
# Everything the local site uses belongs to the job and carries the label ai-hub.job=<slug>, so teardown
# leaves nothing behind (Kaden's rule: no old sites lying around after launch):
#   <slug>-wpdb       mariadb:11, named volume <slug>-wpdbdata, owns the network namespace, publishes
#                     127.0.0.1:<port> (Kaden: ssh -L <port>:127.0.0.1:<port> <box>)
#   <slug>-web        ai-hub-leader image running `php -S 0.0.0.0:<port>` on wp/, in <slug>-wpdb's namespace
#   <job-dir>/wp/     WordPress files (not in git; rebuilt from exports)
#   <job-dir>/site/   the Leader's git repo: CLAUDE.md, .claude/, .mcp.json, exports/, docs/
# The Leader starts with `run-leader.sh --net-of <slug>-wpdb`, so localhost:<port> and the database
# (127.0.0.1:3306) are the same for it, for WP-CLI and for the Bricks MCP.
# Never points at a live site. Local admin password is written to site/.env.local (gitignored).
set -euo pipefail
CMD="${1:?command}"; [ "$CMD" = setup ] && mkdir -p "${2:?job dir}"
JOB="$(cd "${2:?job dir}" && pwd -P)"
WP="$JOB/wp"; SITE="$JOB/site"
STACK="${WP_STACK:-$HOME/.local/share/ai-hub/wordpress-plugin-stack}"   # Kaden's licensed plugins; outside /srv/ai-hub so Leaders never read the source
SKILLS_HOME="$HOME/.cache/ai-hub-bricks-skills"
IMAGE="${LEADER_IMAGE:-ai-hub-leader:latest}" DB_IMAGE=mariadb:11
SLUG="$(basename "$JOB" | tr 'A-Z_' 'a-z-' | tr -cd 'a-z0-9-' | cut -c1-40)"
DBC="$SLUG-wpdb" WEB="$SLUG-web" VOL="$SLUG-wpdbdata" LABEL="ai-hub.job=$SLUG"
log() { echo "wp-site: $*"; }
die() { echo "wp-site: $1" >&2; exit "${2:-1}"; }
exists()  { [ -n "$(docker ps -aq -f "name=^$1$")" ]; }
running() { [ -n "$(docker ps -q -f "name=^$1$")" ]; }
wpc() { docker exec -w "$WP" "$WEB" wp --path="$WP" "$@"; }
port_of() { docker inspect -f '{{range $p, $b := .HostConfig.PortBindings}}{{(index $b 0).HostPort}}{{end}}' "$DBC"; }

up() {   # create or start both containers; $1 = port (only used when creating)
  if exists "$DBC"; then running "$DBC" || docker start "$DBC" >/dev/null
  else
    [ -n "${1:-}" ] || die "first setup needs a port"
    docker run -d --name "$DBC" --label "$LABEL" --restart unless-stopped -p "127.0.0.1:$1:$1" \
      -e MARIADB_ROOT_PASSWORD=root -e MARIADB_DATABASE=wp -e MARIADB_USER=wp -e MARIADB_PASSWORD=wp \
      -v "$VOL:/var/lib/mysql" "$DB_IMAGE" >/dev/null
  fi
  for _ in $(seq 60); do docker exec "$DBC" mariadb-admin ping -uwp -pwp --silent >/dev/null 2>&1 && break; sleep 1; done
  docker exec "$DBC" mariadb-admin ping -uwp -pwp --silent >/dev/null 2>&1 || die "mariadb did not become ready"
  local port; port="$(port_of)"
  if exists "$WEB"; then running "$WEB" || docker start "$WEB" >/dev/null
  else
    mkdir -p "$WP"
    docker run -d --name "$WEB" --label "$LABEL" --restart unless-stopped --network "container:$DBC" \
      -e PHP_CLI_SERVER_WORKERS=4 -v "$JOB:$JOB" -w "$WP" "$IMAGE" php -S "0.0.0.0:$port" -t "$WP" >/dev/null
  fi
  log "up: $DBC + $WEB, http://localhost:$port"
}

stack_copy() {   # copy one plugin/theme folder (or <name>.zip) from Kaden's stack; drop Finder duplicate folders ("includes 2")
  local name="$1" dst="$2" src="$STACK/$1"
  rm -rf "$dst"
  if [ -d "$src" ]; then cp -R "$src" "$dst"
  elif [ -f "$src.zip" ]; then local tmp; tmp="$(mktemp -d)"; unzip -q "$src.zip" -d "$tmp"
    if [ -d "$tmp/$name" ]; then mv "$tmp/$name" "$dst"; rm -rf "$tmp"; else mv "$tmp" "$dst"; fi
  else log "missing in stack: $name"; return 1; fi
  local dups; dups="$(find "$dst" -type d -name '* [0-9]' | wc -l)"
  [ "$dups" = 0 ] || { find "$dst" -depth -type d -name '* [0-9]' -exec rm -rf {} +; log "WARNING $name: removed $dups Finder duplicate folders; ask Kaden for a clean copy"; }
}

bricks_skills() {
  if [ ! -d "$SKILLS_HOME/.git" ]; then
    mkdir -p "$(dirname "$SKILLS_HOME")"
    git clone -q https://github.com/codeerhq/bricks-skills.git "$SKILLS_HOME"
  fi
  # pin to the latest published release (upstream's own script); fall back to the clone as-is
  ( cd "$SKILLS_HOME" && { [ -x scripts/bricks-skills-upgrade ] && scripts/bricks-skills-upgrade >/dev/null 2>&1 || true; } )
  mkdir -p "$SITE/.claude/skills"
  for s in "$SKILLS_HOME"/skills/bricks-*; do [ -d "$s" ] && cp -R "$s" "$SITE/.claude/skills/"; done
  log "bricks skills $(cat "$SKILLS_HOME/VERSION" 2>/dev/null) -> site/.claude/skills ($(ls -d "$SITE"/.claude/skills/bricks-* 2>/dev/null | wc -l))"
}

case "$CMD" in
setup)
  PORT="${3:?port (8090 and up; 8000/9000 are taken)}"
  up "$PORT"; PORT="$(port_of)"
  mkdir -p "$SITE/exports" "$SITE/docs"
  if [ ! -f "$WP/wp-config.php" ]; then
    wpc core download --quiet
    wpc config create --dbname=wp --dbuser=wp --dbpass=wp --dbhost=127.0.0.1 --skip-check --quiet
    wpc config set WP_ENVIRONMENT_TYPE local --quiet
    wpc config set DISALLOW_FILE_EDIT true --raw --quiet
  fi
  if ! wpc core is-installed 2>/dev/null; then
    PASS="$(python3 -c 'import secrets;print(secrets.token_urlsafe(18))')"
    wpc core install --url="http://localhost:$PORT" --title="$(basename "$JOB")" --admin_user=admin \
      --admin_password="$PASS" --admin_email=admin@example.test --skip-email --quiet
    printf 'WP_URL=http://localhost:%s\nWP_ADMIN_USER=admin\nWP_ADMIN_PASSWORD=%s\n' "$PORT" "$PASS" > "$SITE/.env.local"
    grep -qxF '.env.local' "$SITE/.gitignore" 2>/dev/null || echo '.env.local' >> "$SITE/.gitignore"
  fi
  if [ -d "$STACK" ]; then
    stack_copy bricks "$WP/wp-content/themes/bricks"
    for p in automatic-css frames-plugin meta-box meta-box-aio ws-form-pro ws-form-option ws-form-post ws-form-user happyfiles-pro mcp-adapter schemawp-pro; do
      { [ -d "$STACK/$p" ] || [ -f "$STACK/$p.zip" ]; } && stack_copy "$p" "$WP/wp-content/plugins/$p"
    done
    wpc theme activate bricks --quiet
    # Bricks grants the administrator its builder capabilities on the admin's first wp-admin visit (admin_init).
    # WP-CLI never fires admin_init, so call Bricks' own routine; without it every design ability is refused.
    wpc --user=admin eval '\Bricks\Capabilities::set_administrator_capabilities();'
    wpc cap list administrator | grep -q bricks_full_access || die "Bricks builder capabilities not granted"
    # Meta Box AIO bundles Meta Box; activate the plugins the brief's stack names (default: all of Kaden's standard stack)
    for p in mcp-adapter automatic-css schemawp-pro frames-plugin meta-box-aio ws-form-pro happyfiles-pro; do  # schemawp-pro needs automatic-css first
      [ -d "$WP/wp-content/plugins/$p" ] && { wpc plugin activate "$p" --quiet 2>/dev/null || log "could not activate $p (check its log)"; }
    done
    # Bricks abilities on (local only). Default-off categories such as permissions and execute-php stay off.
    wpc eval '$g=get_option("bricks_global_settings",[]); if(!is_array($g))$g=[]; $g["abilitiesApi"]=true; update_option("bricks_global_settings",$g);
              $m=get_option("bricks_mcp_settings",[]); if(!is_array($m))$m=[]; $m["enabled"]=true; update_option("bricks_mcp_settings",$m);'
  else
    log "WARNING: plugin stack not found at $STACK; WordPress core only. Re-run setup when it arrives."
  fi
  # The Leader runs in its own container joined to $DBC's namespace with /srv/ai-hub mounted at the same path.
  printf '{"mcpServers":{"bricks":{"type":"stdio","command":"wp","args":["mcp-adapter","serve","--user=admin","--path=%s"]}}}\n' "$WP" > "$SITE/.mcp.json"
  bricks_skills
  log "ready: http://localhost:$PORT (admin login in site/.env.local). Leader: run-leader.sh --net-of $DBC"
  ;;
up) up ;;
down) docker stop "$WEB" "$DBC" >/dev/null 2>&1 || true; log "stopped $WEB $DBC (data kept)" ;;
status) docker ps -a -f "label=$LABEL" --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'; docker volume ls -f "name=^$VOL$" --format 'volume {{.Name}}' ;;
wp) shift 2; wpc "$@" ;;
export)
  mkdir -p "$SITE/exports"
  wpc db export "$SITE/exports/db.sql" --quiet
  (cd "$WP/wp-content/uploads" 2>/dev/null && find . -type f | sort) > "$SITE/exports/uploads.txt" || true
  log "exported to site/exports (commit it; uploads stay in wp/, list in uploads.txt)" ;;
restore)
  up
  [ -f "$SITE/exports/db.sql" ] || die "no export to restore"
  if [ "$(docker exec "$DBC" mariadb -uwp -pwp -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='wp'")" = "0" ]; then
    wpc db import "$SITE/exports/db.sql" --quiet; log "database restored from site/exports/db.sql"
  else log "database already present; nothing restored"; fi ;;
package)
  mkdir -p "$JOB/handoff"; STAMP="$(date +%Y%m%d-%H%M)"
  # safety copy first, then prepare the site for Kaden's own WPVivid export
  wpc db export "$JOB/handoff/db-$STAMP.sql" --quiet
  docker exec -w "$WP" "$WEB" zip -qr "$JOB/handoff/wp-content-$STAMP.zip" wp-content -x 'wp-content/cache/*'
  wpc eval '$m=get_option("bricks_mcp_settings",[]); if(!is_array($m))$m=[]; $m["enabled"]=false; update_option("bricks_mcp_settings",$m);
            $g=get_option("bricks_global_settings",[]); if(is_array($g)){unset($g["abilitiesApi"]); update_option("bricks_global_settings",$g);}'
  wpc plugin deactivate mcp-adapter schemawp-pro --quiet || true   # Kaden re-enables them on the live site for sites Brian manages
  wpc plugin is-installed wpvivid-backuprestore || wpc plugin install wpvivid-backuprestore --quiet
  wpc plugin activate wpvivid-backuprestore --quiet
  log "handoff ready: AI tools off, WPVivid active. Kaden logs in at $(wpc option get siteurl)/wp-admin (login in site/.env.local) and exports with WPVivid."
  log "safety copies in handoff/: db-$STAMP.sql, wp-content-$STAMP.zip. After launch, on Kaden's approval only: wp-site.sh teardown $JOB --confirm" ;;
teardown)
  [ "${3:-}" = --confirm ] || die "teardown removes the local site for good (containers, database volume, wp/). Only after launch and Kaden's approval: wp-site.sh teardown $JOB --confirm" 2
  ls "$JOB"/handoff/db-*.sql >/dev/null 2>&1 || log "WARNING: no handoff/db-*.sql safety copy exists"
  docker rm -f "$WEB" "$DBC" >/dev/null 2>&1 || true
  docker volume rm "$VOL" >/dev/null 2>&1 || true
  rm -rf "$WP" "$SITE/.mcp.json"
  left="$(docker ps -aq -f "label=$LABEL"; docker volume ls -q -f "name=^$VOL$")"
  [ -z "$left" ] || die "teardown incomplete, still present: $left"
  log "removed $WEB, $DBC, volume $VOL and wp/. Kept: site/ (git) and handoff/." ;;
*) die "unknown command: $CMD" 2 ;;
esac
