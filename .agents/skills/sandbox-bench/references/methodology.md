# Framework-tracker sandbox benchmark methodology

## Use the VM boot as the independent sample

JIT state, heap layout, CPU placement, and host conditions are shared by every
measurement inside one sandbox boot. Repetitions within a boot improve that
boot's estimate, but they are not independent evidence.

The sandbox runner therefore:

- prepares one content-addressed source snapshot so every VM starts from the
  same files, Node version, pnpm version, root dependencies, and (when needed)
  Chrome installation;
- runs every matrix case inside every VM;
- reverses case order across VM/block parity to reduce linear order effects;
- averages blocks within a VM; and
- computes confidence intervals and paired deltas across VM boots.

Do not report the framework-tracker CLI's internal browser runs or load-test
requests as independent samples. The number of completed VMs is `n`.

## Choose comparable cases

- Prefer exact app packages when comparing runtime behavior, for example
  `app-next-js@canary` and `app-tanstack-start-react`.
- Use framework selectors when starter and app results are both relevant.
- The runner maps `@stable` to npm's `latest` tag. Record the resolved
  `frameworkVersion` from each result rather than assuming a dist-tag stayed
  fixed.
- Keep measurements, `--runs`, VM size, source fingerprint, Chrome version,
  and sandbox project identical across cases.
- Do not compare results from different run directories as though they were
  paired. Host and platform changes can dominate small framework effects.

## Allocation and claims

Use one VM only for setup smoke tests. Use at least eight boots for exploratory
comparisons and sixteen when a small result may drive a decision. More internal
`--runs` cannot replace more independent boots.

Before making claims for a new Vercel team/project or after a platform,
benchmark-app, Node, Chrome, or runner change, run an A/A calibration by
specifying the same target twice. No metric should reach boot-level `p < 0.01`
beyond the nominal false-positive rate.

Treat a result as detected only when all of these hold:

1. The source fingerprint, snapshot, case arguments, and completed VM count are
   correct.
2. The boot-level paired comparison has `p < 0.01`.
3. The 95% confidence interval excludes zero.
4. Per-boot signs are not dominated by one outlier.
5. A decision-driving result repeats in an independent run.

Everything else is "no detected difference," not a small win or loss.

## Metric interpretation

The generated summary uses a mechanical sign convention: a positive delta
means the candidate produced a larger number. Interpret direction per metric:

- Higher is generally better for `opsPerSec`, `peakRequestsPerSec`, and similar
  throughput metrics.
- Lower is generally better for latency, paint timing, INP, build/install time,
  output size, and error counts.
- Body size, sample count, total requests, peak workers, and framework version
  metadata describe the run; they are not automatically performance wins.
- Browser FP/FCP/INP values are noisy. Check the Chrome version and require
  stronger replication than for deterministic build size.
- `ssrLoadTests.stages` is intentionally omitted from the compact summary.
  Inspect the raw per-VM `ci-stats.json` files when load-curve shape matters.

## Reporting template

Lead with what ran and the independent sample count:

```markdown
## Next.js canary vs TanStack Start — Vercel Sandbox, 8 boots

Source fingerprint: `<hash>`; Node 24; 8 vCPUs; measurements:
`ssrLoad`, `ssrRequestThroughput`.

| metric             | candidate delta | 95% CI |      p | verdict  |
| ------------------ | --------------: | -----: | -----: | -------- |
| app SSR throughput |          +12.4% |  ±3.1% | 0.0008 | detected |

No detected difference: ...
```

State that magnitudes are platform-specific. Link or provide the run directory
and retain `meta.json`, `summary.md`, per-case logs, and raw result JSON files.
