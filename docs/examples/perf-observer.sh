#!/usr/bin/env bash
#
# perf-observer.sh — polls /tree and /allSteps for a running build and prints a
# latency summary at the end. Use it to compare two configurations (e.g. before
# vs. after a change) by running it once per build and diffing the two summaries.
#
# Usage:
#     ./perf-observer.sh JENKINS_URL JOB_NAME BUILD_NUMBER [LABEL]
#
# Optional env vars:
#     JENKINS_AUTH=user:token    pass-through to curl --user
#     POLL_INTERVAL=3            seconds between poll rounds (default 3)
#
# Example:
#
#   ./perf-observer.sh http://localhost:8080/jenkins perf 1 baseline
#   ./perf-observer.sh http://localhost:8080/jenkins perf 2 after-change
#
# Raw samples are written to /tmp/pgv-perf-<LABEL>.csv for later analysis.

set -euo pipefail

if [[ $# -lt 3 ]]; then
    echo "Usage: $0 JENKINS_URL JOB_NAME BUILD_NUMBER [LABEL]" >&2
    exit 2
fi

JENKINS_URL="${1%/}"
JOB_NAME="$2"
BUILD_NUMBER="$3"
LABEL="${4:-run}"
POLL_INTERVAL="${POLL_INTERVAL:-3}"
CSV="/tmp/pgv-perf-${LABEL}.csv"

BASE="${JENKINS_URL}/job/${JOB_NAME}/${BUILD_NUMBER}/stages"
API_URL="${JENKINS_URL}/job/${JOB_NAME}/${BUILD_NUMBER}/api/json?tree=result,inProgress"

AUTH=()
if [[ -n "${JENKINS_AUTH:-}" ]]; then
    AUTH=(--user "$JENKINS_AUTH")
fi

echo "Observing: $BASE"
echo "Label:     $LABEL"
echo "CSV:       $CSV"
echo "Interval:  ${POLL_INTERVAL}s"
echo

echo "sample_ts,endpoint,http_code,time_ms,bytes" > "$CSV"

measure() {
    local endpoint="$1"
    local url="$BASE/$endpoint"
    local out
    out=$(curl -so /dev/null -w '%{http_code},%{time_total},%{size_download}' \
          "${AUTH[@]}" "$url" 2>/dev/null || echo "000,0,0")
    local http_code="${out%%,*}"
    local rest="${out#*,}"
    local time_s="${rest%%,*}"
    local bytes="${rest#*,}"
    local time_ms
    time_ms=$(awk -v t="$time_s" 'BEGIN { printf "%.1f", t * 1000 }')
    local ts
    ts=$(date +%s)
    echo "$ts,$endpoint,$http_code,$time_ms,$bytes" >> "$CSV"
    printf '  %s %-10s %s  %8sms  %8s bytes\n' \
        "$(date +%H:%M:%S)" "$endpoint" "$http_code" "$time_ms" "$bytes"
}

build_state() {
    curl -s "${AUTH[@]}" "$API_URL" 2>/dev/null || echo ""
}

is_running() {
    local resp
    resp=$(build_state)
    [[ "$resp" == *'"inProgress":true'* ]]
}

echo "Waiting for build to enter in-progress state..."
for _ in $(seq 1 30); do
    if is_running; then break; fi
    sleep 2
done

if ! is_running; then
    state=$(build_state)
    if [[ -z "$state" ]]; then
        echo "ERROR: could not reach $API_URL" >&2
        exit 1
    fi
    echo "NOTE: build is not in-progress (state: $state). Taking a few post-completion samples only."
fi

echo
echo "Polling while build runs..."
echo

while is_running; do
    measure tree
    measure allSteps
    sleep "$POLL_INTERVAL"
done

echo
echo "Build complete. Taking three post-completion samples..."
for _ in 1 2 3; do
    measure tree
    measure allSteps
    sleep 1
done

echo
echo "================ Summary: '$LABEL' ================"
python3 - "$CSV" <<'PY'
import csv, sys

csv_path = sys.argv[1]
samples = {}
warnings = {}

with open(csv_path) as f:
    for row in csv.DictReader(f):
        ep = row["endpoint"]
        code = row["http_code"]
        try:
            t = float(row["time_ms"])
        except ValueError:
            continue
        if code != "200":
            warnings[(ep, code)] = warnings.get((ep, code), 0) + 1
            continue
        samples.setdefault(ep, []).append(t)

def pct(sorted_vals, p):
    if not sorted_vals:
        return 0.0
    idx = int(round((p / 100.0) * (len(sorted_vals) - 1)))
    idx = max(0, min(len(sorted_vals) - 1, idx))
    return sorted_vals[idx]

for ep in sorted(samples):
    vals = sorted(samples[ep])
    n = len(vals)
    print(f"  {ep:10s}  n={n:4d}   "
          f"min={vals[0]:8.1f}ms   "
          f"median={pct(vals, 50):8.1f}ms   "
          f"p95={pct(vals, 95):8.1f}ms   "
          f"max={vals[-1]:8.1f}ms")

if warnings:
    print()
    for (ep, code), count in sorted(warnings.items()):
        print(f"  {ep:10s}  WARN  {count}x non-200 ({code})")
PY
echo "====================================================="
echo
echo "Raw samples: $CSV"
