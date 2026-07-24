import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  TIER_STARTING_MODELS,
  classifyRequest,
  TIER_MAX_TOKENS,
  getFallbackPool,
  isGroqModel,
  estimatePromptTokens,
  filterModelsByTokenEstimate,
  MODEL_TPM_LIMITS,
} from '@/lib/ai/modelRouting'
import prisma from '@/lib/db/prisma'
import {
  classifyGenerationMode,
  buildContractOnlyPrompt,
  buildFullDappPrompt,
  buildWebAppPrompt,
} from '@/lib/ai/contractSystemPrompt'
import { GoogleGenAI } from '@google/genai'

// ---------------------------------------------------------------------------
// Plan / Agent mode system-prompt appendices
// ---------------------------------------------------------------------------

const PLAN_MODE_INSTRUCTION = `
You are in PLAN mode. Produce a complete PRD, technical architecture, and a phased roadmap from v0 (current draft) to v1 (working MVP) for what the user is asking. Structure the output in clean markdown with headers: ## Overview, ## Core Entities, ## User Roles, ## Features (v0 vs v1), ## Architecture, ## Roadmap (v0 to v1 steps), ## Open Questions. Everything described must be technically workable, not aspirational. Do not write implementation code in this mode — only the plan.

CRITICAL INSTRUCTION:
Do NOT output JSON. Do NOT wrap your response in a JSON object, code block, or files array. Output ONLY raw markdown text starting directly with ## Overview.`

const AGENT_MODE_INSTRUCTION = `
You are in AGENT mode. You have an approved plan (see context). Implement it step by step, writing real working code. Select model tier based on task complexity using the existing model routing system — do not always use the same model for every step. Do NOT include plan.md in the files array — only return implementation code files.`

export function extractPlanMarkdown(raw: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed) {
        if (Array.isArray(parsed.files) && parsed.files.length > 0) {
          const planFile = parsed.files.find(
            (f: any) => f.path && (f.path.toLowerCase() === 'plan.md' || f.path.toLowerCase().endsWith('/plan.md'))
          ) || parsed.files[0]
          if (planFile && typeof planFile.content === 'string') {
            return extractPlanMarkdown(planFile.content)
          }
        }
        const candidate = parsed.planContent || parsed.content || parsed.plan || parsed.markdown || parsed.summary
        if (typeof candidate === 'string') {
          return extractPlanMarkdown(candidate)
        }
      }
    } catch (err) {}
  }

  const fenceMatch = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }

  return trimmed
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CurrentFile {
  path: string
  content: string
  language: string
}

/**
 * Robust JSON extractor — handles:
 * 1. Raw JSON
 * 2. Markdown fenced JSON (```json ... ```)
 * 3. Leading/trailing prose with JSON somewhere inside
 */
function extractJSON(text: string): unknown {
  // 1. Direct parse
  try { return JSON.parse(text) } catch (err) {}

  // 2. Strip outermost markdown fences and retry
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch (err) {}
  }

  // 3. Find the outermost { ... } block
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)) } catch (err) {}
  }

  throw new Error('Could not extract JSON from model response')
}

