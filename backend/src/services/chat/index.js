import {
  TOOL_DECLARATIONS,
  executeTool,
  ruleBasedReply,
  isHelpIntent,
  helpReplyText,
} from './tools.js'
import {
  getOrCreateChatSession,
  saveChatHistory,
} from './sessions.js'

const SYSTEM_INSTRUCTION = `Você é o assistente do CineRay, cinema online brasileiro.
Ajude o usuário a descobrir filmes no catálogo real (via ferramentas), escolher sessão/assentos, pagar com Pix fictício e cancelar ingressos.

Regras:
- Sempre use as ferramentas para dados de filmes, sessões, assentos e ingressos. Não invente horários, preços, locais ou IDs.
- Locais oficiais: CineRay Centro, CineRay Norte, CineRay Shopping. Se o usuário falar "centro", "norte" ou "shopping", use search_movies/list_showtimes com cinema correspondente.
- Também pode filtrar por date (DD/MM/AAAA) e maxPrice.
- Se o usuário pedir ajuda, comandos ou "o que você faz", explique busca (gênero/local/data/preço), compra Pix e cancelamento, com exemplos curtos.
- Fale em português do Brasil, curto e amigável (2–4 frases).
- Fluxo: search_movies → list_showtimes → suggest_seats → prepare_pix_purchase.
- Depois do Pix, o usuário confirma no botão "Já paguei — confirmar".
- Para cancelar: chame list_my_tickets. A interface mostra cards com botão "Cancelar ingresso".
- Cancelamento é um ingresso por vez. Se pedirem "cancelar todos", diga isso e mostre a lista — o usuário toca Cancelar em cada card.
- Só chame cancel_ticket depois que o usuário confirmar qual ingresso (filme + assento) ou tocar no botão.
- Tool calls: use SOMENTE o formato nativo da API (tool_calls). NUNCA escreva tags como <function=...>, </function>, JSON de ferramenta ou nomes de tool no texto ao usuário.
- Se needsAuth, peça login como cliente.
- No chat o pagamento é só Pix fictício.
- Em search_movies, use genre SEM acento (ex.: "acao", "comedia"). limit/quantity como string.
- NUNCA mostre ID de filme/sessão/ingresso (mov_..., st_..., tkt_...).
- NUNCA use tabelas markdown (| colunas |). A interface já mostra cards clicáveis.
- NÃO use markdown pesado (tabelas, código). Pode usar listas curtas com traço se quiser.`

const GROQ_DEFAULT = 'llama-3.3-70b-versatile'
const GROQ_MODEL_FALLBACKS = [
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b',
]

const MAX_HISTORY_MESSAGES = 6
const MAX_USER_CHARS = 800
const MAX_ASSISTANT_CHARS = 600
const MAX_TOOL_JSON_CHARS = 1000

const KNOWN_TOOLS = new Set(TOOL_DECLARATIONS.map((t) => t.name))

function getGroqKey() {
  return String(process.env.GROQ_API_KEY || '').trim()
}

function getGroqModels() {
  const preferred = String(process.env.GROQ_MODEL || GROQ_DEFAULT).trim()

  return [...new Set([preferred, ...GROQ_MODEL_FALLBACKS].filter(Boolean))].filter(
    (m) => !/llama-3\.1-8b/i.test(m),
  )
}

