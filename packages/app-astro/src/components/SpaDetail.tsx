export default function SpaDetail() {
  const id = new URLSearchParams(window.location.search).get('id')
  return <p id="detail-id">{id}</p>
}