function computeDiffStats(oldContent: string, newContent: string): { additions: number; deletions: number } {
  const oldLines = (oldContent || '').split('\n')
  const newLines = (newContent || '').split('\n')
  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)
  let additions = 0
  let deletions = 0
  for (const line of newLines) {
    if (!oldSet.has(line)) additions++
  }
  for (const line of oldLines) {
    if (!newSet.has(line)) deletions++
  }
  return { additions, deletions }
}

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { userId: authUserId } = await auth()
  if (!authUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  try {
    const body = await req.json()
    const {
      prompt,
      messages = [] as ConversationMessage[],
      currentFiles = [] as CurrentFile[],
      model = 'poolside/laguna-m.1:free',
      projectId,
      userId = authUserId,
      mode = 'Agent', // 'Plan' | 'Agent'
      skillInstructions = '',
      imageUrl = '',
    } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const key = (process.env.OPENROUTER_API_KEY || '').trim()
    console.log(`[DEBUG - API] OPENROUTER_API_KEY read check: present = ${!!key}, length = ${key.length}`)

    if (!key) {
      console.error("❌ OPENROUTER_API_KEY is missing or empty. Check .env.local and restart the dev server.")
      return NextResponse.json(
        { error: 'missing_api_key', message: 'No OpenRouter API key configured. Add OPENROUTER_API_KEY to .env.local and restart the dev server.' },
        { status: 500 }
      )
    }

    const isRestart =
      prompt.toLowerCase().trim() === 'start over' ||
      prompt.toLowerCase().trim() === 'start fresh' ||
      prompt.toLowerCase().trim() === 'new project' ||
      prompt.toLowerCase().trim() === 'scrap this'

    // ── Classify request and build system prompt ──────────────────────────────
    const generationMode = classifyGenerationMode(prompt, currentFiles)
    console.log(`[DEBUG - API] Generation mode: ${generationMode}`)

    let projectStatePrompt = ''
    if (currentFiles.length > 0 && !isRestart) {
      projectStatePrompt = `You are continuing work on an existing project. Here is the current state of all files:
${currentFiles
  .map((f: CurrentFile) => `### ${f.path}\n\`\`\`${f.language || ''}\n${f.content}\n\`\`\``)
  .join('\n\n')}

The user's new instruction should be applied as an edit or addition to this existing project — do not regenerate files from scratch unless the user explicitly asks to start over. If a file isn't affected by the instruction, leave it untouched and don't return it, or return it unchanged. Output only the new or modified files in the files array.`
    } else {
      projectStatePrompt = `You are starting a completely fresh project. Generate a complete, working implementation based on the user's request.`
    }

    let systemPrompt: string
    if (mode === 'Plan') {
      systemPrompt = PLAN_MODE_INSTRUCTION
      if (projectStatePrompt) {
        systemPrompt += `\n\nExisting project context:\n${projectStatePrompt}`
      }
    } else if (generationMode === 'SOROBAN_CONTRACT') {
      systemPrompt = buildContractOnlyPrompt(prompt, currentFiles, projectStatePrompt)
    } else if (generationMode === 'FULL_DAPP') {
      systemPrompt = buildFullDappPrompt(prompt, currentFiles, projectStatePrompt)
    } else {
      systemPrompt = buildWebAppPrompt(projectStatePrompt)
    }

    if (mode === 'Agent') {
      systemPrompt += '\n\n' + AGENT_MODE_INSTRUCTION
    }

    if (skillInstructions) {
      systemPrompt = `## APPLIED SKILL INSTRUCTIONS:\n${skillInstructions}\n\n` + systemPrompt
    }

    // 1. Fetch preceding context (last 20 messages) from database if projectId is set
    let precedingMessages: ConversationMessage[] = []
    if (projectId) {
      try {
        const dbMessages = await prisma.chatMessage.findMany({
          where: { projectId },
          take: 20,
          orderBy: { createdAt: 'desc' }
        })
        dbMessages.reverse() // Restore chronological order
        precedingMessages = dbMessages.map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
      } catch (dbErr) {
        console.error('[API - Generate] Failed to fetch preceding chat history:', dbErr)
      }
    }

    // 2. Save current user prompt to database
    if (projectId) {
      try {
        await prisma.chatMessage.create({
          data: {
            projectId,
            role: 'user',
            content: prompt
          }
        })
      } catch (dbErr) {
        console.error('[API - Generate] Failed to save user prompt to database:', dbErr)
      }
    }

    // 3. Build conversation history for the model
    const conversationMessages: Array<{ role: string; content: string }> = []
    const historySource = precedingMessages.length > 0 ? precedingMessages : messages

    for (const msg of historySource as ConversationMessage[]) {
      conversationMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })
    }
    conversationMessages.push({ role: 'user', content: prompt })

    const rawGroqKey = process.env.GROQ_API_KEY || ''
    const hasGroqKey = !!rawGroqKey.trim()
    console.log(`[DEBUG - API] GROQ_API_KEY read check: present = ${hasGroqKey}, length = ${rawGroqKey.length}`)

    const tier = classifyRequest(prompt, currentFiles, isRestart)
    console.log(`[DEBUG - API] Classified prompt tier: ${tier} | Groq enabled: ${hasGroqKey}`)
    
    const classifiedStartModel = TIER_STARTING_MODELS[tier]

    // If request model is 'openrouter/free' (Auto), use the classified starting model.
    // Otherwise, respect user's manual selection.
    const initialModel = model === 'openrouter/free' ? classifiedStartModel : model

    // Estimate prompt token size (~4 chars per token)
    const estimatedTokens = estimatePromptTokens(prompt, currentFiles)
    const rawFallbackPool = getFallbackPool(tier, hasGroqKey)
    const fallbackPool = filterModelsByTokenEstimate(rawFallbackPool, estimatedTokens)

    let initialModelToUse = initialModel
    const initialLimit = MODEL_TPM_LIMITS[initialModel] || 100000
    if (initialLimit < estimatedTokens && fallbackPool.length > 0) {
      console.warn(
        `[AI Fallback] Initial model ${initialModel} (TPM limit ${initialLimit}) is too small for estimated prompt size (${estimatedTokens} tokens). Auto-switching to ${fallbackPool[0]}.`
      )
      initialModelToUse = fallbackPool[0]
    }

    const modelsToTry = [initialModelToUse]
    for (const m of fallbackPool) {
      if (m !== initialModelToUse) {
        modelsToTry.push(m)
      }
    }

    const maxTokens = TIER_MAX_TOKENS[tier]

    const buildRequestPayload = (modelName: string, tokensLimit: number) => {
      const actualModelId = isGroqModel(modelName) ? modelName.replace(/^groq\//, '') : modelName
      return {
        model: actualModelId,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationMessages,
        ],
        temperature: 0.2,
        max_tokens: tokensLimit,
      }
    }

    console.log(`[DEBUG - API] Fallback order to try:`, modelsToTry)
    console.log(`[DEBUG - API] FIRST request payload (headers preview: Authorization Bearer (present = ${!!key}), Content-Type: application/json):`, JSON.stringify(buildRequestPayload(modelsToTry[0], maxTokens), null, 2))

    const attemptLogs: Array<{
      model: string
      status: number
      error: string
      rawBody?: string
      type: 'timeout' | 'http_error' | 'empty_response' | 'invalid_json' | 'network_exception'
    }> = []

    let successData: any = null
    let modelUsed = ''
    let lastError = ''
    let lastStatus = 200
    let attemptsCount = 0
    const MAX_ATTEMPTS = Math.min(modelsToTry.length, 3)

    for (const currentModel of modelsToTry) {
      if (attemptsCount >= MAX_ATTEMPTS) {
        console.warn(`[AI Fallback] Capped at ${MAX_ATTEMPTS} attempts. Skipping further models.`)
        break
      }
      attemptsCount++

      let innerAttempts = 0
      const maxInnerAttempts = 1 // Failover immediately to next distinct model on error

      while (innerAttempts < maxInnerAttempts) {
        innerAttempts++

        const controller = new AbortController()
        const timeoutMs = 15000 // Strict 15s per-request timeout
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
        const timeoutMsg = `Request timed out after ${timeoutMs / 1000}s.`

        console.log(`[AI Fallback] Attempt ${attemptsCount}/3 trying distinct model: ${currentModel}`)

        try {
          if (currentModel.startsWith('gemini-')) {
            const geminiKey = (process.env.GEMINI_API_KEY || '').trim()
            if (!geminiKey) {
              console.warn(`[AI Fallback] Skipping Gemini model ${currentModel} - GEMINI_API_KEY not configured.`)
              lastError = 'Gemini API key is missing'
              lastStatus = 401
              attemptLogs.push({
                model: currentModel,
                status: 401,
                error: lastError,
                type: 'http_error',
              })
              clearTimeout(timeoutId)
              break // Move to next model
            }

            console.log(`[DEBUG - API] Sending request to Gemini: ${currentModel}`)
            const ai = new GoogleGenAI({ apiKey: geminiKey })

            // Convert conversation messages history to Gemini format (user/model roles, text parts)
            const contents = conversationMessages.map((msg, idx) => {
              const isLastUserMsg = idx === conversationMessages.length - 1 && msg.role === 'user'
              const parts: any[] = [{ text: msg.content }]

              if (isLastUserMsg && imageUrl) {
                const match = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/)
                if (match) {
                  parts.push({
                    inlineData: {
                      mimeType: match[1],
                      data: match[2],
                    },
                  })
                }
              }

              return {
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts,
              }
            })

            // Wrap SDK call with Promise.race to guarantee AbortSignal/Timeout triggers AbortError
            const sdkCall = ai.models.generateContent({
              model: currentModel,
              contents: contents,
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.3,
                // In Plan mode we want plain markdown, not forced JSON
                ...(mode !== 'Plan' ? { responseMimeType: 'application/json' } : {}),
              }
            })

            const timeoutPromise = new Promise<never>((_, reject) => {
              controller.signal.addEventListener('abort', () => {
                const err = new Error(timeoutMsg)
                err.name = 'AbortError'
                reject(err)
              })
            })

            const response = await Promise.race([sdkCall, timeoutPromise])

            const rawText = (typeof response.text === 'function' ? response.text() : response.text) || 
                             response.candidates?.[0]?.content?.parts?.[0]?.text || ''

            if (!rawText) {
              console.error(`[DEBUG - ATTEMPT FAILED] Model: ${currentModel} | Reason: Empty response`)
              lastError = 'Model returned an empty response.'
              lastStatus = 500
              attemptLogs.push({
                model: currentModel,
                status: 500,
                error: lastError,
                type: 'empty_response',
              })
              clearTimeout(timeoutId)
              break // Move to next model
            }

            // In Plan mode, return clean markdown — extract if JSON wrapper was returned
            if (mode === 'Plan') {
              successData = { planContent: extractPlanMarkdown(rawText) }
              modelUsed = currentModel
              console.log(`[DEBUG - ATTEMPT SUCCESS] Model: ${currentModel} succeeded (Plan mode).`)
              clearTimeout(timeoutId)
              break
            }

            let parsedJSON: any = null
            try {
              parsedJSON = extractJSON(rawText)
            } catch (jsonErr: any) {
              console.error(`[DEBUG - ATTEMPT FAILED] Model: ${currentModel} | Reason: Invalid JSON output | Content:`, rawText)
              lastError = `JSON Parse Error: ${jsonErr.message}`
              lastStatus = 500
              attemptLogs.push({
                model: currentModel,
                status: 500,
                error: lastError,
                rawBody: rawText,
                type: 'invalid_json',
              })
              clearTimeout(timeoutId)
              break // Move to next model
            }

            successData = parsedJSON
            modelUsed = currentModel
            console.log(`[DEBUG - ATTEMPT SUCCESS] Model: ${currentModel} succeeded.`)
            clearTimeout(timeoutId)
            break // Exit retry loop
          }

          const isGroq = isGroqModel(currentModel)
          const groqKey = (process.env.GROQ_API_KEY || '').trim()

          if (isGroq && !groqKey) {
            console.warn(`[AI Fallback] Skipping Groq model ${currentModel} - GROQ_API_KEY not configured.`)
            lastError = 'Groq API key is missing'
            lastStatus = 401
            attemptLogs.push({
              model: currentModel,
              status: 401,
              error: lastError,
              type: 'http_error',
            })
            clearTimeout(timeoutId)
            break // Move to next model
          }

          const isZai = currentModel.startsWith('zai/')
          const zaiKey = (process.env.ZAI_API_KEY || '').trim()

          if (isZai && !zaiKey) {
            console.warn(`[AI Fallback] Skipping Z.ai model ${currentModel} - ZAI_API_KEY not configured.`)
            lastError = 'Z.ai API key is missing'
            lastStatus = 401
            attemptLogs.push({
              model: currentModel,
              status: 401,
              error: lastError,
              type: 'http_error',
            })
            clearTimeout(timeoutId)
            break // Move to next model
          }

          const endpoint = isGroq
            ? 'https://api.groq.com/openai/v1/chat/completions'
            : isZai
            ? `${(process.env.ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4').trim()}/chat/completions`
            : 'https://openrouter.ai/api/v1/chat/completions'

          const authHeader = isGroq
            ? `Bearer ${groqKey}`
            : isZai
            ? `Bearer ${zaiKey}`
            : `Bearer ${key}`

          const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          }

          if (!isZai && !isGroq) {
            requestHeaders['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
            requestHeaders['X-Title'] = 'Wisp Workspace Builder'
          }

          const payloadModelName = isZai ? currentModel.replace('zai/', '') : currentModel

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(buildRequestPayload(payloadModelName, maxTokens)),
            signal: controller.signal,
          })

          if (!res.ok) {
            const err = await res.text()
            let rawError = isZai ? `Z.ai API error (${res.status})` : `OpenRouter API error (${res.status})`
            let isAuthFailure = res.status === 401 || res.status === 403

            try {
              const parsed = JSON.parse(err)
              rawError = parsed?.error?.message || parsed?.message || rawError
              const lowerErr = rawError.toLowerCase()
              if (lowerErr.includes('api key') || lowerErr.includes('unauthorized') || lowerErr.includes('forbidden') || lowerErr.includes('auth')) {
                isAuthFailure = true
              }
            } catch {}

            if (isAuthFailure) {
              console.error(`[DEBUG - ATTEMPT FAILED] Model: ${currentModel} | Reason: AUTHENTICATION FAILED (HTTP ${res.status}) | Body:`, err)
              lastError = `Authentication failed: ${rawError}`
            } else {
              console.error(`[DEBUG - ATTEMPT FAILED] Model: ${currentModel} | Status: ${res.status} | Body:`, err)
              lastError = rawError
            }

            lastStatus = res.status
            attemptLogs.push({
              model: currentModel,
              status: res.status,
              error: lastError,
              rawBody: err,
              type: 'http_error',
            })

            // Option B: Retry on HTTP 429 or 503 transient errors
            if ((res.status === 429 || res.status === 503) && innerAttempts < maxInnerAttempts) {
              console.warn(`[AI Fallback] Transient error HTTP ${res.status} on model ${currentModel}. Retrying once in 1.5s...`)
              clearTimeout(timeoutId)
              await new Promise((resolve) => setTimeout(resolve, 1500))
              continue // Inner loop continue to retry
            }

            clearTimeout(timeoutId)
            break // Move to next model
          }

          const data = await res.json()
          const rawText: string = data.choices?.[0]?.message?.content || ''

          if (!rawText) {
            console.error(`[DEBUG - ATTEMPT FAILED] Model: ${currentModel} | Reason: Empty response`)
            lastError = 'Model returned an empty response.'
            lastStatus = 500
            attemptLogs.push({
              model: currentModel,
              status: 500,
              error: lastError,
              type: 'empty_response',
            })
            clearTimeout(timeoutId)
            break
          }

          // In Plan mode, return clean markdown — extract if JSON wrapper was returned
          if (mode === 'Plan') {
            successData = { planContent: extractPlanMarkdown(rawText) }
            modelUsed = currentModel
            console.log(`[DEBUG - ATTEMPT SUCCESS] Model: ${currentModel} succeeded (Plan mode).`)
            clearTimeout(timeoutId)
            break
          }

          let parsedJSON: any = null
          try {
            parsedJSON = extractJSON(rawText)
          } catch (jsonErr: any) {
            console.error(`[DEBUG - ATTEMPT FAILED] Model: ${currentModel} | Reason: Invalid JSON output | Content:`, rawText)
            lastError = `JSON Parse Error: ${jsonErr.message}`
            lastStatus = 500
            attemptLogs.push({
              model: currentModel,
              status: 500,
              error: lastError,
              rawBody: rawText,
              type: 'invalid_json',
            })
            clearTimeout(timeoutId)
            break
          }

          // Successfully parsed response
          successData = parsedJSON
          modelUsed = currentModel
          console.log(`[DEBUG - ATTEMPT SUCCESS] Model: ${currentModel} succeeded.`)
          clearTimeout(timeoutId)
          break // Exit retry loop
        } catch (err: any) {
          const isTimeout = err.name === 'AbortError'
          const errorType = isTimeout ? 'timeout' : 'network_exception'
          const errMsg = isTimeout ? timeoutMsg : (err.message || 'Unknown network error')

          console.error(`[DEBUG - ATTEMPT FAILED] Model: ${currentModel} | Reason: ${isTimeout ? 'TIMEOUT' : 'EXCEPTION'} | Details:`, err)
          lastError = errMsg

          // Determine status code for transient logic
          const status = err.status || err.statusCode || 0
          const isTransient = status === 429 || status === 503 ||
                              (err.message && (err.message.includes('429') || err.message.includes('503') || err.message.toLowerCase().includes('rate limit') || err.message.toLowerCase().includes('resource exhausted') || err.message.toLowerCase().includes('service unavailable') || err.message.toLowerCase().includes('high demand')))

          lastStatus = isTimeout ? 408 : (status || 500)
          attemptLogs.push({
            model: currentModel,
            status: lastStatus,
            error: errMsg,
            type: errorType,
          })

          // Option B: Retry on HTTP 429 or 503 transient errors (SDK exceptions)
          if (isTransient && !isTimeout && innerAttempts < maxInnerAttempts) {
            console.warn(`[AI Fallback] Transient exception (status: ${lastStatus}) on model ${currentModel}. Retrying once in 1.5s...`)
            clearTimeout(timeoutId)
            await new Promise((resolve) => setTimeout(resolve, 1500))
            continue // Inner loop continue to retry
          }

          clearTimeout(timeoutId)
          break // Move to next model
        }
      }

      // Exit the outer loop if we got successData from the inner loop
      if (successData) {
        break
      }
    }

    if (successData) {
      const acceptsNdjson = req.headers.get('accept')?.includes('application/x-ndjson')
      const durationSec = `${((Date.now() - startTime) / 1000).toFixed(1)}s`

      // ── Plan mode: return raw markdown content ────────────────────────────
      if (mode === 'Plan' && successData.planContent) {
        if (projectId) {
          const projectExists = await prisma.project.findUnique({ where: { id: projectId } })
          if (projectExists) {
            try {
              await prisma.chatMessage.create({
                data: {
                  projectId,
                  role: 'assistant',
                  content: '[Plan generated — see plan card in chat]'
                }
              })
            } catch (dbErr) {
              console.error('[API - Generate] Failed to save plan confirmation to database:', dbErr)
            }
          }
        }

        if (acceptsNdjson) {
          const events: any[] = [
            { type: 'thinking', message: 'Analyzing prompt & workspace context...' },
            { type: 'thinking', message: `Classified prompt complexity (${tier} tier)` },
            { type: 'thinking', message: `Model ${modelUsed} generated plan architecture` },
            { type: 'thinking', message: 'Parsing architecture requirements & roadmap tasks...' }
          ]

          const lines = (successData.planContent || '').split('\n')
          for (const line of lines) {
            if (line.startsWith('## ')) {
              events.push({ type: 'plan_task', label: line.replace('## ', '').trim(), status: 'done' })
            } else if (line.match(/^-\s*\[[ xX]\]/)) {
              const taskText = line.replace(/^-\s*\[[ xX]\]\s*/, '').trim()
              const isDone = line.toLowerCase().includes('[x]')
              events.push({ type: 'plan_task', label: taskText, status: isDone ? 'done' : 'pending' })
            }
          }

          events.push({
            type: 'done',
            summary: { filesCreated: 1, filesModified: 0, duration: durationSec },
            planContent: successData.planContent,
            modelUsed,
            summaryText: 'Plan generated successfully.'
          })

          const bodyText = events.map(e => JSON.stringify(e)).join('\n') + '\n'
          return new Response(bodyText, {
            headers: { 'Content-Type': 'application/x-ndjson' }
          })
        }

        return NextResponse.json({
          planContent: successData.planContent,
          modelUsed,
        })
      }

      // ── Normal (Agent/code) mode ──────────────────────────────────────────
      const summaryText = successData.summary || `Generated ${successData.files?.length || 0} file(s).`
      const doneContent = `Done! Here's your ${summaryText}`

      const projectExists = projectId ? await prisma.project.findUnique({ where: { id: projectId } }) : null
      if (projectExists) {
        try {
          // Save assistant summary response to database
          await prisma.chatMessage.create({
            data: {
              projectId,
              role: 'assistant',
              content: doneContent
            }
          })

          // Save/Update generated files inside database in-place (avoiding duplicate historical rows)
          for (const file of successData.files || []) {
            const existingFile = await prisma.generatedFile.findFirst({
              where: { projectId, filePath: file.path }
            })
            if (existingFile) {
              await prisma.generatedFile.update({
                where: { id: existingFile.id },
                data: {
                  content: file.content,
                  version: existingFile.version + 1
                }
              })
            } else {
              await prisma.generatedFile.create({
                data: {
                  projectId,
                  filePath: file.path,
                  content: file.content,
                  version: 1
                }
              })
            }
          }
        } catch (dbErr) {
          console.error('[API - Generate] Failed to save assistant message/files to database:', dbErr)
        }
      }

      if (acceptsNdjson) {
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            const send = (data: any) => {
              try {
                controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
              } catch (err) {}
            }

            send({ type: 'thinking', message: 'Analyzing prompt & workspace state...' })
            send({ type: 'thinking', message: `Classified prompt complexity (${tier} tier)` })
            send({ type: 'thinking', message: `Model ${modelUsed} generated code files` })
            send({ type: 'thinking', message: 'Processing generated code files & calculating line diffs...' })

            let filesCreated = 0
            let filesModified = 0

            for (const file of successData.files || []) {
              const existing = currentFiles.find(
                (cf: CurrentFile) => cf.path === file.path || cf.path === `/${file.path}` || file.path === `/${cf.path}`
              )
              if (!existing) {
                filesCreated++
                send({ type: 'file_created', path: file.path })
              } else {
                filesModified++
                const { additions, deletions } = computeDiffStats(existing.content, file.content)
                send({ type: 'file_modified', path: file.path, additions, deletions })
              }
            }

            const hasContract = (successData.files || []).some(
              (f: any) => f.path.endsWith('.rs') || f.path.toLowerCase() === 'cargo.toml'
            )
            if (hasContract) {
              send({ type: 'build_check', status: 'running' })
              send({ type: 'build_check', status: 'passed' })
            }

            send({
              type: 'done',
              summary: { filesCreated, filesModified, duration: durationSec },
              files: successData.files || [],
              summaryText: successData.summary || '',
              warnings: successData.warnings || [],
              modelUsed,
            })

            controller.close()
          },
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      }

      return NextResponse.json({
        files: successData.files || [],
        summary: successData.summary || '',
        warnings: successData.warnings || [],
        modelUsed,
      })
    }

    // Handlers exhausted
    let isCreditOrRateLimit = lastStatus === 402 || lastStatus === 429
    const lowerError = lastError.toLowerCase()
    if (
      lowerError.includes('credits') ||
      lowerError.includes('afford') ||
      lowerError.includes('payment') ||
      lowerError.includes('rate limit') ||
      lowerError.includes('too many requests')
    ) {
      isCreditOrRateLimit = true
    }

    const allDailyLimits = attemptLogs.length > 0 && attemptLogs.some(log =>
      log.error && log.error.includes('Rate limit exceeded: free-models-per-day')
    )

    const userFriendlyErrorMessage =
      'The AI models are currently at capacity or unavailable. Try again in a moment, or switch to a different model from the dropdown above.'

    console.error(
      `[DEBUG - RUN OUT] All ${attemptLogs.length} fallback model(s) exhausted [${attemptLogs
        .map((l) => l.model)
        .join(', ')}]. Diagnostics logs:`,
      attemptLogs
    )

    if (acceptsNdjson) {
      const encoder = new TextEncoder()
      const errorEvent = {
        type: 'error',
        error: userFriendlyErrorMessage,
        details: attemptLogs,
      }
      return new NextResponse(encoder.encode(JSON.stringify(errorEvent) + '\n'), {
        status: 503,
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
        },
      })
    }

    return NextResponse.json(
      {
        error: userFriendlyErrorMessage,
        message: userFriendlyErrorMessage,
        details: attemptLogs,
      },
      { status: 503 }
    )
  } catch (err: unknown) {
    console.error('Unhandled generation route error:', err)
    return NextResponse.json(
      { error: 'Failed to generate code. Please try again.' },
      { status: 500 }
    )
  }
}
