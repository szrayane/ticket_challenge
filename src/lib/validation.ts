export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const calcDigit = (base: string, factor: number) => {
    let total = 0
    for (let i = 0; i < base.length; i += 1) {
      total += Number(base[i]) * (factor - i)
    }
    const remainder = (total * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  const d1 = calcDigit(cpf.slice(0, 9), 10)
  const d2 = calcDigit(cpf.slice(0, 10), 11)
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10])
}

export function formatCardNumber(value: string): string {
  const digits = onlyDigits(value).slice(0, 19)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

export function isValidCardNumber(value: string): boolean {
  const number = onlyDigits(value)
  if (number.length < 13 || number.length > 19) return false
  if (!/^\d+$/.test(number)) return false

  let sum = 0
  let alternate = false
  for (let i = number.length - 1; i >= 0; i -= 1) {
    let digit = Number(number[i])
    if (alternate) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    alternate = !alternate
  }
  return sum % 10 === 0
}

export function formatCardExpiry(value: string): string {
  const digits = onlyDigits(value).slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function isValidCardExpiry(value: string): boolean {
  const digits = onlyDigits(value)
  if (digits.length !== 4) return false

  const month = Number(digits.slice(0, 2))
  const year = Number(digits.slice(2, 4))
  if (month < 1 || month > 12) return false

  const now = new Date()
  const currentYear = now.getFullYear() % 100
  const currentMonth = now.getMonth() + 1

  if (year < currentYear) return false
  if (year === currentYear && month < currentMonth) return false
  return true
}

export function formatCvv(value: string): string {
  return onlyDigits(value).slice(0, 4)
}

export function isValidCvv(value: string): boolean {
  const digits = onlyDigits(value)
  return digits.length === 3 || digits.length === 4
}

export function isValidCardHolderName(value: string): boolean {
  const name = value.trim()
  return name.length >= 3 && /[a-zA-ZÀ-ÿ]/.test(name)
}

export function isValidEmail(value: string): boolean {
  const email = value.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidLoginPassword(value: string): boolean {
  return value.length >= 4
}
