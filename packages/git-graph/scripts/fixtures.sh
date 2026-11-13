#!/usr/bin/env bash
# Builds three scratch repositories and records real git transcripts, each command with what it printed, as the test
# fixtures. The dates are fixed, so the hashes come out the same on every run.
set -euo pipefail
rm -f "$(cd "$(dirname "$0")/.." && pwd)"/test/fixtures/*.txt
out="$(cd "$(dirname "$0")/.." && pwd)/test/fixtures"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
export LC_ALL=C LANG=C LANGUAGE=C GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null GIT_AUTHOR_NAME="Ada" GIT_AUTHOR_EMAIL="ada@example.com" GIT_COMMITTER_NAME="Ada" GIT_COMMITTER_EMAIL="ada@example.com"
t=1767225600
tick() { t=$((t + 3600)); export GIT_AUTHOR_DATE="@$t +0000" GIT_COMMITTER_DATE="@$t +0000"; }
g() { tick; git -c init.defaultBranch=main -c advice.detachedHead=false -c core.hooksPath=/dev/null "$@" >/dev/null 2>&1; }
c() { mkdir -p "$(dirname "$2")"; echo "$1" >> "$2"; g add -A; g commit -qm "$1"; }
sha() { git log main --format=%h -F --grep="$1" -n1; }
# Records "$ git ..." and its output, as an agent would paste it from a terminal.
rec() { local f="$1"; shift; { echo "$ git $*"; git -c core.hooksPath=/dev/null "$@" 2>&1 || true; } >> "$f"; }

# --- history: how 1.5 shipped
cd "$work" && mkdir history && cd history && g init
c "Release 1.4" CHANGELOG.md; g tag v1.4.0
for s in "Bump Vite to 8" "Cache the font files" "Log slow queries" "Split the settings page" "Retry flaky uploads" "Tidy the README"; do c "$s" "src/$s.txt"; done
g switch -c feat/search; c "Index titles" src/search.ts
g switch main; c "Upgrade the router" src/router.ts
g switch feat/search; c "Rank by recency" src/search.ts; g merge --no-ff main -m "Merge branch 'main' into feat/search"; c "Highlight matches" src/search.ts
g switch -c feat/billing main; c "Add the invoices table" src/billing.ts; c "Draft the pricing page" src/pricing.ts
g switch main; g merge --no-ff feat/search -m "Merge pull request #90 from acme/feat/search"; g branch -D feat/search
g switch -c release/1.5; g tag v1.5.0-rc.1
g switch main; c "Drop Node 20" package.json
g switch release/1.5; c "Fix the RC's broken migration" db/migrate.ts; g tag v1.5.0
g switch main; g cherry-pick -x release/1.5
g switch feat/billing; g rebase main; c "Charge in cents" src/billing.ts
g switch -c fix/footer main; c "Fix a typo in the footer" src/footer.ts
g switch main; g merge --no-ff fix/footer -m "Merge pull request #97 from acme/fix/footer"; g branch -D fix/footer
rec "$out/history.txt" log --all --graph --oneline --decorate --parents
rec "$out/history.txt" cherry -v main release/1.5

# --- stack: three PRs, the bottom one squash-merged, the rest restacked
cd "$work" && mkdir stack && cd stack && g init
c "Release 1.4" CHANGELOG.md
g switch -c stack/session-api; c "Add the session endpoint" src/session.ts
g switch -c stack/sign-in-form; c "Sign-in form" src/form.vue; c "Remember the last email" src/form.vue
g switch -c stack/sign-in-docs; c "Document signing in" docs/sign-in.md
g switch main; c "Bump Vite to 8" package.json
rec "$out/stack.txt" log --all --graph --oneline --decorate --parents

# --- backport: fixes on main, tried on three release branches
cd "$work" && mkdir backport && cd backport && g init
printf 'props: rows\n' > src_table.txt; mkdir -p src && mv src_table.txt src/Table.vue
printf 'settings\nsession\n' > src/settings.ts; printf 'errors\n' > src/errors.ts; g add -A; g commit -qm "Release 2.2.14"; g tag v2.2.14
c "Read the legacy CSV dialect" src/csv.ts; g tag v2.3.9
c "Pin the export worker to two threads" src/export.ts; g tag v2.4.3
g switch -c release/2.2 v2.2.14; printf 'errors on 2.2\n' > src/errors.ts; printf 'settings on 2.2\n' > src/settings.ts; g commit -qam "Retry the webhook once on a 502"
g switch -c release/2.3-enterprise-bundle v2.3.9; c "Bundle the enterprise SKU" src/sku.ts
g switch -c release/2.4 v2.4.3; printf 'props: renamedRows\n' > src/Table.vue; g commit -qam "Rename the table's rows prop"
g switch main
c "Alert links keep their filters (#812)" src/alerts.ts
c "Stop polling closed flows (#815)" src/flows.ts
printf 'errors\nquiet 4xx\n' > src/errors.ts; g commit -qam "Quiet expected 4xx errors (#818)"
c "Empty replacement no longer crashes the table (#821)" src/replace.ts
printf 'props: rows\nfree memory\n' > src/Table.vue; printf 'settings\nsession\nfree memory\n' > src/settings.ts; g commit -qam "Release memory after a long session (#826)"
c "Engine 422s name the field (#827)" src/engine.ts
# release/2.4 already has the first two fixes.
g switch release/2.4; for s in "Alert links keep their filters (#812)" "Stop polling closed flows (#815)"; do g cherry-pick "$(sha "$s")"; done
g switch main
o="$out/backport.txt"
rec "$o" log --graph --oneline --decorate --parents main release/2.4 release/2.3-enterprise-bundle release/2.2
pick() { local b="$1"; shift; rec "$o" switch "$b"; local args=(); for s in "$@"; do args+=("$(sha "$s")"); done; rec "$o" cherry-pick "${args[@]}"; while [ -f .git/CHERRY_PICK_HEAD ] || [ -d .git/sequencer ]; do rec "$o" cherry-pick --skip; done; }
rec "$o" cherry -v release/2.4 main
pick release/2.4 "Quiet expected" "Empty replacement" "Release memory" "Engine 422s"
pick release/2.3-enterprise-bundle "Stop polling" "Quiet expected" "Release memory" "Engine 422s"
pick release/2.2 "Stop polling" "Quiet expected" "Release memory"
