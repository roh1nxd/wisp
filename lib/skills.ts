import fs from 'fs'
import path from 'path'

export interface Skill {
  name: string
  slug: string
  description: string
  triggers: string[]
  body: string
  rawMarkdown: string
  conflicts?: string[]
  category?: string
}

// Fallback in-memory demo skills
export const DEMO_SKILLS: Skill[] = [
  {
    name: 'Concise Writer',
    slug: 'example-concise-writer',
    description: 'Keeps responses short, direct, and under 100 words without unnecessary fluff.',
    triggers: ['short', 'brief', 'concise'],
    conflicts: ['example-code-comments'],
    category: 'Communication',
    body: 'Keep your output under 100 words. Be direct, clear, and omit conversational filler or pleasantries.',
    rawMarkdown: `---\nname: Concise Writer\nslug: example-concise-writer\ndescription: Keeps responses short, direct, and under 100 words without unnecessary fluff.\ntriggers: short, brief, concise\nconflicts: example-code-comments\ncategory: Communication\n---\n# Concise Writer Instruction\n\nKeep your output under 100 words. Be direct, clear, and omit conversational filler or pleasantries.`
  },
  {
    name: 'Code Documenter',
    slug: 'example-code-comments',
    description: 'Adds clear one-line doc comments above every function explaining its purpose.',
    triggers: ['comment', 'document code', 'docstring'],
    conflicts: ['example-concise-writer'],
    category: 'Code Quality',
    body: 'Add a clear, single-line doc comment directly above every function or method explaining its purpose and return behavior.',
    rawMarkdown: `---\nname: Code Documenter\nslug: example-code-comments\ndescription: Adds clear one-line doc comments above every function explaining its purpose.\ntriggers: comment, document code, docstring\nconflicts: example-concise-writer\ncategory: Code Quality\n---\n# Code Documenter Instruction\n\nAdd a clear, single-line doc comment directly above every function or method explaining its purpose and return behavior.`
  },
  {
    name: 'Bug Reporter',
    slug: 'example-bug-report',
    description: 'Formats issue analysis cleanly into Root Cause, Reproduction Steps, and Proposed Fix.',
    triggers: ['bug', 'report', 'issue', 'repro'],
    conflicts: [],
    category: 'Code Quality',
    body: 'Format your findings strictly into these three section headers:\n1. **Root Cause**\n2. **Steps to Reproduce**\n3. **Proposed Fix**',
    rawMarkdown: `---\nname: Bug Reporter\nslug: example-bug-report\ndescription: Formats issue analysis cleanly into Root Cause, Reproduction Steps, and Proposed Fix.\ntriggers: bug, report, issue, repro\ncategory: Code Quality\n---\n# Bug Reporter Instruction\n\nFormat your findings strictly into these three section headers:\n1. **Root Cause**\n2. **Steps to Reproduce**\n3. **Proposed Fix**`
  }
]

export function parseSkillMarkdown(content: string, fallbackSlug: string = ''): Skill {
  const match = content.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/)
  if (!match) {
    return {
      name: fallbackSlug || 'Skill',
      slug: fallbackSlug,
      description: 'Custom instruction skill',
      triggers: [],
      conflicts: [],
      category: 'Code Quality',
      body: content.trim(),
      rawMarkdown: content
    }
  }

  const frontmatterStr = match[1]
  const body = match[2].trim()

  const meta: Record<string, string> = {}
  frontmatterStr.split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(':')
    if (idx !== -1) {
      const key = line.slice(0, idx).trim()
      const val = line.slice(idx + 1).trim()
      meta[key] = val
    }
  })

  const triggersStr = meta.triggers || ''
  const triggers = triggersStr.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)

  const conflictsStr = meta.conflicts || ''
  const conflicts = conflictsStr.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)

  const category = meta.category ? meta.category.trim() : 'Code Quality'

  return {
    name: meta.name || fallbackSlug,
    slug: meta.slug || fallbackSlug,
    description: meta.description || '',
    triggers,
    conflicts,
    category,
    body,
    rawMarkdown: content
  }
}

export function listSkills(): Skill[] {
  try {
    const skillsDir = path.join(process.cwd(), 'skills')
    if (!fs.existsSync(skillsDir)) return DEMO_SKILLS

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
    const skills: Skill[] = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const filePath = path.join(skillsDir, entry.name, 'SKILL.md')
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8')
          skills.push(parseSkillMarkdown(content, entry.name))
        }
      }
    }

    return skills.length > 0 ? skills : DEMO_SKILLS
  } catch (err) {
    return DEMO_SKILLS
  }
}

export function getSkill(slug: string): Skill | undefined {
  const cleanSlug = slug.replace(/^\//, '')
  const skills = listSkills()
  return skills.find((s) => s.slug === cleanSlug)
}

export function matchSkillsByPrompt(prompt: string): Skill[] {
  if (!prompt) return []
  const lowerPrompt = prompt.toLowerCase()
  const skills = listSkills()

  return skills.filter((skill) =>
    skill.triggers.some((trigger) => trigger.length > 0 && lowerPrompt.includes(trigger))
  )
}
