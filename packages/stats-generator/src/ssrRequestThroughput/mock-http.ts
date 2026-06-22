import { Readable, Writable } from 'node:stream'

export class IncomingMessage extends Readable {
  aborted = false
  httpVersion = '1.1'
  httpVersionMajor = 1
  httpVersionMinor = 1
  complete = true
  connection: unknown
  socket: Record<string, unknown> = {}
  headers: Record<string, string> = {}
  trailers: Record<string, string> = {}
  method = 'GET'
  url = '/'
  statusCode = 200
  statusMessage = ''
  closed = false
  errored: Error | null = null
  readable = false

  constructor() {
    super()
  }

  get rawHeaders(): string[] {
    return []
  }

  get rawTrailers(): string[] {
    return []
  }

  setTimeout(_msecs: number, _callback?: () => void): this {
    return this
  }

  get headersDistinct(): Record<string, string[]> {
    return {}
  }

  get trailersDistinct(): Record<string, string[]> {
    return {}
  }
}

const decoder = new TextDecoder()

export class ServerResponse extends Writable {
  private _res?: (value: null) => void

  body = ''
  length = 0
  times = { start: performance.now(), end: 0, headers: 0 }
  await: Promise<null>

  statusCode = 200
  statusMessage = ''
  upgrading = false
  chunkedEncoding = false
  shouldKeepAlive = false
  useChunkedEncodingByDefault = false
  sendDate = false
  finished = false
  headersSent = false
  strictContentLength = false
  connection = null
  socket = null

  req: IncomingMessage

  private _headers: Record<string, string | string[]> = {}

  constructor(req: IncomingMessage, collect = false) {
    super({
      write: (chunk: Buffer, _encoding: string, callback: () => void) => {
        if (!this.headersSent) {
          this.writeHead()
        }

        this.length += chunk.length

        if (collect) {
          this.body = (this.body || '') + decoder.decode(chunk)
        }

        callback()
      },
      destroy: () => {
        this.times.end = performance.now()
        this.finished = true
        this._res?.(null)
      },
    })

    this.await = new Promise((res) => (this._res = res))
    this.req = req
  }

  writeHead(status?: number): this {
    this.times.headers = performance.now()

    if (status) {
      this.statusCode = status
    }

    this.headersSent = true

    return this
  }

  setTimeout(): this {
    return this
  }

  appendHeader(name: string, value: string): this {
    return this.setHeader(name, value)
  }

  setHeader(name: string, value: string | string[]): this {
    this._headers[name.toLowerCase()] = value
    return this
  }

  getHeader(name: string): string | string[] | undefined {
    return this._headers[name.toLowerCase()]
  }

  getHeaders(): Record<string, string | string[]> {
    return this._headers
  }

  getHeaderNames(): string[] {
    return Object.keys(this._headers)
  }

  hasHeader(name: string): boolean {
    return name.toLowerCase() in this._headers
  }

  removeHeader(name: string): void {
    delete this._headers[name.toLowerCase()]
  }

  addTrailers(): void {}
  flushHeaders(): void {}
  assignSocket(): void {}
  detachSocket(): void {}
  writeContinue(): void {}
  writeProcessing(): void {}
  _implicitHeader(): void {}

  writeEarlyHints(
    _headers: Record<string, string | string[]>,
    cb?: () => void,
  ): void {
    if (typeof cb === 'function') {
      cb()
    }
  }
}
