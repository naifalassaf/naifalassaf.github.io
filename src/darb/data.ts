import data from '../trails/data/trails.json'
import type { TrailData } from '../trails/types'

/** Darb's Trails only, from the same data the /trails page ships */
export const TRAILS = (data as unknown as TrailData).trails.filter((t) => t.source === 'darb')
