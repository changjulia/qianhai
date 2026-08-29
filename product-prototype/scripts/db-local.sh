#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

npx wrangler d1 migrations apply site-creator-d1 --local
for table_name in enterprises products industry_facts assets inspirations contents customers opportunities orders; do
  npx wrangler d1 execute site-creator-d1 --local --command \
    "SELECT '$table_name' AS entity, COUNT(*) AS count FROM $table_name;"
done
npx wrangler d1 execute site-creator-d1 --local --command "PRAGMA foreign_key_check;"
npx wrangler d1 execute site-creator-d1 --local --command \
  "SELECT ROUND(SUM(amount_cny), 0) AS pipeline_cny FROM opportunities; SELECT ROUND(SUM(amount_cny), 0) AS demo_revenue_cny FROM orders;"
