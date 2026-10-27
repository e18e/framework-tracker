import { appendFileSync, readFileSync } from 'node:fs'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

interface Run {
  id: number
  run_attempt: number
  name: string
  path: string
  event: string
  status: string
  conclusion: string | null
  display_title: string
  head_sha: string
}
interface PullRequest {
  state: string
  base: { ref: string; repo: { full_name: string } }
  head: { sha: string }
}
interface RelayEvent {
  action: string
  repository: { default_branch: string }
  workflow_run: Run
}
interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
}
export type GitHubApi = <T>(
  path: string,
  options?: RequestOptions,
) => Promise<T>

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function githubApi(
  token: string,
  apiUrl = 'https://api.github.com',
  request: typeof fetch = fetch,
): GitHubApi {
  return async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const response = await request(`${apiUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'framework-tracker-measurements',
        'X-GitHub-Api-Version': '2026-03-10',
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(30_000),
    })
    const text = await response.text()
    if (!response.ok)
      throw new ApiError(
        response.status,
        `GitHub API ${response.status}: ${text.slice(0, 500)}`,
      )
    return (text ? JSON.parse(text) : undefined) as T
  }
}

export function workerTitle(run: Pick<Run, 'id' | 'run_attempt'>) {
  return `PR measurements ${run.id}-${run.run_attempt}`
}

async function matchingRuns(
  api: GitHubApi,
  repository: string,
  workflow: string,
  event: string,
  title: string,
): Promise<Run[]> {
  const matches: Run[] = []
  for (let page = 1; page <= 10; page++) {
    let data: { workflow_runs: Run[] }
    try {
      data = await api(
        `/repos/${repository}/actions/workflows/${workflow}/runs?event=${event}&per_page=100&page=${page}`,
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404)
        throw new Error(
          'The measurement worker and relay must be installed on main before this PR check can run',
          { cause: error },
        )
      throw error
    }
    matches.push(
      ...data.workflow_runs.filter((run) => run.display_title === title),
    )
    if (data.workflow_runs.length < 100) return matches
  }
  throw new Error(
    'Too many recent workflow runs to identify the measurement worker safely',
  )
}

async function cancel(api: GitHubApi, repository: string, id: number) {
  try {
    await api(`/repos/${repository}/actions/runs/${id}/cancel`, {
      method: 'POST',
    })
  } catch (error) {
    // A worker may finish between checking its status and requesting cancellation.
    if (!(error instanceof ApiError) || error.status !== 409) throw error
  }
}

export async function relay(
  api: GitHubApi,
  repository: string,
  event: RelayEvent,
) {
  const parent = event.workflow_run
  if (
    parent.event !== 'pull_request' ||
    parent.name !== 'Measure PR' ||
    parent.path !== '.github/workflows/measure-pr.yml'
  )
    throw new Error('Unexpected PR controller workflow')
  const title = workerTitle(parent)
  const workers = await matchingRuns(
    api,
    repository,
    'measure.yml',
    'workflow_dispatch',
    title,
  )
  if (event.action === 'completed') {
    if (parent.conclusion !== 'success')
      for (const worker of workers)
        if (worker.status !== 'completed')
          await cancel(api, repository, worker.id)
    return
  }
  if (event.action !== 'in_progress')
    throw new Error('Unexpected controller event')
  if (workers.length) return // A repeated delivery must not start duplicate benchmarks.

  const current = await api<Run>(
    `/repos/${repository}/actions/runs/${parent.id}`,
  )
  if (
    current.run_attempt !== parent.run_attempt ||
    current.status === 'completed'
  )
    return
  const match = /^Measurements for PR #([1-9]\d*) at ([a-f0-9]{40})$/.exec(
    parent.display_title,
  )
  if (!match)
    throw new Error(
      'Missing PR number or exact merge commit in the controller run name',
    )
  const [, number, mergeSha] = match
  const pr = await api<PullRequest>(`/repos/${repository}/pulls/${number}`)
  const commit = await api<{ parents: { sha: string }[] }>(
    `/repos/${repository}/commits/${mergeSha}`,
  )
  if (
    pr.state !== 'open' ||
    pr.base.ref !== 'main' ||
    pr.base.repo.full_name !== repository ||
    commit.parents.length !== 2 ||
    commit.parents[1]?.sha !== pr.head.sha ||
    (parent.head_sha !== pr.head.sha && parent.head_sha !== mergeSha)
  )
    throw new Error(
      'The PR changed or closed before its measurements could start; rerun the current PR check',
    )
  // Other PRs may advance main while this run is queued. Keep measuring this
  // run's merge snapshot, provided its base remains part of the target branch.
  const comparison = await api<{ merge_base_commit: { sha: string } }>(
    `/repos/${repository}/compare/${commit.parents[0]!.sha}...${pr.base.ref}`,
  )
  if (comparison.merge_base_commit.sha !== commit.parents[0]!.sha)
    throw new Error(
      'The measurement merge commit is not based on the PR target branch',
    )

  // The workflow definition always comes from the trusted default branch. Only
  // read-only benchmark jobs check out the pinned PR merge commit, including forks.
  const dispatched = await api<{ workflow_run_id: number }>(
    `/repos/${repository}/actions/workflows/measure.yml/dispatches`,
    {
      method: 'POST',
      body: {
        ref: event.repository.default_branch,
        inputs: {
          'source-sha': mergeSha,
          'base-sha': commit.parents[0]!.sha,
          'pr-number': number,
          'controller-run-id': String(parent.id),
          'controller-run-attempt': String(parent.run_attempt),
        },
      },
    },
  )
  if (!Number.isSafeInteger(dispatched?.workflow_run_id))
    throw new Error('GitHub did not return the dispatched measurement run ID')
  // Close the race where the controller is cancelled while dispatch is in flight.
  const after = await api<Run>(`/repos/${repository}/actions/runs/${parent.id}`)
  if (after.run_attempt !== parent.run_attempt || after.status === 'completed')
    await cancel(api, repository, dispatched.workflow_run_id)
}

interface WaitOptions {
  sleep?: (milliseconds: number) => Promise<unknown>
  now?: () => number
  startupTimeoutMs?: number
  timeoutMs?: number
  report?: (message: string) => void
}

export async function waitForMeasurements(
  api: GitHubApi,
  repository: string,
  parent: Pick<Run, 'id' | 'run_attempt'>,
  options: WaitOptions = {},
) {
  const sleep = options.sleep ?? setTimeout
  const now = options.now ?? Date.now
  const report = options.report ?? console.info
  const started = now()
  const title = workerTitle(parent)
  let worker: Run | undefined
  while (now() - started < (options.timeoutMs ?? 355 * 60_000)) {
    if (!worker) {
      const matches = await matchingRuns(
        api,
        repository,
        'measure.yml',
        'workflow_dispatch',
        title,
      )
      if (matches.length > 1)
        throw new Error(`Multiple measurement workers found for ${title}`)
      worker = matches[0]
      if (worker)
        report(
          `Measurement details: https://github.com/${repository}/actions/runs/${worker.id}`,
        )
      else {
        const relays = await matchingRuns(
          api,
          repository,
          'measure-pr-dispatch.yml',
          'workflow_run',
          `Measurements dispatch ${parent.id}-${parent.run_attempt}`,
        )
        const failed = relays.find(
          (run) => run.status === 'completed' && run.conclusion !== 'success',
        )
        if (failed)
          throw new Error(
            `Measurement dispatch failed: https://github.com/${repository}/actions/runs/${failed.id}`,
          )
        if (now() - started >= (options.startupTimeoutMs ?? 10 * 60_000))
          throw new Error(
            'Measurement worker did not start; check that the relay and worker workflows are enabled on main',
          )
      }
    }
    if (worker) {
      worker = await api<Run>(`/repos/${repository}/actions/runs/${worker.id}`)
      if (worker.status === 'completed') {
        if (worker.conclusion !== 'success')
          throw new Error(
            `Measurements or validation ${worker.conclusion}: https://github.com/${repository}/actions/runs/${worker.id}`,
          )
        report(
          'All selected measurements and complete-result validation passed.',
        )
        return worker
      }
    }
    await sleep(15_000)
  }
  throw new Error(
    'Timed out waiting for measurements; the relay will cancel the worker when this check finishes',
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const repository = process.env.GITHUB_REPOSITORY!
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository))
      throw new Error('Invalid GitHub repository')
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('Missing GitHub token')
    const api = githubApi(token, process.env.GITHUB_API_URL)
    if (process.argv[2] === 'relay')
      await relay(
        api,
        repository,
        JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!, 'utf8')),
      )
    else if (process.argv[2] === 'wait') {
      const parent = {
        id: Number(process.env.GITHUB_RUN_ID),
        run_attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
      }
      if (
        !Number.isSafeInteger(parent.id) ||
        !Number.isSafeInteger(parent.run_attempt)
      )
        throw new Error('Missing controller run ID or attempt')
      await waitForMeasurements(api, repository, parent, {
        report(message) {
          console.info(message)
          if (process.env.GITHUB_STEP_SUMMARY)
            appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n\n`)
        },
      })
    } else throw new Error('Expected wait or relay')
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
}
