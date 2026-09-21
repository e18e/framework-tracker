export function GET() {
  return Response.json({
    adapter: 'node',
    ok: true,
    service: 'pracht',
  })
}
