const WIKI_API = 'https://runescape.wiki/api.php'
const WIKI_BASE = 'https://runescape.wiki/w/'

interface WikiSection {
  index: string
  line: string
  anchor: string
  toclevel?: number
}

interface WikiParseResponse {
  parse?: {
    title: string
    sections?: WikiSection[]
    wikitext?: { '*': string }
    properties?: Array<{ name: string; '*': string }>
  }
  error?: { info: string }
}

export function questWikiUrl(title: string): string {
  return `${WIKI_BASE}${encodeURIComponent(title.replace(/ /g, '_'))}`
}

export async function fetchQuestSections(title: string): Promise<WikiSection[]> {
  const params = new URLSearchParams({
    action: 'parse',
    page: title,
    prop: 'sections',
    format: 'json',
    origin: '*'
  })

  const response = await fetch(`${WIKI_API}?${params}`)
  const data = (await response.json()) as WikiParseResponse

  if (data.error) {
    throw new Error(data.error.info)
  }

  return data.parse?.sections ?? []
}

export async function fetchQuestDescription(title: string): Promise<string | undefined> {
  const params = new URLSearchParams({
    action: 'parse',
    page: title,
    prop: 'properties',
    format: 'json',
    origin: '*'
  })

  const response = await fetch(`${WIKI_API}?${params}`)
  const data = (await response.json()) as WikiParseResponse
  const description = data.parse?.properties?.find((prop) => prop.name === 'description')
  return description?.['*']
}

export async function fetchQuestSectionWikitext(
  title: string,
  sectionIndex: string
): Promise<{ title: string; wikitext: string }> {
  const params = new URLSearchParams({
    action: 'parse',
    page: title,
    prop: 'wikitext',
    section: sectionIndex,
    format: 'json',
    origin: '*'
  })

  const response = await fetch(`${WIKI_API}?${params}`)
  const data = (await response.json()) as WikiParseResponse

  if (data.error || !data.parse?.wikitext) {
    throw new Error(data.error?.info ?? `Could not load section ${sectionIndex} for ${title}`)
  }

  const headingMatch = data.parse.wikitext['*'].match(/^==+\s*(.+?)\s*==+/m)
  const sectionTitle = headingMatch?.[1] ?? `Step ${sectionIndex}`

  return {
    title: sectionTitle,
    wikitext: data.parse.wikitext['*']
  }
}

const WALKTHROUGH_SECTION_NAMES = new Set([
  'overview',
  'walkthrough',
  'details',
  'starting out',
  'getting started',
  'quest',
  'finishing up',
  'completion'
])

const SKIP_SECTION_NAMES = new Set([
  'official description',
  'rewards',
  'achievements',
  'required for completing',
  'transcript',
  'development and release',
  'reception and sequel',
  'credits',
  'update history',
  'trivia',
  'references',
  'see also',
  'quick guide',
  'map',
  'music',
  'gallery'
])

function isWalkthroughSection(name: string): boolean {
  const lower = name.toLowerCase()

  if (SKIP_SECTION_NAMES.has(lower)) {
    return false
  }

  if (WALKTHROUGH_SECTION_NAMES.has(lower)) {
    return true
  }

  return !lower.startsWith('dialogue') && !lower.includes('transcript')
}

function stripWikitext(input: string): string {
  let text = input

  text = text.replace(/^=+\s*.+?\s*=+\s*$/gm, '')
  text = text.replace(/\{\{[^{}]*\}\}/g, '')
  text = text.replace(/\{\|[\s\S]*?\|\}/g, '')
  text = text.replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, '')
  text = text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1')
  text = text.replace(/'''+/g, '')
  text = text.replace(/<ref[^>]*\/>/g, '')
  text = text.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
  text = text.replace(/<[^>]+>/g, '')
  text = text.replace(/\{\{clear\}\}/gi, '')
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()

  return text
}

function extractRequirements(sections: WikiSection[], wikitextByIndex: Map<string, string>): string[] {
  const requirements: string[] = []

  for (const section of sections) {
    if (!section.line.toLowerCase().includes('requirement')) continue
    const wikitext = wikitextByIndex.get(section.index)
    if (!wikitext) continue

    const cleaned = stripWikitext(wikitext)
    cleaned
      .split('\n')
      .map((line) => line.replace(/^[*#]+\s*/, '').trim())
      .filter(Boolean)
      .forEach((line) => requirements.push(line))
  }

  return requirements.slice(0, 12)
}

export async function fetchQuestWalkthrough(title: string) {
  const sections = await fetchQuestSections(title)
  const description = await fetchQuestDescription(title)

  const walkthroughSections = sections.filter((section) => isWalkthroughSection(section.line))

  const selectedSections =
    walkthroughSections.length > 0
      ? walkthroughSections
          : sections.filter((section) => {
          const lower = section.line.toLowerCase()
          return !SKIP_SECTION_NAMES.has(lower) && (section.toclevel ?? 1) <= 2
        })

  const wikitextByIndex = new Map<string, string>()
  const steps = []

  for (const section of selectedSections.slice(0, 12)) {
    const { title: stepTitle, wikitext } = await fetchQuestSectionWikitext(title, section.index)
    wikitextByIndex.set(section.index, wikitext)

    const body = stripWikitext(wikitext)
    if (!body) continue

    steps.push({
      id: section.anchor || section.index,
      title: stepTitle,
      body,
      wikiAnchor: section.anchor
    })
  }

  if (steps.length === 0) {
    throw new Error(`No walkthrough sections found for ${title}.`)
  }

  return {
    title,
    description,
    wikiUrl: questWikiUrl(title),
    requirements: extractRequirements(sections, wikitextByIndex),
    recommended: [],
    steps
  }
}