function compactToolResult(result) {
  if (!result || typeof result !== 'object') return { ok: false }
  const compact = {
    ok: result.ok,
    message: result.message,
    needsAuth: result.needsAuth,
  }
  if (Array.isArray(result.movies)) {
    compact.movies = result.movies.slice(0, 5).map((m) => ({
      id: m.id,
      title: m.title,
      genre: m.genre,
      rating: m.rating,
    }))
  }
  if (result.movie) {
    compact.movie = {
      id: result.movie.id,
      title: result.movie.title,
    }
  }
  if (Array.isArray(result.showtimes)) {
    compact.showtimes = result.showtimes.slice(0, 8).map((s) => ({
      id: s.id,
      date: s.date,
      time: s.time,
      cinema: s.cinema,
      price: s.price,
    }))
  }
  if (Array.isArray(result.seats)) {
    compact.seats = result.seats.slice(0, 6).map((s) => ({
      id: s.id,
      label: s.label,
      price: s.price,
    }))
  }
  if (Array.isArray(result.tickets)) {
    compact.tickets = result.tickets.slice(0, 6).map((t) => ({
      id: t.id,
      movieTitle: t.movieTitle,
      seatLabel: t.seatLabel,
      sessionDate: t.sessionDate,
      sessionTime: t.sessionTime,
    }))
  }
  if (result.pendingId) {
    compact.pendingId = result.pendingId
    compact.total = result.total
    compact.seatsLabel = result.seatsLabel
  }
  if (result.ticket) {
    compact.ticket = {
      id: result.ticket.id,
      movieTitle: result.ticket.movieTitle,
      seatLabel: result.ticket.seatLabel,
      status: result.ticket.status,
    }
  }
  return compact
}

function compactToolResultJson(result) {
  const json = JSON.stringify(compactToolResult(result))
  if (json.length <= MAX_TOOL_JSON_CHARS) return json
  return `${json.slice(0, MAX_TOOL_JSON_CHARS - 3)}...`
}

function slimHistory(history) {
  const out = []
  for (const msg of history || []) {
    if (msg.role === 'user' && typeof msg.content === 'string') {
      out.push({
        role: 'user',
        content: msg.content.slice(0, MAX_USER_CHARS),
      })
    } else if (
      msg.role === 'assistant' &&
      typeof msg.content === 'string' &&
      msg.content &&
      !msg.tool_calls
    ) {
      out.push({
        role: 'assistant',
        content: msg.content.slice(0, MAX_ASSISTANT_CHARS),
      })
    }
  }
  return out.slice(-MAX_HISTORY_MESSAGES)
}

function collectUi(toolResults) {
  const blocks = []
  for (const result of toolResults) {
    if (result?.ui) blocks.push(result.ui)
  }
  return blocks
}

function toOpenAiParameters(parameters = {}) {
  const props = {}
  for (const [key, schema] of Object.entries(parameters.properties || {})) {
    const upper = String(schema.type || '').toUpperCase()
    if (upper === 'ARRAY') {
      props[key] = {
        type: 'string',
        description: `${schema.description || key} (lista separada por vírgula)`,
      }
    } else {
      props[key] = {
        type: 'string',
        description: schema.description || key,
      }
    }
  }

  if (Object.keys(props).length === 0) {
    props._ = { type: 'string', description: 'Deixe vazio.' }
  }

  return {
    type: 'object',
    properties: props,
    ...(parameters.required?.length ? { required: parameters.required } : {}),
  }
}

function openAiTools() {
  return TOOL_DECLARATIONS.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: toOpenAiParameters(
        tool.parameters || { type: 'OBJECT', properties: {} },
      ),
    },
  }))
}

