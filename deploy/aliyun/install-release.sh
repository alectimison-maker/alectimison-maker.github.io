#!/usr/bin/env bash
set -euo pipefail

release_archive=${1:?release archive is required}
release_id=${2:?release id is required}
release_root=/srv/aliouswe/releases
release_dir="$release_root/$release_id"
runner_dir=/srv/aliouswe/app/opencv-runner
current_link=/srv/aliouswe/current
previous_release=$(readlink -f "$current_link" 2>/dev/null || true)
activated=false

rollback() {
  if [[ "$activated" == true && -n "$previous_release" ]]; then
    ln -sfn "$previous_release" "$current_link"
    systemctl restart opencv-runner
    systemctl reload nginx
  fi
}
trap rollback ERR

install -d -m 0755 "$release_dir" "$runner_dir"
install -d -o opencv-runner -g docker -m 0700 /srv/aliouswe/runner-work
tar -xzf "$release_archive" -C "$release_dir"
rsync -a --delete "$release_dir/opencv-runner/" "$runner_dir/"
npm ci --omit=dev --prefix "$runner_dir"
docker build -t aliouswe/opencv-runner:4.5.4 "$runner_dir"
nginx -t
ln -sfn "$release_dir/dist" "$current_link"
activated=true
systemctl restart opencv-runner
healthy=false
for attempt in {1..30}; do
  if curl --fail --silent --max-time 2 http://127.0.0.1:8787/healthz >/dev/null; then
    healthy=true
    break
  fi
  sleep 1
done
if [[ "$healthy" != true ]]; then
  echo "OpenCV runner health check timed out after 30 seconds" >&2
  false
fi
systemctl reload nginx
activated=false
trap - ERR
