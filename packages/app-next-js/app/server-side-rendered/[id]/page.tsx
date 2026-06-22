interface Props {
  params: Promise<{ id: string }>
}

export default async function ServerSideRenderedDetailPage({ params }: Props) {
  const { id } = await params

  return <p id="detail-id">{id}</p>
}