function tryParseJsonObject(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {

    const start = raw.indexOf('{')
    if (start < 0) return null
    let snippet = raw.slice(start)
    if (!snippet.endsWith('}')) {

      const quoteCount = (snippet.match(/"/g) || []).length
      if (quoteCount % 2 === 1) snippet += '"'
      snippet += '}'
    }
    try {
      const parsed = JSON.parse(snippet)
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {

      const genre = snippet.match(/"genre"\s*:\s*"([^"]*)"/i)?.[1]
      const query = snippet.match(/"query"\s*:\s*"([^"]*)"/i)?.[1]
      if (genre || query) return { genre: genre || '', query: query || '' }
      return null
    }
  }
}

function recoverToolCallsFromError(error) {
  const message = String(error?.message || '')
  const failedGeneration = String(error?.failedGeneration || '')
  const blob = `${message}\n${failedGeneration}`

  const calls = []

  const jammed = blob.match(
    /(?:attempted to call tool|tool)\s*['`]?([a-z_]+)\s+(\{[\s\S]*?)(?:['`]|$)/i,
  )
  if (jammed) {
    const name = jammed[1]
    if (KNOWN_TOOLS.has(name)) {
      const args = tryParseJsonObject(jammed[2]) || {}

      if (args.genre && /a[cç]$/i.test(args.genre) && args.genre.length <= 4) {
        args.genre = 'acao'
      }
      calls.push({ id: `recovered_${name}`, name, args })
    }
  }

  if (!calls.length) {
    for (const name of KNOWN_TOOLS) {
      if (new RegExp(`\\b${name}\\b`).test(blob) && /genre|query|movieId|showtimeId/i.test(blob)) {
        const args = tryParseJsonObject(blob) || {}
        if (/a[cç]/i.test(blob) && !args.genre) args.genre = 'acao'
        calls.push({ id: `recovered_${name}`, name, args })
        break
      }
    }
  }

  return calls
}

function isToolValidationError(error) {
  const msg = String(error?.message || '').toLowerCase()
  return (
    msg.includes('tool call validation failed') ||
    msg.includes('failed to call a function') ||
    msg.includes('failed_generation')
  )
}

async function runToolCalls(functionCalls, ctx) {
  const uiResults = []
  const openAiToolMessages = []

  for (const call of functionCalls) {
    const name = call.name
    let args = call.args || {}
    if (typeof args === 'string') {
      args = tryParseJsonObject(args) || {}
    }

    let result
    try {
      result = await executeTool(name, args, ctx)
    } catch (error) {
      result = {
        ok: false,
        message: error.message || 'Erro ao executar ferramenta.',
      }
    }
    uiResults.push(result)

    openAiToolMessages.push({
      role: 'tool',
      tool_call_id: call.id || `call_${name}`,
      content: compactToolResultJson(result),
    })
  }

  return { uiResults, openAiToolMessages }
}

async function callGroqOnce({ model, messages, tools, toolChoice = 'auto' }) {
  const apiKey = getGroqKey()
  const body = {
    model,
    temperature: 0.2,
    max_tokens: 1024,
    messages,
    tools,
    tool_choice: toolChoice,
    parallel_tool_calls: false,
  }

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data?.error?.message || `Groq HTTP ${response.status}`
    const err = new Error(message)
    err.status = 502
    err.code = 'GROQ_ERROR'
    err.model = model
    err.failedGeneration =
      data?.error?.failed_generation || data?.error?.failedGeneration || ''
    throw err
  }

  return data
}

function isRetryableGroqError(error) {
  const msg = String(error?.message || '').toLowerCase()
  return (
    isToolValidationError(error) ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('request too large') ||
    msg.includes('payload too large') ||
    msg.includes('context_length') ||
    msg.includes('over capacity') ||
    msg.includes('503') ||
    msg.includes('429')
  )
}

let resolvedModel = null

async function callGroq({ messages, tools, toolChoice = 'auto' }) {

  if (resolvedModel && /llama-3\.1-8b/i.test(resolvedModel)) {
    resolvedModel = null
  }

  const models = resolvedModel
    ? [resolvedModel, ...getGroqModels().filter((m) => m !== resolvedModel)]
    : getGroqModels()

  let lastError = null
  for (const model of models) {
    try {
      const data = await callGroqOnce({ model, messages, tools, toolChoice })
      resolvedModel = model
      return data
    } catch (error) {
      lastError = error
      if (!isRetryableGroqError(error)) throw error

      if (/request too large|context_length|payload too large/i.test(error.message || '')) {
        resolvedModel = null
      }
    }
  }
  throw lastError
}

function summarizeFromToolResults(uiResults) {
  const movies = uiResults.find((r) => r?.ui?.type === 'movie_picks')
  if (movies?.movies?.length) {
    const titles = movies.movies.map((m) => m.title).join(', ')
    return `Encontrei estas opções: ${titles}. Toque em um filme para ver os horários.`
  }
  const showtimes = uiResults.find((r) => r?.ui?.type === 'showtimes')
  if (showtimes?.showtimes?.length) {
    return `Horários disponíveis para ${showtimes.movie?.title || 'o filme'}. Escolha uma sessão.`
  }
  const seats = uiResults.find((r) => r?.ui?.type === 'seats')
  if (seats?.seats?.length) {
    return `Separei os assentos ${seats.seats.map((s) => s.label).join(', ')}.`
  }
  const pix = uiResults.find((r) => r?.ui?.type === 'pix_payment')
  if (pix?.ui) {
    return 'QR Pix gerado. Escaneie e toque em "Já paguei — confirmar".'
  }
  const cancel = uiResults.find((r) => r?.ui?.type === 'cancel_result')
  if (cancel?.message) {
    return cancel.message
  }
  const tickets = uiResults.find((r) => r?.ui?.type === 'tickets')
  if (tickets?.tickets?.length) {
    const n = tickets.tickets.length
    return n === 1
      ? 'Encontrei 1 ingresso ativo. Toque em Cancelar se quiser desistir dele.'
      : `Encontrei ${n} ingressos ativos. O cancelamento é um por vez — toque em Cancelar no card desejado.`
  }
  if (tickets && Array.isArray(tickets.tickets) && tickets.tickets.length === 0) {
    return 'Você não tem ingressos ativos para cancelar.'
  }
  const ok = uiResults.find((r) => r?.ok && r?.message)
  if (ok?.message) return ok.message
  return 'Pronto. Como posso continuar?'
}

function parseMoviesFromMarkdownTable(text) {
  const lines = String(text || '').split('\n')
  const movies = []
  for (const line of lines) {
    if (!line.includes('|')) continue
    if (/^\s*\|?\s*-+/.test(line)) continue
    if (/t[ií]tulo|g[eê]nero|\bid\b/i.test(line) && !/mov_/i.test(line)) continue
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean)
    if (cells.length < 2) continue
    const idCell = cells.find((c) => /^mov_[a-z0-9]+$/i.test(c))
    const titleCell = cells.find(
      (c) => c !== idCell && !/^mov_/i.test(c) && c.length > 1 && c.length < 80,
    )
    if (!idCell || !titleCell) continue
    const genreCell = cells.find((c) => c !== idCell && c !== titleCell)
    movies.push({
      id: idCell,
      title: titleCell,
      genre: genreCell || '',
    })
  }
  return movies
}

function parseLeakedToolCalls(text) {
  const raw = String(text || '')
  const calls = []
  const seen = new Set()

  const xmlRe =
    /<function\s*=\s*([a-z_]+)>\s*(\{[\s\S]*?\})\s*<\/function>/gi
  let match
  while ((match = xmlRe.exec(raw))) {
    const name = match[1]
    if (!KNOWN_TOOLS.has(name)) continue
    const args = tryParseJsonObject(match[2]) || {}
    const key = `${name}:${JSON.stringify(args)}`
    if (seen.has(key)) continue
    seen.add(key)
    calls.push({ id: `leaked_${name}_${calls.length}`, name, args })
  }

  const openRe =
    /<function\s*=\s*([a-z_]+)>\s*(\{[^<]*\})/gi
  while ((match = openRe.exec(raw))) {
    const name = match[1]
    if (!KNOWN_TOOLS.has(name)) continue
    const args = tryParseJsonObject(match[2]) || {}
    const key = `${name}:${JSON.stringify(args)}`
    if (seen.has(key)) continue
    seen.add(key)
    calls.push({ id: `leaked_${name}_${calls.length}`, name, args })
  }

  return calls
}

function stripUglyAiFormatting(text) {
  return String(text || '')
    .replace(/<function\s*=\s*[a-z_]+>\s*\{[\s\S]*?\}\s*<\/function>/gi, '')
    .replace(/<function\s*=\s*[a-z_]+>\s*\{[^<]*\}?/gi, '')
    .replace(/<\/?function[^>]*>/gi, '')
    .replace(/\b(tkt_|mov_|st_)[a-z0-9]+\b/gi, '')
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      if (!t) return true
      if (t.includes('|') && (t.match(/\|/g) || []).length >= 2) return false
      if (/^\s*\|?\s*-{3,}/.test(t)) return false
      if (/^mov_[a-z0-9]+$/i.test(t)) return false
      if (/^(cancel_ticket|list_my_tickets|search_movies)\b/i.test(t)) return false
      return true
    })
    .join('\n')
    .replace(/\bmov_[a-z0-9]+\b/gi, '')
    .replace(/\*\*/g, '')
    .replace(/`+/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function formatAssistantOutput(text, uiBlocks = []) {
  const parsedMovies = parseMoviesFromMarkdownTable(text)
  const blocks = [...uiBlocks]

  const hasMovieUi = blocks.some((b) => b?.type === 'movie_picks')
  if (!hasMovieUi && parsedMovies.length) {
    blocks.push({ type: 'movie_picks', movies: parsedMovies })
  }

  let clean = stripUglyAiFormatting(text)
  if (!clean || clean.length < 8) {
    if (blocks.some((b) => b.type === 'cancel_result')) {
      clean = 'Ingresso cancelado com sucesso.'
    } else if (blocks.some((b) => b.type === 'tickets')) {
      const ticketsBlock = blocks.find((b) => b.type === 'tickets')
      const n = ticketsBlock?.tickets?.length || 0
      clean =
        n > 1
          ? `Você tem ${n} ingressos ativos. O cancelamento é um por vez — toque em Cancelar no card que quiser.`
          : n === 1
            ? 'Encontrei seu ingresso. Toque em Cancelar se quiser desistir dele.'
            : 'Você não tem ingressos ativos para cancelar.'
    } else if (blocks.some((b) => b.type === 'movie_picks')) {
      clean = 'Encontrei estas opções. Toque em um filme para ver os horários.'
    } else if (blocks.some((b) => b.type === 'showtimes')) {
      clean = 'Escolha uma sessão abaixo.'
    } else if (blocks.some((b) => b.type === 'pix_payment')) {
      clean = 'QR Pix gerado. Escaneie e toque em "Já paguei — confirmar".'
    }
  }

  return { text: clean, uiBlocks: blocks }
}

async function handleWithGroq({ session, message, ctx }) {
  const history = slimHistory(
    session.provider === 'groq' && Array.isArray(session.history)
      ? session.history
      : [],
  )

  const userText = String(message || '').slice(0, MAX_USER_CHARS)
  let working = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    ...history,
    { role: 'user', content: userText },
  ]

  const tools = openAiTools()
  const allToolResults = []
  let finalText = ''

  for (let round = 0; round < 5; round += 1) {
    let data = null
    try {
      data = await callGroq({ messages: working, tools })
    } catch (firstError) {
      let error = firstError

      if (/request too large|context_length|payload too large/i.test(error.message || '')) {
        working = [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: userText },
        ]
        try {
          data = await callGroq({ messages: working, tools })
          error = null
        } catch (retryError) {
          error = retryError
        }
      }

      if (!data && error) {
        if (!isToolValidationError(error)) throw error

        const recovered = recoverToolCallsFromError(error)
        if (!recovered.length) throw error

        const { uiResults } = await runToolCalls(recovered, ctx)
        allToolResults.push(...uiResults)
        finalText = summarizeFromToolResults(uiResults)

        try {
          const apiKey = getGroqKey()
          const model = resolvedModel || getGroqModels()[0]
          const response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                temperature: 0.3,
                max_tokens: 300,
                messages: [
                  {
                    role: 'system',
                    content:
                      'Resuma o resultado ao usuário em português, curto. Não invente filmes.',
                  },
                  {
                    role: 'user',
                    content: `Pedido: ${userText}\nDados: ${JSON.stringify(uiResults.map(compactToolResult)).slice(0, 1500)}`,
                  },
                ],
              }),
            },
          )
          const payload = await response.json().catch(() => ({}))
          const text = payload?.choices?.[0]?.message?.content
          if (response.ok && text) finalText = String(text).trim()
        } catch {

        }
        break
      }
    }

    const choice = data?.choices?.[0]?.message || {}
    const toolCalls = choice.tool_calls || []

    if (!toolCalls.length) {
      const leaked = parseLeakedToolCalls(choice.content || '')
      if (leaked.length) {

        const safeCalls = leaked.map((call) =>
          call.name === 'cancel_ticket'
            ? {
                id: `leaked_list_${call.id || 'tickets'}`,
                name: 'list_my_tickets',
                args: { onlyActive: 'true' },
              }
            : call,
        )
        const { uiResults, openAiToolMessages } = await runToolCalls(
          safeCalls,
          ctx,
        )
        allToolResults.push(...uiResults)
        working = [
          ...working,
          {
            role: 'assistant',
            content: stripUglyAiFormatting(choice.content) || null,
            tool_calls: safeCalls.map((c) => ({
              id: c.id,
              type: 'function',
              function: {
                name: c.name,
                arguments:
                  typeof c.args === 'string'
                    ? c.args
                    : JSON.stringify(c.args || {}),
              },
            })),
          },
          ...openAiToolMessages,
        ]
        continue
      }

      finalText =
        String(choice.content || '').trim() ||
        'Pronto! Como mais posso ajudar?'
      break
    }

    const assistantMsg = {
      role: 'assistant',
      content: choice.content || null,
      tool_calls: toolCalls,
    }
    working = [...working, assistantMsg]

    const parsedCalls = toolCalls.map((tc) => ({
      id: tc.id,
      name: tc.function?.name,
      args: tc.function?.arguments,
    }))
    const { uiResults, openAiToolMessages } = await runToolCalls(
      parsedCalls,
      ctx,
    )
    allToolResults.push(...uiResults)
    working = [...working, ...openAiToolMessages]
  }

  if (!finalText) {
    finalText =
      summarizeFromToolResults(allToolResults) ||
      'Usei as ferramentas do catálogo. Veja as opções no chat e me diga como seguir.'
  }

  const formatted = formatAssistantOutput(
    finalText,
    collectUi(allToolResults),
  )

  const nextHistory = slimHistory([
    ...history,
    { role: 'user', content: userText },
    { role: 'assistant', content: formatted.text },
  ])
  session.provider = 'groq'
  saveChatHistory(session.id, nextHistory)

  return {
    reply: formatted.text,
    uiBlocks: formatted.uiBlocks,
    provider: 'groq',
  }
}

