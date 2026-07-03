/**
 * Server-side GitHub REST helpers. Mirrors the shape produced by the web shim's
 * fetchReposForToken so the renderer's GithubRepo type is satisfied unchanged.
 */

const GH_HEADERS = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'ac-smartboard'
})

async function getLogin(token) {
  const res = await fetch('https://api.github.com/user', { headers: GH_HEADERS(token) })
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  const user = await res.json()
  return user.login
}

async function fetchRepoPaths(fullName, branch, token) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${fullName}/git/trees/${branch || 'main'}?recursive=1`,
      { headers: GH_HEADERS(token) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.tree || []).map((n) => n.path).slice(0, 500)
  } catch {
    return []
  }
}

async function fetchRepos(token) {
  const res = await fetch(
    'https://api.github.com/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member',
    { headers: GH_HEADERS(token) }
  )
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  const repos = await res.json()
  const result = []
  for (const r of repos) {
    const paths = await fetchRepoPaths(r.full_name, r.default_branch, token)
    const pagesUrl = r.has_pages ? `https://${r.owner.login}.github.io/${r.name}/` : ''
    result.push({
      name: r.name,
      fullName: r.full_name,
      repoId: String(r.id),
      description: r.description || '',
      repoUrl: r.html_url,
      liveUrl: (r.homepage || '').trim() || pagesUrl,
      language: r.language || '',
      topics: r.topics || [],
      isPrivate: r.private,
      isFork: r.fork,
      isArchived: r.archived,
      pushedAt: r.pushed_at,
      paths
    })
  }
  return result
}

module.exports = { getLogin, fetchRepos }
