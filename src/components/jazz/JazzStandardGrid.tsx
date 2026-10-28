import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { jazzStandardPath, type JazzQueueTrack } from '../../data/jazz-types'
import JazzCover from './JazzCover'

export type StandardCard = Pick<JazzQueueTrack, 'id' | 'title' | 'artist' | 'cover' | 'coverVariants' | 'standard' | 'duration' | 'reviewNote'>

export default function JazzStandardGrid({ items, category }: { items: StandardCard[]; category: string }) {
  const [query, setQuery] = useState('')
  const [tune, setTune] = useState('')
  const tunes = useMemo(() => [...new Set(items.map((item) => item.standard ?? item.title))], [items])
  const visible = useMemo(() => {
    const search = query.trim().normalize('NFKC').toLocaleLowerCase()
    return items.filter((item) => (!tune || item.standard === tune)
      && (!search || [item.title, item.artist, item.standard ?? ''].some((value) => value.normalize('NFKC').toLocaleLowerCase().includes(search))))
  }, [items, query, tune])

  return <section className="jl-category-records jl-standards" aria-label="标准曲版本">
    <header><span className="jl-kicker">STANDARDS / DIFFERENT VOICES</span><h2>Standard</h2></header>
    <form className="jl-standard-filters" onSubmit={(event) => event.preventDefault()}>
      <label><Search size={15} /><span className="sr-only">搜索标准曲或演奏者</span><input type="search" placeholder="搜索曲名 / 演奏者" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label><span className="sr-only">按标准曲筛选</span><select value={tune} onChange={(event) => setTune(event.target.value)}><option value="">全部标准曲</option>{tunes.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      <span aria-live="polite">{visible.length} / {items.length} VERSIONS</span>
    </form>
    <div className="jl-standard-grid">{visible.map((item) => <a key={item.id} href={`${jazzStandardPath(item.id)}?category=${category}`}>
      <JazzCover src={item.cover} variants={item.coverVariants} preferSmall alt={`${item.title} · ${item.artist} 封面`} sizes="auto, (max-width: 800px) calc(50vw - 2rem), 180px" />
      <strong>{item.title}</strong><span>{item.artist}</span>
    </a>)}</div>
    {!visible.length && <p className="jl-search-empty">没有找到这个曲目或演奏者。</p>}
  </section>
}
