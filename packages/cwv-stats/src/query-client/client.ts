import { BigQuery } from '@google-cloud/bigquery'

const bigquery = new BigQuery()

export async function runQuery(query: string): Promise<Array<any>> {
  // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
  const options = {
    query: query,
    // Location must match that of the dataset(s) referenced in the query.
    location: 'US',
  }

  const [job] = await bigquery.createQueryJob(options)
  console.info(`Job ${job.id} started.`)

  const [rows] = await job.getQueryResults()

  return rows
}
