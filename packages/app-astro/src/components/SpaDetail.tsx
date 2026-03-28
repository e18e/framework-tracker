interface Props {
  id: string | null
}

export default function SpaDetail({ id }: Props) {
  return <p id="detail-id">{id}</p>
}
