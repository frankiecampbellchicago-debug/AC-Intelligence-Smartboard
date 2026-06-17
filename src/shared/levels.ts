/**
 * The Website Cookbook — 7-level build progression.
 * Extracted from the user's "Website Cookbook" doc + YouTube transcript.
 * Level 7 (SEO Optimize) content authored to match the doc's title.
 */

export { TOTAL_LEVELS } from './types'

export interface ResourceLink {
  label: string
  url: string
}

export interface Skill {
  /** Stable id used as the checkbox key in a project's levelProgress. */
  id: string
  label: string
}

export interface Level {
  number: number
  title: string
  tagline: string
  /** "You're here when …" bullet points. */
  hereWhen: string[]
  /** "Skills to master" — these become tickable checkboxes per project. */
  skills: Skill[]
  /** The trap to avoid at this level. */
  trap: { name: string; description: string }
  /** The teaser that unlocks the next level. */
  unlock: string
  /** Optional resource links, rendered as clickable hyperlinks. */
  resources: ResourceLink[]
  /** Optional practical tip surfaced in the doc. */
  tip?: string
  /** Accent color (matches the design system) used for the level's badge. */
  accent: 'blue' | 'green' | 'red' | 'purple' | 'amber' | 'cyan' | 'emerald'
}

export const LEVELS: Level[] = [
  {
    number: 1,
    title: 'The Raw Prompter',
    tagline: 'Just me and a prompt',
    hereWhen: [
      'You open Claude Code and type "build me a landing page"',
      'No frameworks, no design direction',
      'You hope Claude just… knows what looks good'
    ],
    skills: [
      { id: 'l1-descriptive-prompts', label: 'Writing descriptive prompts' },
      { id: 'l1-frameworks', label: 'Specifying frameworks (Tailwind, React)' },
      { id: 'l1-design-vocab', label: 'Basic design vocabulary' }
    ],
    trap: {
      name: 'The Template Trap',
      description:
        'No direction = average of training data. Every site looks the same. Generic Tailwind + shadcn = "I obviously used AI."'
    },
    unlock: 'You realize Claude needs design intelligence, not just instructions.',
    resources: [],
    accent: 'amber'
  },
  {
    number: 2,
    title: 'The Skill Stacker',
    tagline: 'Give Claude a design education',
    hereWhen: [
      'You install frontend-design skill, UI/UX Pro Max',
      'Claude starts understanding color theory, typography, spacing, layout',
      'Output jumps from "template" to "designed"'
    ],
    skills: [
      { id: 'l2-right-skill', label: 'Choosing the right skill for the job' },
      { id: 'l2-understand-skills', label: 'Understanding what design skills change' },
      { id: 'l2-designer-eye', label: "Evaluating output with a designer's eye" }
    ],
    trap: {
      name: 'The Description Ceiling',
      description:
        "Skills improve output but you still can't SHOW Claude what you mean. Text descriptions hit a wall fast."
    },
    unlock: 'What if Claude could SEE what you want?',
    resources: [],
    accent: 'green'
  },
  {
    number: 3,
    title: 'The Visual Director',
    tagline: "Show, don't tell",
    hereWhen: [
      'You screenshot sites you like and paste them into the conversation',
      '"Make it look like this" is your go-to prompt',
      'Claude reverse-engineers the vibe'
    ],
    skills: [
      { id: 'l3-curate-refs', label: 'Curating good visual references' },
      { id: 'l3-communicate', label: 'Communicating what specifically you like' },
      { id: 'l3-combine-refs', label: 'Combining references from multiple sites' }
    ],
    trap: {
      name: 'The Vibe Gap',
      description:
        "Screenshots capture the look, not the code. Claude interprets, doesn't replicate. Close — but never exact."
    },
    unlock: 'What if you could grab the actual components, not just screenshots?',
    resources: [
      { label: 'Dribbble', url: 'https://dribbble.com/search/contracting' },
      { label: 'Awwwards', url: 'https://www.awwwards.com/' },
      { label: 'Godly', url: 'https://godly.website/' }
    ],
    accent: 'red'
  },
  {
    number: 4,
    title: 'The Cloner',
    tagline: 'Learn by stealing from the pros',
    hereWhen: [
      'You use site-teardown to break down entire websites — HTML, CSS, JS',
      'Through cloning you discover GSAP, parallax, scroll animations',
      'You bring pro techniques into your builds'
    ],
    skills: [
      { id: 'l4-read-source', label: 'Reading and understanding source code' },
      { id: 'l4-identify-techniques', label: 'Identifying which techniques = effects' },
      { id: 'l4-adapt', label: 'Adapting cloned patterns to your designs' }
    ],
    trap: {
      name: 'The Clone Ceiling',
      description:
        "You can copy but can't create. Without understanding WHY designs work, you're limited to what already exists."
    },
    unlock: 'What if you could curate specific pro components to put your own spin on it?',
    resources: [],
    tip: 'Scrape HTML code: Ctrl+U  /  Option+Cmd+U',
    accent: 'purple'
  },
  {
    number: 5,
    title: 'The Component Sniper',
    tagline: "You don't design — you curate",
    hereWhen: [
      'You browse 21st.dev and CodePen',
      'You grab specific navbars, heroes, cards, forms — real code',
      '"Integrate this" — hand Claude production components'
    ],
    skills: [
      { id: 'l5-find-components', label: 'Finding quality components (21st.dev)' },
      { id: 'l5-evaluate-code', label: 'Evaluating code before integrating' },
      { id: 'l5-swap-vs-build', label: 'Knowing what to swap vs. build' }
    ],
    trap: {
      name: 'Frankenstein Sites',
      description:
        'Mixing components from different design systems. Beautiful parts, ugly whole. Nothing feels cohesive.'
    },
    unlock: "You've curated the best — now it's time to design your own from scratch.",
    resources: [
      { label: '21st.dev components', url: 'https://21st.dev/community/components' },
      { label: 'CodePen', url: 'https://codepen.io/' },
      { label: 'Monet', url: 'https://www.monet.design/' }
    ],
    accent: 'cyan'
  },
  {
    number: 6,
    title: 'The Designer',
    tagline: 'Stop coding blind',
    hereWhen: [
      'You connect Paper.design, Stitch, or Figma to Claude Code via MCP',
      'Claude designs on a live canvas you can see and manipulate',
      'Pixel-level refinement with real tools'
    ],
    skills: [
      { id: 'l6-mcp-workflow', label: 'Paper.design MCP setup & workflow' },
      { id: 'l6-bidirectional', label: 'Bidirectional design (visual + code)' },
      { id: 'l6-assets', label: 'Asset creation and management' }
    ],
    trap: {
      name: 'Tool Paralysis',
      description:
        "Paper, Stitch, Figma, Pencil — too many options. Pick ONE and master it. The tool isn't the point."
    },
    unlock: "You've mastered the build — now make sure the world can find it.",
    resources: [{ label: 'Google Stitch', url: 'https://stitch.withgoogle.com/' }],
    accent: 'blue'
  },
  {
    number: 7,
    title: 'SEO Optimize',
    tagline: 'Ship it so it gets found',
    hereWhen: [
      'The build looks great — now it has to rank and load fast',
      'You audit before pushing live, not after',
      'You treat performance and metadata as part of "done"'
    ],
    skills: [
      { id: 'l7-meta', label: 'Title, meta description & Open Graph / Twitter cards' },
      { id: 'l7-semantic', label: 'Semantic HTML + heading hierarchy + alt text' },
      { id: 'l7-perf', label: 'Lighthouse pass: performance, Core Web Vitals, mobile' },
      { id: 'l7-crawl', label: 'sitemap.xml, robots.txt & canonical URLs' },
      { id: 'l7-structured', label: 'Structured data (JSON-LD schema)' }
    ],
    trap: {
      name: 'The Invisible Site',
      description:
        'A beautiful site nobody finds. No metadata, slow load, no sitemap — great design that never ranks or converts.'
    },
    unlock: "You've shipped a site that looks great and gets found. Start the next one.",
    resources: [
      { label: 'PageSpeed Insights', url: 'https://pagespeed.web.dev/' },
      { label: 'Google Search Console', url: 'https://search.google.com/search-console' },
      { label: 'Schema.org', url: 'https://schema.org/docs/gs.html' }
    ],
    accent: 'emerald'
  }
]

/** Flat list of every resource link, for the Resources page. */
export const ALL_RESOURCES: { level: number; title: string; links: ResourceLink[] }[] = LEVELS.filter(
  (l) => l.resources.length > 0
).map((l) => ({ level: l.number, title: l.title, links: l.resources }))
