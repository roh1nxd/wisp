import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import prisma from '@/lib/db/prisma'

const execAsync = promisify(exec)

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { projectId } = body

    const projectRoot = process.cwd()
    const contractPath = path.join(projectRoot, 'escrow-app', 'contract')

    // Check if contract exists
    if (!fs.existsSync(contractPath)) {
      return NextResponse.json({ error: 'Escrow contract folder not found in workspace' }, { status: 404 })
    }

    // 1. Run the test suite first (cargo test)
    try {
      await execAsync('cargo test', { cwd: contractPath })
    } catch (testErr: any) {
      return NextResponse.json({
        error: `Test suite failed. Deployment blocked.\n\n${testErr.stderr || testErr.stdout || testErr.message}`
      }, { status: 400 })
    }

    // 2. Build the contract (stellar contract build or cargo build wasm)
    try {
      await execAsync('stellar contract build', { cwd: contractPath })
    } catch (buildErr: any) {
      // Fallback to cargo build if stellar CLI build is not configured
      try {
        await execAsync('cargo build --target wasm32-unknown-unknown --release', { cwd: contractPath })
      } catch (cargoErr: any) {
        return NextResponse.json({
          error: `Contract compilation failed.\n\n${cargoErr.stderr || cargoErr.stdout || cargoErr.message}`
        }, { status: 400 })
      }
    }

    // 3. Check that the compiled WASM exists
    // The modern CLI build compiles to target/wasm32-unknown-unknown/release/soroban_escrow_contract.wasm
    const wasmPath = path.join(
      contractPath,
      'target',
      'wasm32-unknown-unknown',
      'release',
      'soroban_escrow_contract.wasm'
    )
    if (!fs.existsSync(wasmPath)) {
      return NextResponse.json({ error: `Compiled WASM not found at ${wasmPath}` }, { status: 500 })
    }

    // 4. Generate and fund a temporary testnet deployer key
    const deployerAlias = `dep_${Date.now()}`
    try {
      await execAsync(`stellar keys generate ${deployerAlias} --network testnet --fund`)
    } catch (keyErr: any) {
      return NextResponse.json({
        error: `Failed to generate or fund deployer key.\n\n${keyErr.stderr || keyErr.stdout || keyErr.message}`
      }, { status: 500 })
    }

    // 5. Deploy the contract to testnet
    let contractId = ''
    try {
      const { stdout } = await execAsync(
        `stellar contract deploy --wasm "${wasmPath}" --source-account ${deployerAlias} --network testnet`
      )
      contractId = stdout.trim()
    } catch (deployErr: any) {
      return NextResponse.json({
        error: `Stellar CLI deployment failed.\n\n${deployErr.stderr || deployErr.stdout || deployErr.message}`
      }, { status: 500 })
    }

    if (projectId) {
      try {
        await prisma.project.update({
          where: { id: projectId },
          data: {
            status: 'deployed',
            network: 'testnet',
            contractId: contractId
          }
        })
      } catch (dbErr) {
        console.error('[API - Deploy] Failed to update project status in database:', dbErr)
      }
    }

    return NextResponse.json({ contractId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error during deployment' }, { status: 500 })
  }
}
