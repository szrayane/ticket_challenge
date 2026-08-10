export function buildTicketQrPayload(ticketId: string) {
  return `CR2.pending.${ticketId}`
}
