import { useNavigate } from 'react-router'

export default function SpaPage() {
  const navigate = useNavigate()

  return (
    <button id="interact-btn" onClick={() => navigate('/spa/result')}>
      Run Benchmark
    </button>
  )
}
