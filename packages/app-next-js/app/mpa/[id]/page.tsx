interface Props {
  params: Promise<{ id: string }>
}

export default async function MpaDetailPage({ params }: Props) {
  const { id } = await params

  return <p id="detail-id">{id}</p>
}
