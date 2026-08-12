type TicketPdfInfo = {
  movieTitle: string
  sessionDate: string
  sessionTime: string
  cinema: string
  room: string
  seatLabel: string
  totalPaid: string
  ticketId?: string
}

const COLORS = {
  bg: '#121214',
  panel: '#1e1e20',
  panelAlt: '#18181a',
  line: 'rgba(201, 137, 150, 0.35)',
  primary: '#c98996',
  text: '#ece8e6',
  muted: '#b9a8ab',
  white: '#ffffff',
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao carregar a logo.'))
    img.src = src
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3,
) {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return y
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  const shown = lines.slice(0, maxLines)
  if (lines.length > maxLines) {
    const last = shown[shown.length - 1]
    shown[shown.length - 1] = `${last.replace(/\s+\S*$/, '')}…`
  }
  shown.forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight)
  })
  return y + shown.length * lineHeight
}

function drawMetaRow(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
) {
  ctx.fillStyle = COLORS.muted
  ctx.font = '500 22px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(label.toUpperCase(), x, y)
  ctx.fillStyle = COLORS.text
  ctx.font = '600 28px system-ui, -apple-system, Segoe UI, sans-serif'
  const valueY = y + 34
  const maxW = w
  if (ctx.measureText(value).width > maxW) {
    drawWrappedText(ctx, value, x, valueY, maxW, 32, 2)
  } else {
    ctx.fillText(value, x, valueY)
  }
  return valueY + 48
}

async function renderTicketCanvas(
  qrCanvas: HTMLCanvasElement,
  info: TicketPdfInfo,
) {
  const width = 840
  const height = 1188
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível.')

  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, width, height)

  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, 'rgba(143, 61, 82, 0.22)')
  grad.addColorStop(0.45, 'rgba(18, 18, 20, 0)')
  grad.addColorStop(1, 'rgba(201, 137, 150, 0.12)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  const cardX = 48
  const cardY = 48
  const cardW = width - 96
  const cardH = height - 96
  roundRect(ctx, cardX, cardY, cardW, cardH, 28)
  ctx.fillStyle = COLORS.panel
  ctx.fill()
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.stroke()

  let logo: HTMLImageElement | null = null
  try {
    logo = await loadImage('/cineray-logo.png')
  } catch {
    logo = null
  }

  const logoMaxW = 320
  const logoMaxH = 88
  if (logo) {
    const scale = Math.min(logoMaxW / logo.width, logoMaxH / logo.height)
    const lw = Math.round(logo.width * scale)
    const lh = Math.round(logo.height * scale)
    const lx = Math.round(cardX + (cardW - lw) / 2)
    const ly = cardY + 36
    roundRect(ctx, lx - 16, ly - 10, lw + 32, lh + 20, 14)
    ctx.fillStyle = '#000000'
    ctx.fill()
    ctx.drawImage(logo, lx, ly, lw, lh)
  } else {
    ctx.fillStyle = COLORS.primary
    ctx.font = '700 42px system-ui, -apple-system, Segoe UI, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('CineRay', width / 2, cardY + 78)
    ctx.textAlign = 'left'
  }

  let y = cardY + 150
  ctx.strokeStyle = COLORS.line
  ctx.beginPath()
  ctx.moveTo(cardX + 40, y)
  ctx.lineTo(cardX + cardW - 40, y)
  ctx.stroke()

  y += 48
  ctx.fillStyle = COLORS.primary
  ctx.font = '600 20px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText('INGRESSO', cardX + 48, y)

  y += 42
  ctx.fillStyle = COLORS.text
  ctx.font = '700 40px system-ui, -apple-system, Segoe UI, sans-serif'
  y = drawWrappedText(
    ctx,
    info.movieTitle,
    cardX + 48,
    y,
    cardW - 96,
    46,
    3,
  )

  y += 28
  const colW = (cardW - 96) / 2
  const leftX = cardX + 48
  const rightX = leftX + colW + 24
  const row1 = Math.max(
    drawMetaRow(
      ctx,
      'Data',
      info.sessionDate,
      leftX,
      y,
      colW - 12,
    ),
    drawMetaRow(
      ctx,
      'Horário',
      info.sessionTime,
      rightX,
      y,
      colW - 12,
    ),
  )

  y = row1 + 8
  const row2 = Math.max(
    drawMetaRow(ctx, 'Cinema', info.cinema, leftX, y, colW - 12),
    drawMetaRow(ctx, 'Sala', info.room, rightX, y, colW - 12),
  )

  y = row2 + 8
  const row3 = Math.max(
    drawMetaRow(ctx, 'Assento', info.seatLabel, leftX, y, colW - 12),
    drawMetaRow(ctx, 'Valor', info.totalPaid, rightX, y, colW - 12),
  )

  y = row3 + 16

  const tearY = y
  ctx.strokeStyle = COLORS.line
  ctx.setLineDash([8, 10])
  ctx.beginPath()
  ctx.moveTo(cardX + 28, tearY)
  ctx.lineTo(cardX + cardW - 28, tearY)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = COLORS.bg
  ctx.beginPath()
  ctx.arc(cardX, tearY, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cardX + cardW, tearY, 14, 0, Math.PI * 2)
  ctx.fill()

  y = tearY + 36
  ctx.fillStyle = COLORS.muted
  ctx.font = '500 18px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Apresente este QR na portaria', width / 2, y)
  ctx.textAlign = 'left'

  const qrSize = 320
  const qrPad = 18
  const qrBox = qrSize + qrPad * 2
  const qrBoxX = Math.round((width - qrBox) / 2)
  const qrBoxY = y + 24

  roundRect(ctx, qrBoxX, qrBoxY, qrBox, qrBox, 20)
  ctx.fillStyle = COLORS.white
  ctx.fill()
  ctx.drawImage(qrCanvas, qrBoxX + qrPad, qrBoxY + qrPad, qrSize, qrSize)

  const footerY = Math.min(cardY + cardH - 36, qrBoxY + qrBox + 48)
  ctx.fillStyle = COLORS.muted
  ctx.font = '500 16px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.textAlign = 'center'
  const idHint = info.ticketId
    ? `CineRay · ${info.ticketId.slice(-8).toUpperCase()}`
    : 'CineRay'
  ctx.fillText(idHint, width / 2, footerY)
  ctx.textAlign = 'left'

  return canvas
}

