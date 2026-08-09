/**
 * Placeholder no cliente — o backend cifra o QR com AES-256-GCM (CR2.…).
 * Não coloque e-mail, CPF ou dados da sessão no código.
 */
export function buildTicketQrPayload(ticketId: string) {
  return `CR2.pending.${ticketId}`
}
