export function extractQuestionParts(questionText = '') {
  const text = String(questionText || '').trim()
  if (!text) return []

  const pattern = /(?:^|\s)([a-z])\)\s*/gi
  const matches = [...text.matchAll(pattern)]
  if (matches.length < 2) return []

  return matches
    .map((match, index) => {
      const nextMatch = matches[index + 1]
      const start = match.index + match[0].length
      const end = nextMatch ? nextMatch.index : text.length
      const content = text.slice(start, end).trim().replace(/[\s:;-]+$/g, '')
      if (!content) return null
      return {
        key: match[1].toUpperCase(),
        label: `Part ${match[1].toUpperCase()}`,
        text: content,
      }
    })
    .filter(Boolean)
}

export function normalizePartAnswers(answer, parts = []) {
  if (!parts.length) return answer || ''

  const normalized = {}
  const source = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {}

  parts.forEach((part, index) => {
    normalized[part.key] = typeof source[part.key] === 'string'
      ? source[part.key]
      : (index === 0 && typeof answer === 'string' ? answer : '')
  })

  return normalized
}

export function getPartAnswer(answer, partKey, parts = []) {
  if (!parts.length) return typeof answer === 'string' ? answer : ''
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return ''
  return typeof answer[partKey] === 'string' ? answer[partKey] : ''
}

export function setPartAnswer(answer, partKey, value, parts = []) {
  if (!parts.length) return value

  const normalized = normalizePartAnswers(answer, parts)
  return {
    ...normalized,
    [partKey]: value,
  }
}

export function getCombinedAnswerText(answer, parts = []) {
  if (!parts.length) return typeof answer === 'string' ? answer : ''
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return ''

  return parts
    .map((part) => answer[part.key] || '')
    .filter(Boolean)
    .join('\n')
}

export function hasNonEmptyAnswer(answer) {
  if (typeof answer === 'string') {
    return answer.trim().length > 0
  }
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
    return false
  }
  return Object.values(answer).some((value) => typeof value === 'string' && value.trim().length > 0)
}
