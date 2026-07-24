'use client'

import { WebContainer, FileSystemTree, WebContainerProcess } from '@webcontainer/api'
import { FileItem } from '@/components/CodeEditor/FileExplorer'

let containerInstancePromise: Promise<WebContainer | null> | null = null
let containerInstance: WebContainer | null = null

/**
 * Get or boot the singleton WebContainer instance.
 * Guarantees WebContainer.boot() is called EXACTLY ONCE per page load lifetime.
 */
export async function getWebContainer(): Promise<WebContainer | null> {
  if (typeof window === 'undefined') return null

  // 1. Return existing booted instance if available
  if (containerInstance) return containerInstance

  // 2. Return in-flight boot promise if already initiated
  if (containerInstancePromise) return containerInstancePromise

  // 3. Initiate boot Promise IMMEDIATELY and store in containerInstancePromise before awaiting
  console.log('[DEBUG-BOOT] Initializing singleton WebContainer.boot() instance (this must fire EXACTLY ONCE per page load)...')

  containerInstancePromise = (async () => {
    try {
      const instance = await WebContainer.boot()
      containerInstance = instance
      console.log('[DEBUG-BOOT] SUCCESS: WebContainer booted cleanly and stored as singleton.')
      return instance
    } catch (err: any) {
      console.warn('[DEBUG-BOOT] WebContainer.boot() notice:', err?.message || err)
      if (containerInstance) return containerInstance
      return null
    }
  })()

  return containerInstancePromise
}

/**
 * Teardown WebContainer instance if explicit reset is requested.
 */
export async function teardownWebContainer(): Promise<void> {
  if (containerInstance) {
    try {
      await containerInstance.teardown()
    } catch (err) {
      console.warn('[WebContainer] Teardown notice:', err)
    }
    containerInstance = null
  }
  containerInstancePromise = null
}

/**
 * Normalizes any relative or absolute user input path against currentCwd.
 * Guarantees root confinement (prevents escaping project root via ../..).
 * Returns single canonical path format (relative to root without leading slash).
 */
export function normalizeWorkspacePath(currentCwd: string, inputTarget: string = ''): { cwd: string; canonicalPath: string } {
  const trimmedTarget = inputTarget ? inputTarget.trim() : ''

  if (trimmedTarget === '~' || trimmedTarget === '/') {
    return { cwd: '~', canonicalPath: '' }
  }

  const currentParts = (currentCwd === '~' || !currentCwd) ? [] : currentCwd.split('/').filter(Boolean)
  const targetParts = trimmedTarget ? trimmedTarget.split('/').filter(Boolean) : []

  const resolvedParts: string[] = trimmedTarget.startsWith('/') ? [] : [...currentParts]

  for (const part of targetParts) {
    if (part === '.') continue
    if (part === '..') {
      // Root Confinement Guard (chroot jail): Cannot pop past root
      if (resolvedParts.length > 0) {
        resolvedParts.pop()
      }
    } else {
      resolvedParts.push(part)
    }
  }

  const cwd = resolvedParts.length === 0 ? '~' : resolvedParts.join('/')
  const canonicalPath = resolvedParts.join('/')

  return { cwd, canonicalPath }
}

/**
 * Convert Wisp FileItem[] tree to WebContainer FileSystemTree format.
 */
export function convertToFileSystemTree(files: FileItem[]): FileSystemTree {
  const tree: FileSystemTree = {}

  for (const item of files) {
    // Hide node_modules, .git, and dist folders from virtual FS mount if redundant
    if (item.name === 'node_modules' || item.name === '.git' || item.name === '.next' || item.name === 'dist') {
      continue
    }

    if (item.type === 'file') {
      tree[item.name] = {
        file: {
          contents: item.content || '',
        },
      }
    } else if (item.type === 'folder' && item.children) {
      tree[item.name] = {
        directory: convertToFileSystemTree(item.children),
      }
    }
  }

  return tree
}

/**
 * Mount workspace files into WebContainer.
 */
export async function mountWebContainerFiles(files: FileItem[]): Promise<boolean> {
  const instance = await getWebContainer()
  if (!instance) return false

  try {
    const tree = convertToFileSystemTree(files)
    await instance.mount(tree)
    return true
  } catch (err) {
    console.error('[WebContainer] Mount error:', err)
    return false
  }
}

