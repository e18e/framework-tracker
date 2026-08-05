---
name: sandbox-bench
description: Run framework-tracker framework, app, package, and version benchmark matrices on identical Vercel Sandbox VMs, including Next.js stable/canary comparisons and cross-framework SSR, load, browser-rendering, build, or install measurements. Use when asked to run, compare, repeat, or validate framework-tracker benchmarks remotely, on Vercel Sandbox, across independent machines, or without tying up the local workstation.
---

# Run framework-tracker benchmarks on Vercel Sandbox

Use the repository's `pnpm benchmark` CLI as the source of truth for benchmark
selection and version overrides. Use this skill's runner only for remote
provisioning, identical setup snapshots, independent VM replication,
collection, and boot-level summaries.

Run every command below from the framework-tracker repository root.

## Start by checking configuration and active work

Before launching resources, run:

```sh
node .agents/skills/sandbox-bench/scripts/config.mjs show
node .agents/skills/sandbox-bench/scripts/status.mjs
```

If configuration reports `NOT CONFIGURED`, ask which Vercel **team** and
**project** should own and bill the sandboxes. Never guess or commit them.
Save the answer outside the repository:

```sh
node .agents/skills/sandbox-bench/scripts/config.mjs set \
  team=<team-slug> project=<project-name>
```

The Vercel CLI session must have access to that scope. Verify failures with:

```sh
vercel whoami --scope <team-slug>
vercel sandbox list --team <team-slug> --project <project-name>
```

Stop after a persistent authorization failure instead of retrying resource
creation. Configuration is stored in
`~/.config/framework-tracker-sandbox-bench/config.json`; results and snapshot
IDs are stored in `~/.cache/framework-tracker-sandbox-bench/`.

## Resolve the comparison matrix

Pass any framework or package selector accepted by `pnpm benchmark`. Append
`@<version>` to make one case use a specific framework version.

- `next@stable` is normalized to `next@latest`.
- Use `next@canary` for the current npm canary.
- Prefer exact app selectors, such as `app-next-js@canary`, for app-only runtime
  comparisons.
- A framework selector such as `next@canary` may produce both starter and app
  results, depending on which measurements those packages configure.
- Each versioned target becomes a separate invocation so the local CLI's
  one-framework-per-`--version` invariant remains intact.
- Use the resolved `frameworkVersion` in raw results when reporting dist-tags.

Inspect available local cases when uncertain:

```sh
pnpm benchmark --list
```

Always inspect a no-op plan before creating billable resources:

```sh
node .agents/skills/sandbox-bench/scripts/sandbox-bench.mjs \
  app-next-js@canary app-tanstack-start-react \
  --measurement ssrLoad,ssrRequestThroughput \
  --vms 8 --dry-run
```

The source bundle contains tracked changes plus non-ignored untracked files, so
the sandbox measures the current working tree. The runner prints a source
fingerprint and snapshots one prepared checkout; every measurement VM boots
from that snapshot. Browser measurements automatically add Google Chrome.

## Launch the run

Typical runtime comparison:

```sh
node .agents/skills/sandbox-bench/scripts/sandbox-bench.mjs \
  app-next-js@canary app-tanstack-start-react \
  --measurement \
  ssrLoad,ssrRequestThroughput,clientSideRendered,serverSideRendered \
  --vms 8 --runs 5 --label next-canary-vs-tanstack
```

Next.js stable versus canary:

```sh
node .agents/skills/sandbox-bench/scripts/sandbox-bench.mjs \
  app-next-js@stable app-next-js@canary \
  --measurement ssrLoad,ssrRequestThroughput \
  --vms 8 --label next-stable-vs-canary
```

Useful options:

- `--vms <n>` controls independent boots. Use one only for a smoke test, eight
  for exploration, and sixteen when a small effect may drive a decision.
- `--concurrency <n>` controls how many sandboxes run at once and defaults to
  five, which fits Hobby project limits without changing the boot count.
- `--blocks <n>` repeats the full matrix inside each boot. More blocks improve
  a boot's estimate but do not increase the independent sample count.
- `--runs <n>` forwards the run count to benchmarks that support it.
- `--vcpus <n>` defaults to 8. Keep it identical across compared cases.
- `--no-cache` forces a fresh setup snapshot after debugging setup changes.
- `--keep` retains measurement VMs after collection; omit it normally.

Run the launcher as a background task for long matrices and return to it on
completion. Relay the printed run directory immediately. Do not stop a run
because partial output appears favorable; only `summary.md` after all planned
VMs finish is reportable.

## Read and report results

The launcher writes:

- `meta.json`: source fingerprint, snapshot, cases, allocation, and per-VM
  status;
- `summary.md`: absolute boot-level means and paired comparisons;
- `vm-*/bench-output/`: raw JSON and per-case logs; and
- `vm-*/bench.log`: the full VM transcript.

Rebuild a summary without rerunning:

```sh
node .agents/skills/sandbox-bench/scripts/summarize.mjs <run-directory>
```

Read [references/methodology.md](references/methodology.md) before interpreting
or reporting a run. In particular:

- Treat the VM boot—not internal iterations or requests—as `n`.
- Positive deltas mean only "candidate numeric value is larger"; interpret
  whether that is better from the metric.
- Require boot-level `p < 0.01`, a 95% CI excluding zero, an A/A-validated
  team/project, and an independent confirmation before a decision-driving
  claim.
- Report every unmatched metric as "no detected difference," not a small win
  or loss.
- State VM count, vCPUs, Node/Chrome versions, source fingerprint, exact
  resolved framework versions, and that percentages are platform-specific.

## Recover or diagnose failures

Start with:

```sh
node .agents/skills/sandbox-bench/scripts/status.mjs
```

The runner detaches benchmark work inside each VM, polls it, downloads results,
and removes VMs after collection. If the local launcher is interrupted, the
remote work can continue until the configured sandbox timeout. Reconnect and
collect every completed VM recorded in a run with:

```sh
node .agents/skills/sandbox-bench/scripts/collect.mjs <run-directory>
```

The collector leaves still-running VMs alone, updates `meta.json`, removes
collected VMs, and regenerates `summary.md` once the matrix is complete. Use the
scoped `vercel sandbox list`, `exec`, and `cp` commands for deeper inspection;
remove only exact `ftrack-*` sandbox names after recovery.

For a setup or benchmark failure, inspect the relevant per-case log and report
the failure instead of producing a comparison from an incomplete matrix.
