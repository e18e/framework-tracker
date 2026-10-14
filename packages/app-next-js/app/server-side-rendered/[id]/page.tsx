import { Suspense } from 'react'

interface Props {
  params: Promise<{ id: string }>
}

export default function ServerSideRenderedDetailPage({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <RequestDetail params={params} />
    </Suspense>
  )
}

async function RequestDetail({ params }: Props) {
  const { id } = await params

  return <p id="detail-id">{id}</p>
}
