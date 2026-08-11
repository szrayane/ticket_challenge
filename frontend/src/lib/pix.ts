export function buildPixPayload(params: {
  amount: number
  movieTitle: string
  seatsLabel: string
  payerName?: string
  userId?: string
}) {
  const amount = params.amount.toFixed(2)
  const payerTag = params.userId ? ` U${params.userId.slice(-8)}` : ''
  const description = `CineRay ${params.movieTitle} Assentos ${params.seatsLabel}${payerTag}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 72)

  const userPart = params.userId
    ? params.userId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()
    : ''
  const txid = `CINERAY${userPart}${Date.now().toString(36).toUpperCase()}`.slice(0, 25)
  const merchantName = (params.payerName || 'CineRay').slice(0, 25)
  const merchantCity = 'SAO PAULO'

  const payload = [
    '000201',
    '010212',
    `26${pad(14 + description.length)}${tlv('00', 'BR.GOV.BCB.PIX')}${tlv('02', description)}`,
    '52040000',
    '5303986',
    tlv('54', amount),
    '5802BR',
    tlv('59', merchantName),
    tlv('60', merchantCity),
    tlv('62', tlv('05', txid)),
    '6304',
  ].join('')

  return `${payload}${crc16(payload)}`
}

function tlv(id: string, value: string) {
  return `${id}${pad(value.length)}${value}`
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function crc16(payload: string) {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}