/**
 * Clear all workspace files from WebContainer virtual filesystem.
 */
export async function clearWebContainerFiles(): Promise<void> {
  const instance = await getWebContainer()
  if (!instance) return

  try {
    const entries = await instance.fs.readdir('/', { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        await instance.fs.rm(`/${entry.name}`, { recursive: true }).catch(() => {})
      }
    }
  } catch (err) {
    console.warn('[WebContainer] Clear FS error:', err)
  }
}

/**
 * Synchronize a single file edit to the running WebContainer file system.
 */
export async function syncFileToWebContainer(filePath: string, content: string): Promise<void> {
  const instance = await getWebContainer()
  if (!instance) return

  try {
    const { canonicalPath } = normalizeWorkspacePath('~', filePath)
    if (!canonicalPath) return
    const parts = canonicalPath.split('/')
    if (parts.length > 1) {
      const parentDir = parts.slice(0, -1).join('/')
      await instance.fs.mkdir(parentDir, { recursive: true }).catch(() => {})
    }
    await instance.fs.writeFile(canonicalPath, content)
  } catch (err) {
    console.warn('[WebContainer] File sync failed for:', filePath, err)
  }
}

/**
 * Delete a file or directory in WebContainer file system.
 */
export async function deleteFileFromWebContainer(filePath: string): Promise<void> {
  const instance = await getWebContainer()
  if (!instance) return

  try {
    const { canonicalPath } = normalizeWorkspacePath('~', filePath)
    if (!canonicalPath) return
    await instance.fs.rm(canonicalPath, { recursive: true }).catch(() => {})
  } catch (err) {
    console.warn('[WebContainer] File deletion failed for:', filePath, err)
  }
}

/**
 * Rename a file or directory in WebContainer.
 */
export async function renameInWebContainer(oldPath: string, newPath: string): Promise<boolean> {
  const instance = await getWebContainer()
  if (!instance) return false

  try {
    const { canonicalPath: cleanOld } = normalizeWorkspacePath('~', oldPath)
    const { canonicalPath: cleanNew } = normalizeWorkspacePath('~', newPath)
    if (!cleanOld || !cleanNew) return false

    const parts = cleanNew.split('/')
    if (parts.length > 1) {
      const parentDir = parts.slice(0, -1).join('/')
      await instance.fs.mkdir(parentDir, { recursive: true }).catch(() => {})
    }

    await instance.fs.rename(cleanOld, cleanNew)
    return true
  } catch (err) {
    console.warn('[WebContainer] File rename failed:', oldPath, newPath, err)
    return false
  }
}

/**
 * Create a folder in WebContainer.
 */
export async function createFolderInWebContainer(folderPath: string): Promise<boolean> {
  const instance = await getWebContainer()
  if (!instance) return false

  try {
    const { canonicalPath } = normalizeWorkspacePath('~', folderPath)
    if (!canonicalPath) return true
    await instance.fs.mkdir(canonicalPath, { recursive: true })
    return true
  } catch (err) {
    console.warn('[WebContainer] Folder creation failed:', folderPath, err)
    return false
  }
}

/**
 * Checks whether a path exists in WebContainer's virtual filesystem
 * and verifies whether it is a directory or file using fs.readdir.
 */
export async function checkWebContainerPathExists(
  targetCwd: string,
  targetName: string
): Promise<{ exists: boolean; isDirectory: boolean }> {
  const instance = await getWebContainer()
  if (!instance) return { exists: false, isDirectory: false }

  try {
    const { canonicalPath: parentPath } = normalizeWorkspacePath('~', targetCwd)
    const scanDir = parentPath || '.'
    const entries = await instance.fs.readdir(scanDir, { withFileTypes: true })
    const matched = entries.find((e) => e.name.toLowerCase() === targetName.toLowerCase())

    if (matched) {
      return {
        exists: true,
        isDirectory: matched.isDirectory(),
      }
    }
    return { exists: false, isDirectory: false }
  } catch (err) {
    return { exists: false, isDirectory: false }
  }
}

/**
 * Recursively read live WebContainer filesystem tree into Wisp FileItem[] array.
 */
