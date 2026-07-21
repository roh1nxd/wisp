'use client'

import { WebContainer, FileSystemTree, WebContainerProcess } from '@webcontainer/api'
import { FileItem } from '@/components/CodeEditor/FileExplorer'

let containerInstancePromise: Promise<WebContainer> | null = null
let containerInstance: WebContainer | null = null

/**
 * Get or boot the singleton WebContainer instance.
 */
export async function getWebContainer(): Promise<WebContainer | null> {
  if (typeof window === 'undefined') return null
  if (containerInstance) return containerInstance

  if (!containerInstancePromise) {
    containerInstancePromise = (async () => {
      try {
        const instance = await WebContainer.boot()
        containerInstance = instance
        return instance
      } catch (err) {
        console.warn('[WebContainer] Boot failed or cross-origin isolation missing:', err)
        containerInstancePromise = null
        return null
      }
    })()
  }

  return containerInstancePromise
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
 * Synchronize a single file edit to the running WebContainer file system.
 */
export async function syncFileToWebContainer(filePath: string, content: string): Promise<void> {
  const instance = await getWebContainer()
  if (!instance) return

  try {
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`
    // Ensure parent directory exists
    const parts = cleanPath.split('/').filter(Boolean)
    if (parts.length > 1) {
      const dirPath = '/' + parts.slice(0, -1).join('/')
      await instance.fs.mkdir(dirPath, { recursive: true }).catch(() => {})
    }
    await instance.fs.writeFile(cleanPath, content)
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
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`
    await instance.fs.rm(cleanPath, { recursive: true }).catch(() => {})
  } catch (err) {
    console.warn('[WebContainer] File deletion failed for:', filePath, err)
  }
}

/**
 * Detect if project files indicate a Node.js-based framework or application.
 */
export function isNodeFrameworkProject(files: FileItem[]): {
  isNode: boolean
  framework: 'react' | 'next' | 'vue' | 'express' | 'node' | 'none'
} {
  const flatPaths: string[] = []
  let hasPackageJson = false
  let packageJsonContent = ''

  const traverse = (items: FileItem[], path = '') => {
    for (const item of items) {
      const current = path ? `${path}/${item.name}` : item.name
      if (item.type === 'file') {
        flatPaths.push(current)
        if (item.name === 'package.json') {
          hasPackageJson = true
          packageJsonContent = item.content || ''
        }
      } else if (item.children) {
        traverse(item.children, current)
      }
    }
  }
  traverse(files)

  if (!hasPackageJson && !flatPaths.some(p => p.endsWith('.jsx') || p.endsWith('.tsx') || p.endsWith('.vue'))) {
    return { isNode: false, framework: 'none' }
  }

  if (packageJsonContent.includes('"next"')) return { isNode: true, framework: 'next' }
  if (packageJsonContent.includes('"vue"') || flatPaths.some(p => p.endsWith('.vue'))) return { isNode: true, framework: 'vue' }
  if (packageJsonContent.includes('"express"')) return { isNode: true, framework: 'express' }
  if (packageJsonContent.includes('"react"') || flatPaths.some(p => p.endsWith('.jsx') || p.endsWith('.tsx'))) return { isNode: true, framework: 'react' }

  return { isNode: hasPackageJson, framework: hasPackageJson ? 'node' : 'none' }
}
