/**
 * app/api/build-contract/route.ts
 *
 * Accepts a set of project files (Cargo.toml + src/lib.rs), writes them to a
 * temporary directory, runs `cargo build` and `cargo test`, then returns the
 * real output — no simulated output ever.
 *
 * IMPORTANT: This requires the Rust toolchain + wasm32-unknown-unknown target
 * to be installed on the host machine. On Vercel serverless it will fail gracefully
 * with a clear error message. This is expected — contract compilation requires
 * a persistent server environment (Phase 3 infrastructure).
 *
 * Local dev: works if `cargo` and `rustup target add wasm32-unknown-unknown` are installed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import os from 'os'

const execAsync = promisify(exec)

interface InputFile {
  path: string
  content: string
}

export async function POST(req: NextRequest) {
  let tmpDir: string | null = null

  try {
    const body = await req.json()
    const { files } = body as { files: InputFile[] }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided for build.' }, { status: 400 })
    }

    // Validate: must include Cargo.toml and at least one .rs file
    const hasCargoToml = files.some(
      (f) => f.path.toLowerCase() === 'cargo.toml' || f.path.toLowerCase().endsWith('/cargo.toml')
    )
    const hasRustFile = files.some((f) => f.path.endsWith('.rs'))

    if (!hasCargoToml) {
      return NextResponse.json({
        error: 'Cannot build: Cargo.toml is missing from the project files. Add a valid Cargo.toml before building.'
      }, { status: 400 })
    }
    if (!hasRustFile) {
      return NextResponse.json({
        error: 'Cannot build: No .rs source files found. Add src/lib.rs before building.'
      }, { status: 400 })
    }

    // Check if cargo is available on this machine
    try {
      await execAsync('cargo --version', { timeout: 5000 })
    } catch {
      return NextResponse.json({
        error: [
          'Rust toolchain (cargo) is not installed on this server.',
          'To build Soroban contracts locally, install Rust: https://rustup.rs/',
          'Then add the WASM target: rustup target add wasm32-unknown-unknown',
          '',
          'Note: This feature requires a persistent server environment.',
          'Cloud compilation support will be added in Phase 3 (dedicated build service).'
        ].join('\n')
      }, { status: 503 })
    }

    // Write files to a temp directory
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wisp-contract-'))

    for (const file of files) {
      // Normalize path separators and strip any leading ./
      const normalizedPath = file.path.replace(/\\/g, '/').replace(/^\.\//, '')
      const fullPath = path.join(tmpDir, normalizedPath)
      const dir = path.dirname(fullPath)

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(fullPath, file.content, 'utf8')
    }

    // Run cargo build
    let buildOutput = ''
    let buildFailed = false
    try {
      const { stdout, stderr } = await execAsync(
        'cargo build --target wasm32-unknown-unknown --release 2>&1',
        {
          cwd: tmpDir,
          timeout: 120_000, // 2-minute timeout
          env: { ...process.env, CARGO_TERM_COLOR: 'never' },
        }
      )
      buildOutput = (stdout + stderr).trim()
    } catch (err: any) {
      buildOutput = (err.stdout || '') + (err.stderr || '') + (err.message || '')
      buildOutput = buildOutput.trim()
      buildFailed = true
    }

    if (buildFailed) {
      return NextResponse.json(
        { error: `Build failed:\n\n${buildOutput}` },
        { status: 400 }
      )
    }

    // Run cargo test if tests exist (non-blocking — build success is sufficient)
    let testOutput = ''
    try {
      const { stdout, stderr } = await execAsync(
        'cargo test 2>&1',
        {
          cwd: tmpDir,
          timeout: 60_000, // 1-minute timeout for tests
          env: { ...process.env, CARGO_TERM_COLOR: 'never' },
        }
      )
      testOutput = (stdout + stderr).trim()
    } catch (err: any) {
      // Test failures are reported but don't fail the whole response
      testOutput = ((err.stdout || '') + (err.stderr || '')).trim()
      if (!testOutput) testOutput = 'cargo test failed: ' + (err.message || 'unknown error')
    }

    return NextResponse.json({
      buildOutput,
      testOutput: testOutput || null,
      success: true,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: `Server error during build: ${err.message || err}` },
      { status: 500 }
    )
  } finally {
    // Clean up temp directory
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
