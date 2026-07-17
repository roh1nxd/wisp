import { NextRequest, NextResponse } from 'next/server'

// Wandbox compiler map — these are verified compiler IDs from wandbox.org/api/list.json
// Wandbox is a free, public, no-auth-required multi-language execution service
const WANDBOX_COMPILER_MAP: Record<string, string> = {
  python: 'cpython-3.12.0',
  python3: 'cpython-3.12.0',
  javascript: 'nodejs-20.11.0',
  js: 'nodejs-20.11.0',
  node: 'nodejs-20.11.0',
  typescript: 'typescript-5.3.3',
  ts: 'typescript-5.3.3',
  go: 'go-1.22.0',
  rust: 'rust-1.76.0',
  c: 'gcc-13.2.0',
  cpp: 'gcc-13.2.0',
  'c++': 'gcc-13.2.0',
  ruby: 'ruby-3.3.0',
  java: 'openjdk-head',
  kotlin: 'kotlin-1.9.22',
  swift: 'swift-5.9.2',
  bash: 'bash',
  sh: 'bash',
  lua: 'lua-5.4.6',
  perl: 'perl-5.38.2',
  php: 'php-8.3.1',
  r: 'r-4.3.2',
  scala: 'scala-3.3.1',
  haskell: 'ghc-9.8.1',
  elixir: 'elixir-1.16.0',
  erlang: 'erlang-26.2.1',
  nim: 'nim-2.0.2',
  crystal: 'crystal-1.10.1',
  d: 'dmd-2.106.1',
  fsharp: 'fsharp-8.0',
  'f#': 'fsharp-8.0',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { language, files } = body

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const rawLang = (language || 'javascript').toLowerCase().trim()
    const compiler = WANDBOX_COMPILER_MAP[rawLang]

    if (!compiler) {
      return NextResponse.json(
        { error: `Language "${rawLang}" is not supported. Supported: ${Object.keys(WANDBOX_COMPILER_MAP).join(', ')}` },
        { status: 400 }
      )
    }

    // Use first file as main source; join additional files as separate Wandbox "codes" items
    const primaryFile = files[0]
    const additionalFiles = files.slice(1).map((f: { name: string; content: string }) => ({
      file: f.name,
      code: f.content || '',
    }))

    const wandboxPayload: Record<string, unknown> = {
      compiler,
      code: primaryFile.content || '',
      'save': false,
    }

    if (additionalFiles.length > 0) {
      wandboxPayload['codes'] = additionalFiles
    }

    const wandboxResponse = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(wandboxPayload),
      signal: AbortSignal.timeout(30_000), // 30s timeout
    })

    if (!wandboxResponse.ok) {
      const errorText = await wandboxResponse.text()
      return NextResponse.json(
        { error: `Execution service error (${wandboxResponse.status}): ${errorText.slice(0, 300)}` },
        { status: 502 }
      )
    }

    const result = await wandboxResponse.json()

    // Wandbox response shape:
    // { status, compiler_output, compiler_error, program_output, program_error }
    const compilerOutput = [result.compiler_output, result.compiler_error]
      .filter(Boolean)
      .join('\n')
      .trim()

    const programOutput = (result.program_output || '').trim()
    const programError = (result.program_error || '').trim()
    const exitCode = parseInt(result.status ?? '0', 10)

    return NextResponse.json({
      compile: compilerOutput
        ? { output: compilerOutput, code: exitCode !== 0 ? exitCode : 0 }
        : null,
      run: {
        stdout: programOutput,
        stderr: programError,
        code: exitCode,
      },
    })
  } catch (error: any) {
    if (error?.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Execution timed out after 30 seconds.' }, { status: 504 })
    }
    return NextResponse.json({ error: error.message || 'Server execution error' }, { status: 500 })
  }
}
