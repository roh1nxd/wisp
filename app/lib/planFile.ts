/**
 * app/lib/planFile.ts
 *
 * Server-side helpers for persisting plan markdown files to disk.
 * Plans are stored at: .wisp-plans/{projectId}/{timestamp}-plan.md
 *
 * Only import this module from server-side code (API routes, Server Components).
 * Never import in 'use client' files — use /api/plan instead.
 */

import fs from 'fs'
import path from 'path'

const PLANS_ROOT = path.join(process.cwd(), '.wisp-plans')

/**
 * Ensures the directory for a project exists, creating it recursively if needed.
 */
function ensureProjectDir(projectId: string): string {
  const dir = path.join(PLANS_ROOT, projectId)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * Writes plan markdown content to disk.
 * Returns a stable { id, path } that the client can store as a reference.
 */
export function savePlan(
  projectId: string,
  content: string
): { id: string; path: string } {
  const dir = ensureProjectDir(projectId)
  const timestamp = Date.now()
  const filename = `${timestamp}-plan.md`
  const filePath = path.join(dir, filename)
  fs.writeFileSync(filePath, content, 'utf8')

  // id is the relative path from PLANS_ROOT — portable and collision-free
  const relativePath = path.join(projectId, filename)
  return { id: relativePath, path: filePath }
}

/**
 * Reads plan content from an absolute file path.
 */
export function getPlan(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Plan file not found: ${filePath}`)
  }
  return fs.readFileSync(filePath, 'utf8')
}

/**
 * Overwrites an existing plan file with new content.
 */
export function updatePlan(filePath: string, content: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Plan file not found: ${filePath}`)
  }
  fs.writeFileSync(filePath, content, 'utf8')
}
