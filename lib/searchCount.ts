const STORAGE_KEY = "formulens_search_count"

export function getSearchCount(): number {
  if (typeof window === "undefined") return 0
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? parseInt(stored, 10) : 0
}

export function incrementSearchCount(): number {
  const current = getSearchCount()
  const next = current + 1
  localStorage.setItem(STORAGE_KEY, String(next))
  return next
}

export function resetSearchCount(): void {
  localStorage.removeItem(STORAGE_KEY)
}
