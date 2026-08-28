#!/usr/bin/env bash
set -euo pipefail

package_name=${1:?Usage: run-containerized-ssr-load.sh <package-name>}
workspace_dir=${GITHUB_WORKSPACE:-$(pwd)}
network_name=framework-tracker-ssr-load
server_name=framework-tracker-ssr-load-server
node_image=node:24-bookworm-slim

cleanup() {
  exit_code=$?
  trap - EXIT

  if [[ $exit_code -ne 0 ]]; then
    docker logs "$server_name" 2>/dev/null || true
  fi

  docker rm --force "$server_name" >/dev/null 2>&1 || true
  docker network rm "$network_name" >/dev/null 2>&1 || true
  exit "$exit_code"
}
trap cleanup EXIT

docker network create "$network_name" >/dev/null

docker run --detach \
  --name "$server_name" \
  --network "$network_name" \
  --cpuset-cpus 0-11 \
  --user "$(id -u):$(id -g)" \
  --volume "$workspace_dir:/workspace" \
  --workdir /workspace \
  "$node_image" \
  node packages/stats-generator/src/run-ssr-load-server.ts "$package_name" \
  >/dev/null

docker run --rm \
  --network "$network_name" \
  --cpuset-cpus 12-15 \
  --user "$(id -u):$(id -g)" \
  --volume "$workspace_dir:/workspace" \
  --workdir /workspace \
  --env RUNNER_LABEL \
  --env SSR_LOAD_TARGET_URL="http://$server_name:3003/server-side-rendered" \
  "$node_image" \
  node packages/stats-generator/src/run-ssr-load-benchmark.ts "$package_name"
