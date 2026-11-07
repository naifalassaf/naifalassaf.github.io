export type Lang = 'ar' | 'en'
export type SourceId = 'ksrnr' | 'darb' | 'asir'
export type Difficulty = 'easy' | 'moderate' | 'hard'

export interface Bilingual {
  ar: string
  en: string | null
}

export interface Trail {
  id: string
  source: SourceId
  name: Bilingual
  /** true when the English name is our transliteration, not the Source's */
  nameEnOurs: boolean
  region: Bilingual
  city: Bilingual | null
  lengthKm: number | null
  highM: number | null
  lowM: number | null
  gainM: number | null
  /** [min, max] in minutes */
  duration: [number, number] | null
  difficulty: Difficulty | null
  /** [lat, lon] */
  start: [number, number] | null
  page: { ar: string; en: string }
  /** whose page `page` is, when it isn't the Source's own (SCHF: Saudi Climbing and Hiking Federation) */
  pageOf?: 'schf'
  /** the Source's own route file, linked for download */
  download: string | null
  hasRoute: boolean
}

export interface TrailData {
  sources: Record<SourceId, { asOf: string | null }>
  trails: Trail[]
}

/** Trail id → lines of [lat, lon] */
export type Routes = Record<string, [number, number][][]>