export async function handleChatMessage({
  sessionId,
  message,
  user,
  holderKey,
}) {
  const session = getOrCreateChatSession({
    sessionId,
    userId: user?.id || null,
    holderKey,
  })

  const ctx = {
    user,
    holderKey: session.holderKey,
    sessionId: session.id,
  }

  if (isHelpIntent(message)) {
    return {
      sessionId: session.id,
      reply: helpReplyText(),
      uiBlocks: [],
      holderKey: session.holderKey,
      provider: 'help',
    }
  }

  if (!getGroqKey()) {
    const fallback = await ruleBasedReply(message, ctx)
    return {
      sessionId: session.id,
      reply: `${fallback.text}\n\n_(Configure GROQ_API_KEY em https://console.groq.com/keys para o assistente com IA.)_`,
      uiBlocks: fallback.uiBlocks || [],
      holderKey: session.holderKey,
      provider: 'fallback',
    }
  }

  try {
    const result = await handleWithGroq({ session, message, ctx })
    return {
      sessionId: session.id,
      reply: result.reply,
      uiBlocks: result.uiBlocks,
      holderKey: session.holderKey,
      provider: result.provider,
    }
  } catch (error) {

    if (isToolValidationError(error)) {
      const recovered = recoverToolCallsFromError(error)
      if (recovered.length) {
        const { uiResults } = await runToolCalls(recovered, ctx)
        const formatted = formatAssistantOutput(
          summarizeFromToolResults(uiResults),
          collectUi(uiResults),
        )
        return {
          sessionId: session.id,
          reply: formatted.text,
          uiBlocks: formatted.uiBlocks,
          holderKey: session.holderKey,
          provider: 'groq',
        }
      }
    }

    const fallback = await ruleBasedReply(message, ctx)
    const formatted = formatAssistantOutput(
      fallback.text,
      fallback.uiBlocks || [],
    )
    return {
      sessionId: session.id,
      reply: `${formatted.text}\n\n_(Groq indisponível: ${String(error.message || '').slice(0, 80)})_`,
      uiBlocks: formatted.uiBlocks,
      holderKey: session.holderKey,
      provider: 'fallback',
    }
  }
}
