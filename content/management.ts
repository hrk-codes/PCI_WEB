/**
 * PCI's leadership, as published on the company's own Management page. Only names, honorifics and roles are stated.
 *
 * Portraits: add a `photo` (for example '/media/leadership/prakash-jha.webp', a 4:5 portrait) and the card shows it in
 * place of the monogram. No other change is needed.
 */
export type Leader = {
  id: string
  honorific: string
  name: string
  role: string
  /** Short role label for the structure diagram. */
  short: string
  initials: string
  group: 'board' | 'management'
  photo?: string
}

export const leaders: Leader[] = [
  { id: 'chairman', honorific: 'Shri', name: 'Harsh Narayan Jha', role: 'Chairman', short: 'Chairman', initials: 'HJ', group: 'board' },
  { id: 'managing-director', honorific: 'Shri', name: 'Prakash Jha', role: 'Managing Director', short: 'Managing Director', initials: 'PJ', group: 'board' },
  { id: 'avp', honorific: 'Smt.', name: 'Ranju Devi Jha', role: 'AVP', short: 'AVP', initials: 'RJ', group: 'management' },
  { id: 'avp-sales', honorific: 'Shri', name: 'Ranjeet Kumar', role: 'AVP, Sales & Business Development', short: 'AVP · Sales & BD', initials: 'RK', group: 'management' },
]

export const leaderGroups: Record<Leader['group'], string> = { board: 'Board of directors', management: 'Senior management' }
