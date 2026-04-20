interface Props {
  searchParams: Promise<{ id?: string }>
}

export default async function MpaDetailPage({ searchParams }: Props) {
  const { id } = await searchParams

  return <p id="detail-id">{id}</p>
}
