#!/usr/bin/env bash
set -Eeuo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
api_base_url="${API_BASE_URL:-http://localhost:3101}"
run_id="${E2E_RUN_ID:-e2e-$(date -u +%Y%m%dT%H%M%SZ)-$$-${RANDOM}}"
actor_id="e2e-test-runner-${run_id}"
server_pid=""
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/guikesong-e2e.XXXXXX")"
cleanup_attempted=0
dev_vars_created=0

log() { printf '[backend-e2e] %s\n' "$*"; }
fail() { printf '[backend-e2e] ERROR: %s\n' "$*" >&2; exit 1; }

request() {
  local method="$1" path="$2" body="${3:-}" expected="${4:-200}"
  local response_file="$tmp_dir/response.json" status
  if [[ -n "$body" ]]; then
    status="$(curl --silent --show-error --output "$response_file" --write-out '%{http_code}' \
      --request "$method" "$api_base_url$path" \
      --header 'content-type: application/json' \
      --header "oai-authenticated-user-id: $actor_id" \
      --header "oai-authenticated-user-email: ${actor_id}@example.invalid" \
      --header 'oai-authenticated-user-name: Backend E2E Runner' \
      --header 'x-organization-id: org-demo-guikesong' \
      --data "$body")"
  else
    status="$(curl --silent --show-error --output "$response_file" --write-out '%{http_code}' \
      --request "$method" "$api_base_url$path" \
      --header "oai-authenticated-user-id: $actor_id" \
      --header "oai-authenticated-user-email: ${actor_id}@example.invalid" \
      --header 'oai-authenticated-user-name: Backend E2E Runner' \
      --header 'x-organization-id: org-demo-guikesong')"
  fi
  [[ "$status" == "$expected" ]] || {
    printf '[backend-e2e] %s %s returned HTTP %s (expected %s)\n' "$method" "$path" "$status" "$expected" >&2
    sed -n '1,80p' "$response_file" >&2
    return 1
  }
  jq -e . "$response_file" >/dev/null || fail "$method $path did not return JSON"
  cat "$response_file"
}

