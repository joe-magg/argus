type Section = { label: string | null; paragraphs: string[]; bullets: string[] }

const LABEL_RE = /^([A-Z][A-Z0-9 ()/-]{1,24}):\s*(.*)$/

function parseSections(text: string): Section[] {
  const sections: Section[] = []
  let current: Section = { label: null, paragraphs: [], bullets: [] }
  const push = () => {
    if (current.label || current.paragraphs.length || current.bullets.length) sections.push(current)
  }

  for (const raw of text.split("\n")) {
    const line = raw.trim()
    if (!line) continue
    const labelMatch = line.match(LABEL_RE)
    if (labelMatch) {
      push()
      current = { label: labelMatch[1].trim(), paragraphs: [], bullets: [] }
      if (labelMatch[2].trim()) current.paragraphs.push(labelMatch[2].trim())
      continue
    }
    if (line.startsWith("- ") || line.startsWith("• ")) {
      current.bullets.push(line.replace(/^[-•]\s+/, ""))
      continue
    }
    current.paragraphs.push(line)
  }
  push()
  return sections
}

export function AnalysisText({ text }: { text: string }) {
  const sections = parseSections(text)
  if (sections.length === 0) {
    return <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
  }

  return (
    <div className="flex flex-col gap-5">
      {sections.map((section, i) => (
        <div key={i} className="flex flex-col gap-2">
          {section.label && (
            <h4 className="font-mono text-xs font-semibold tracking-[0.2em] text-primary">
              {section.label}
            </h4>
          )}
          {section.paragraphs.map((p, j) => (
            <p key={j} className="text-sm leading-relaxed text-foreground/90">
              {p}
            </p>
          ))}
          {section.bullets.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {section.bullets.map((b, j) => (
                <li key={j} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
