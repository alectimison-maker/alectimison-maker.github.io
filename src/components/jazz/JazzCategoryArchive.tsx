import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowDown } from 'lucide-react'
import {
  jazzCategories,
  type JazzCategory,
  type JazzCategorySlug,
} from '../../data/jazz-categories'

type CategorizedRecord = {
  categories?: string[]
}

export type JazzCategorySelectHandler = (category: JazzCategory) => void

const categoryStyle = (category: JazzCategory) => ({
  '--category-color': category.color,
  '--category-ink': category.ink,
  '--category-font': category.fontFamily,
} as CSSProperties)

export default function JazzCategoryArchive({
  items,
  onSelectCategory,
}: {
  items: CategorizedRecord[]
  onSelectCategory?: JazzCategorySelectHandler
}) {
  const [activeSlug, setActiveSlug] = useState<JazzCategorySlug>('swing')
  const hoverTimer = useRef<number | undefined>(undefined)
  const counts = useMemo(() => new Map(jazzCategories.map((category) => [
    category.slug,
    items.filter((item) => item.categories?.includes(category.slug)).length,
  ])), [items])

  useEffect(() => () => window.clearTimeout(hoverTimer.current), [])

  const scheduleCategory = (slug: JazzCategorySlug) => {
    window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setActiveSlug(slug), 80)
  }

  const selectCategory = (category: JazzCategory) => {
    window.clearTimeout(hoverTimer.current)
    setActiveSlug(category.slug as JazzCategorySlug)
    onSelectCategory?.(category)
  }

  return (
    <section className="jp-categories" id="jazz-categories" aria-labelledby="jazz-categories-title">
      <div className="jp-categories__statement">
        <span>ELEVEN DIRECTIONS / ONE ARCHIVE</span>
        <blockquote id="jazz-categories-title">
          “My soul is a hidden orchestra. I know myself only as a symphony.”
        </blockquote>
        <cite>
          Fernando Pessoa
          <i>The Book of Disquiet</i>
        </cite>
      </div>

      <div className="jp-categories__rail" role="list" aria-label="Jazz categories">
        {jazzCategories.map((category, index) => {
          const count = counts.get(category.slug) ?? 0
          const isActive = category.slug === activeSlug

          return (
            <button
              className={`jp-category ${isActive ? 'is-active' : ''}`}
              style={categoryStyle(category)}
              type="button"
              role="listitem"
              aria-expanded={isActive}
              aria-label={`${category.title}. ${count ? `${count} records` : 'Collection in progress'}`}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'touch') scheduleCategory(category.slug)
              }}
              onPointerLeave={() => window.clearTimeout(hoverTimer.current)}
              onFocus={() => setActiveSlug(category.slug)}
              onClick={() => selectCategory(category)}
              key={category.slug}
            >
              <span className="jp-category__number">{String(index + 1).padStart(2, '0')}</span>
              <span className="jp-category__closed-title" aria-hidden="true">{category.title}</span>
              <span className="jp-category__content" aria-hidden={!isActive}>
                <strong>{category.title}</strong>
                <q>{category.quote}</q>
                <span className="jp-category__source">
                  {category.author}
                  <i>{category.work}</i>
                </span>
                <span className="jp-category__status">
                  {count ? `${String(count).padStart(2, '0')} RECORDS` : 'COLLECTION IN PROGRESS'}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <a className="jp-categories__next" href="#jazz-library">
        <ArrowDown size={16} />
        All records
      </a>
    </section>
  )
}