workflow() {
  local action="$1" payload='{}' expected="${3:-200}"
  if (($# >= 2)); then payload="$2"; fi
  local body
  body="$(jq -cn --arg action "$action" --arg runId "$run_id" --argjson payload "$payload" \
    '{action:$action,runId:$runId,payload:$payload}')"
  request POST /api/workflow "$body" "$expected"
}

assert_json() {
  local json="$1" expression="$2" message="$3"
  jq -e "$expression" <<<"$json" >/dev/null || {
    printf '[backend-e2e] assertion failed: %s\nJSON: %s\n' "$message" "$json" >&2
    exit 1
  }
}

cleanup_run() {
  ((cleanup_attempted == 0)) || return 0
  cleanup_attempted=1
  log "cleaning isolated run $run_id"
  if curl --silent --fail --output "$tmp_dir/cleanup.json" \
    --request POST "$api_base_url/api/workflow" \
    --header 'content-type: application/json' \
    --header "oai-authenticated-user-id: $actor_id" \
    --header "oai-authenticated-user-email: ${actor_id}@example.invalid" \
    --header 'oai-authenticated-user-name: Backend E2E Runner' \
    --header 'x-organization-id: org-demo-guikesong' \
    --data "$(jq -cn --arg runId "$run_id" '{action:"cleanup_run",runId:$runId}')"; then
    jq -e '.ok == true' "$tmp_dir/cleanup.json" >/dev/null || {
      log "cleanup endpoint returned an unexpected response"
      cat "$tmp_dir/cleanup.json" >&2
    }
  else
    log "WARNING: cleanup request failed for $run_id; inspect the local test database" >&2
  fi
}

finish() {
  local exit_code=$?
  trap - EXIT
  set +e
  cleanup_run
  if ((exit_code != 0)) && [[ -f "$tmp_dir/server.log" ]]; then
    log 'local backend log (tail):'
    tail -80 "$tmp_dir/server.log" >&2
  fi
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  if ((dev_vars_created == 1)); then
    rm -f -- "$project_dir/.dev.vars"
  fi
  rm -rf -- "$tmp_dir"
  exit "$exit_code"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

start_server_if_needed() {
  if curl --silent --fail --max-time 2 "$api_base_url/api/health" >/dev/null 2>&1; then
    log "using running backend at $api_base_url"
    return
  fi
  [[ "$api_base_url" == "http://localhost:3101" ]] || fail "backend unavailable at API_BASE_URL=$api_base_url"
  log "starting isolated local backend"
  if [[ ! -e "$project_dir/.dev.vars" ]]; then
    printf 'APP_ENV=test\nALLOW_DEMO_ACTOR=true\nDEFAULT_NEW_USER_ROLE_ID=role-admin\n' >"$project_dir/.dev.vars"
    dev_vars_created=1
  fi
  (cd "$project_dir" && exec env VINEXT_NO_DEV_LOCK=1 APP_ENV=test ALLOW_DEMO_ACTOR=true \
    ./node_modules/.bin/vinext dev --host localhost --port 3101 >"$tmp_dir/server.log" 2>&1) &
  server_pid=$!
  for _ in $(seq 1 60); do
    curl --silent --fail --max-time 2 "$api_base_url/api/health" >/dev/null 2>&1 && return
    kill -0 "$server_pid" 2>/dev/null || {
      sed -n '1,160p' "$tmp_dir/server.log" >&2
      fail "local backend exited before becoming healthy"
    }
    sleep 1
  done
  sed -n '1,160p' "$tmp_dir/server.log" >&2
  fail "local backend did not become healthy within 60 seconds"
}

start_server_if_needed
command -v jq >/dev/null || fail 'jq is required'

health="$(request GET /api/health)"
assert_json "$health" '.ok == true' 'health check must report ok'

# A unique run id is the isolation boundary. A prior run with the same explicit id
# must be empty, so accidental reuse cannot overwrite or delete unrelated data.
snapshot="$(workflow get_run)"
assert_json "$snapshot" '(.counts // {}) | ([.[]] | add // 0) == 0' 'run id must be unused before setup'

payload="$(jq -cn --arg name "E2E task $run_id" '{name:$name,targetMarket:"MY",budgetCny:12000,productIds:["prd-m02"],targetSegments:["food_importer"]}')"
task="$(workflow create_task "$payload" 201)"
assert_json "$task" '.task.id | type == "string"' 'task must be created'
task_id="$(jq -r '.task.id' <<<"$task")"

payload="$(jq -cn --arg taskId "$task_id" --arg title "E2E content $run_id" '{taskId:$taskId,title:$title,language:"en",channel:"LinkedIn",body:"Traceable matcha supplier test content",cta:"Request a sample"}')"
content="$(workflow create_content "$payload" 201)"
assert_json "$content" '.content.id | type == "string"' 'content must be created'
content_id="$(jq -r '.content.id' <<<"$content")"
payload="$(jq -cn --arg taskId "$task_id" --arg title "This retry must not create a second row" '{taskId:$taskId,title:$title}')"
content_replay="$(workflow create_content "$payload" 200)"
assert_json "$content_replay" ".replayed == true and .content.id == \"$content_id\"" 'same action and idempotency key must replay the original result'

payload="$(jq -cn --arg taskId "$task_id" --arg contentId "$content_id" '{taskId:$taskId,contentId:$contentId,channel:"LinkedIn",scheduledAt:"2030-01-01T09:00:00.000Z"}')"
schedule="$(workflow schedule_content "$payload" 201)"
assert_json "$schedule" '.schedule.id | type == "string"' 'content schedule must be created'

payload="$(jq -cn --arg taskId "$task_id" --arg contentId "$content_id" --arg name "E2E campaign $run_id" '{taskId:$taskId,name:$name,market:"MY",budgetCny:3000,contentIds:[$contentId]}')"
campaign="$(workflow create_campaign "$payload" 201)"
assert_json "$campaign" '.campaign.id | type == "string"' 'campaign must be created'
campaign_id="$(jq -r '.campaign.id' <<<"$campaign")"

payload="$(jq -cn --arg name "E2E customer $run_id" '{displayName:$name,market:"MY",companyType:"food_importer",contactRole:"procurement",sourceChannel:"LinkedIn",interestedProductIds:["prd-m02"]}')"
customer="$(workflow create_customer "$payload" 201)"
assert_json "$customer" '.customer.id | type == "string"' 'customer must be created'
customer_id="$(jq -r '.customer.id' <<<"$customer")"

payload="$(jq -cn --arg customerId "$customer_id" --arg campaignId "$campaign_id" --arg contentId "$content_id" '{customerId:$customerId,campaignId:$campaignId,contentId:$contentId,channel:"WhatsApp",body:"Please quote 500 kg and send specifications."}')"
inquiry="$(workflow create_inquiry "$payload" 201)"
assert_json "$inquiry" '.inquiry.id | type == "string"' 'inquiry must be persisted'

payload="$(jq -cn --arg taskId "$task_id" --arg customerId "$customer_id" '{taskId:$taskId,customerId:$customerId,currency:"CNY",items:[{productId:"prd-m02",quantity:500,unitPrice:180}],validDays:14}')"
quote="$(workflow create_quote "$payload" 201)"
assert_json "$quote" '(.quote.id | type) == "string" and .quote.status == "draft"' 'draft quote must be created'
quote_id="$(jq -r '.quote.id' <<<"$quote")"
opportunity_id="$(jq -r '.quote.opportunityId' <<<"$quote")"

payload="$(jq -cn --arg quoteId "$quote_id" '{quoteId:$quoteId,reason:"E2E commercial approval"}')"
approval="$(workflow request_quote_approval "$payload" 201)"
assert_json "$approval" '(.approval.id | type) == "string" and .approval.status == "pending"' 'quote approval must be pending'
approval_id="$(jq -r '.approval.id' <<<"$approval")"

payload="$(jq -cn --arg approvalId "$approval_id" '{approvalId:$approvalId,decision:"approved",note:"Approved by isolated E2E test"}')"
decision="$(workflow decide_approval "$payload")"
assert_json "$decision" '.approval.status == "approved" and .resumed.quote.status == "approved"' 'approval must resume and approve quote'

payload="$(jq -cn --arg quoteId "$quote_id" '{quoteId:$quoteId,status:"won"}')"
order="$(workflow create_order "$payload" 201)"
assert_json "$order" '(.order.id | type) == "string" and .order.status == "won"' 'approved quote must create won order'
order_id="$(jq -r '.order.id' <<<"$order")"

payload="$(jq -cn --arg taskId "$task_id" --arg customerId "$customer_id" --arg opportunityId "$opportunity_id" --arg campaignId "$campaign_id" --arg contentId "$content_id" --arg orderId "$order_id" '{taskId:$taskId,customerId:$customerId,opportunityId:$opportunityId,campaignId:$campaignId,contentId:$contentId,orderId:$orderId,sourceId:$orderId,eventType:"order_won",sourceType:"campaign"}')"
attribution="$(workflow record_attribution "$payload" 201)"
assert_json "$attribution" '.attribution.id | type == "string"' 'order attribution must be recorded'

snapshot="$(workflow get_run)"
assert_json "$snapshot" '
  .counts.tasks == 1 and
  .counts.contents == 1 and
  .counts.schedules == 1 and
  .counts.campaigns == 1 and
  .counts.customers == 1 and
  .counts.inquiries == 1 and
  .counts.quotes == 1 and
  .counts.approvals == 1 and
  .counts.orders == 1 and
  .counts.attribution_events >= 1 and
  .chain.orderId != null and
  .chain.quoteStatus == "accepted" and
  .chain.approvalStatus == "approved"
' 'all workflow entities and terminal states must be traceable by run id'

cleanup_run
after_cleanup="$(workflow get_run)"
assert_json "$after_cleanup" '(.counts // {}) | ([.[]] | add // 0) == 0' 'cleanup must leave no rows for this run id'
assert_json "$after_cleanup" '.foreignKeyViolations == 0' 'cleanup must preserve referential integrity'

log "PASS: task -> content -> schedule -> campaign -> inquiry -> quote -> approval -> order -> attribution"
log "run $run_id was cleaned; Demo seed data was not modified"