export async function readWebContainerFsTree(dirPath = ''): Promise<FileItem[]> {
  const instance = await getWebContainer()
  if (!instance) return []

  try {
    const cleanDir = dirPath ? (dirPath.startsWith('/') ? dirPath : `/${dirPath}`) : '/'
    const entries = await instance.fs.readdir(cleanDir, { withFileTypes: true })
    
    const items: FileItem[] = []

    for (const entry of entries) {
      const name = entry.name
      if (name === 'node_modules' || name === '.git' || name === '.next' || name === 'dist') {
        continue
      }

      const itemPath = cleanDir === '/' ? name : `${cleanDir.slice(1)}/${name}`

      if (entry.isDirectory()) {
        const children = await readWebContainerFsTree(itemPath)
        items.push({
          id: itemPath,
          name,
          type: 'folder',
          children,
        })
      } else if (entry.isFile()) {
        let content = ''
        try {
          content = await instance.fs.readFile(`/${itemPath}`, 'utf-8')
          content = content.replace(/\u0000/g, '')
        } catch {
          content = ''
        }
        
        const ext = name.split('.').pop()?.toLowerCase() || ''
        let language = 'plaintext'
        if (ext === 'js' || ext === 'jsx') language = 'javascript'
        else if (ext === 'ts' || ext === 'tsx') language = 'typescript'
        else if (ext === 'html') language = 'html'
        else if (ext === 'css') language = 'css'
        else if (ext === 'json') language = 'json'
        else if (ext === 'md' || ext === 'txt') language = 'markdown'

        items.push({
          id: itemPath,
          name,
          type: 'file',
          language,
          content,
        })
      }
    }

    return items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  } catch (err) {
    console.warn('[WebContainer] Read FS tree failed:', err)
    return []
  }
}

/**
 * Detect if project files indicate a Node.js-based framework or application.
 */
export function isNodeFrameworkProject(files: FileItem[]): {
  isNode: boolean
  framework: 'react' | 'next' | 'vue' | 'express' | 'node' | 'none'
} {
  if (!Array.isArray(files) || files.length === 0) {
    return { isNode: false, framework: 'none' }
  }

  const flatPaths: string[] = []
  let hasPackageJson = false
  let rawContentStr = ''

  const traverse = (items: FileItem[], path = '') => {
    if (!Array.isArray(items)) return
    for (const item of items) {
      if (!item) continue
      const current = path ? `${path}/${item.name}` : item.name
      if (item.type === 'file') {
        flatPaths.push(current)
        if (item.name.toLowerCase() === 'package.json') {
          hasPackageJson = true
          const content = item.content
          if (typeof content === 'string') {
            rawContentStr += '\n' + content
          } else if (content && typeof content === 'object') {
            try {
              rawContentStr += '\n' + JSON.stringify(content)
            } catch {
              // ignore stringify failure
            }
          } else if (content !== undefined && content !== null) {
            rawContentStr += '\n' + String(content)
          }
        }
      } else if (item.children) {
        traverse(item.children, current)
      }
    }
  }
  traverse(files)

  const hasViteConfig = flatPaths.some((p) => p.includes('vite.config'))
  const hasReactFiles = flatPaths.some((p) => p.endsWith('.jsx') || p.endsWith('.tsx'))
  const hasVueFiles = flatPaths.some((p) => p.endsWith('.vue'))

  if (!hasPackageJson && !hasReactFiles && !hasVueFiles && !hasViteConfig) {
    return { isNode: false, framework: 'none' }
  }

  const lowerStr = rawContentStr.toLowerCase()

  if (lowerStr.includes('"next"')) return { isNode: true, framework: 'next' }
  if (lowerStr.includes('"vue"') || hasVueFiles) return { isNode: true, framework: 'vue' }
  if (lowerStr.includes('"express"')) return { isNode: true, framework: 'express' }
  if (lowerStr.includes('"react"') || lowerStr.includes('"react-dom"') || hasReactFiles || hasViteConfig) {
    return { isNode: true, framework: 'react' }
  }

  return { isNode: hasPackageJson || hasReactFiles || hasViteConfig, framework: hasPackageJson ? 'node' : 'none' }
}