function buildPdfFromJpeg(jpeg: Uint8Array, imgW: number, imgH: number) {
  const pageW = 420
  const pageH = 595

  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const offsets: number[] = [0]
  let length = 0

  function push(chunk: string | Uint8Array) {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk
    parts.push(bytes)
    length += bytes.length
  }

  function markObject() {
    offsets.push(length)
  }

  push('%PDF-1.4\n')

  markObject()
  push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')

  markObject()
  push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')

  markObject()
  push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>\nendobj\n`,
  )

  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q\n`
  markObject()
  push(`4 0 obj\n<< /Length ${encoder.encode(content).length} >>\nstream\n`)
  push(content)
  push('endstream\nendobj\n')

  markObject()
  push(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  )
  push(jpeg)
  push('\nendstream\nendobj\n')

  const xrefStart = length
  push(`xref\n0 ${offsets.length}\n`)
  push('0000000000 65535 f \n')
  for (let i = 1; i < offsets.length; i += 1) {
    push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)
  }
  push(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  )

  const out = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement, quality = 0.92) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/jpeg', quality)
  })
  if (!blob) throw new Error('Falha ao gerar imagem do ingresso.')
  return new Uint8Array(await blob.arrayBuffer())
}

export async function downloadTicketPdf(options: {
  qrCanvas: HTMLCanvasElement
  fileName: string
  ticket: TicketPdfInfo
}) {
  const { qrCanvas, fileName, ticket } = options
  const ticketCanvas = await renderTicketCanvas(qrCanvas, ticket)
  const jpeg = await canvasToJpegBytes(ticketCanvas)
  const pdf = buildPdfFromJpeg(jpeg, ticketCanvas.width, ticketCanvas.height)
  const blob = new Blob([pdf], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
}
