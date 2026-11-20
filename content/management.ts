/**
 * PCI's leadership: names, honorifics and roles as PCI publishes them, with their studio portraits.
 *
 * Portraits are 4:5 studio photographs in public/media/leadership/. A leader without a `photo` shows a monogram
 * instead, so a new member can be listed before their portrait is ready.
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
  { id: 'chairman', honorific: 'Shri', name: 'Harsh Narayan Jha', role: 'Chairman', short: 'Chairman', initials: 'HJ', group: 'board', photo: '/media/leadership/harsh-narayan-jha.webp' },
  { id: 'managing-director', honorific: 'Shri', name: 'Prakash Jha', role: 'Managing Director', short: 'Managing Director', initials: 'PJ', group: 'board', photo: '/media/leadership/prakash-jha.webp' },
  { id: 'avp-sales', honorific: 'Shri', name: 'Ranjeet Kumar', role: 'AVP, Sales & Business Development', short: 'AVP · Sales & BD', initials: 'RK', group: 'management', photo: '/media/leadership/ranjeet-kumar.webp' },
]

export const leaderGroups: Record<Leader['group'], string> = { board: 'Board of directors', management: 'Senior management' }
