#!/usr/bin/env bash
# Stop only the process trees recorded by launch.sh. Never matches by process name.
# Leaves $VERIFY_CSPX_EVIDENCE in place (logs, screenshots, response bodies).
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
mkdir -p "$EVIDENCE"

descendants() {
  local pid=$1
  local child
  for child in $(ps -o pid= --ppid "$pid" 2>/dev/null); do
    descendants "$child"
    echo "$child"
  done
}

stop_pid() {
  local label=$1
  local pidfile=$2
  if [ ! -f "$pidfile" ]; then
    echo "cleanup: no $label pid file ($pidfile)"
    return 0
  fi
  local pid
  pid=$(tr -d '[:space:]' <"$pidfile")
  if ! [[ "$pid" =~ ^[0-9]+$ ]]; then
    echo "FAIL cleanup: $pidfile does not contain a numeric pid" >&2
    return 1
  fi
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "cleanup: $label pid $pid is already gone"
    return 0
  fi

  local -a pids=()
  mapfile -t pids < <(descendants "$pid")
  pids+=("$pid")

  echo "cleanup: stopping $label pids ${pids[*]}"
  kill -TERM "${pids[@]}" 2>/dev/null || true

  local i
  for i in 1 2 3 4 5; do
    local alive=0
    local p
    for p in "${pids[@]}"; do
      if kill -0 "$p" 2>/dev/null; then
        alive=1
      fi
    done
    if [ "$alive" -eq 0 ]; then
      echo "cleanup: $label stopped"
      return 0
    fi
    sleep 1
  done

  echo "cleanup: $label still alive after SIGTERM, sending SIGKILL to the same pids"
  kill -KILL "${pids[@]}" 2>/dev/null || true
  sleep 0.5
  local p
  for p in "${pids[@]}"; do
    if kill -0 "$p" 2>/dev/null; then
      echo "FAIL cleanup: pid $p did not exit" >&2
      return 1
    fi
  done
  echo "cleanup: $label stopped"
}

fail=0
stop_pid next "$EVIDENCE/next.pid" || fail=1
stop_pid convex "$EVIDENCE/convex.pid" || fail=1

{
  echo "cleanup finished fail=$fail"
  echo "evidence kept at $EVIDENCE"
  date -u +"cleaned_at=%Y-%m-%dT%H:%M:%SZ"
} | tee "$EVIDENCE/cleanup.txt"

exit "$fail"
