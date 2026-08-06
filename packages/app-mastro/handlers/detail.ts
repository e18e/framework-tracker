import { getParams, html, htmlToResponse } from '@mastrojs/mastro'

export const GET = (request: Request) => {
  const { id } = getParams(request)

  return htmlToResponse(html`<p id="detail-id">${id}</p>`)
}
