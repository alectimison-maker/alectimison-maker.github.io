import { navigate } from 'astro:transitions/client'
import { FocusStage } from './JazzPrototype'
import { jazzAlbumPath, jazzStandardPath, type JazzItem } from '../../data/jazz-types'
import { jazzCategories, jazzCategoryPath } from '../../data/jazz-categories'

export default function JazzAlbumPage({ item, previousId, nextId, index, total }: {
  item: JazzItem; previousId: string; nextId: string; index: number; total: number
}) {
  const path = item.kind === 'standard' ? jazzStandardPath : jazzAlbumPath
  const back = () => {
    const requested = new URLSearchParams(window.location.search).get('category')
    const category = jazzCategories.find((entry) => entry.slug === requested)
      ?? jazzCategories.find((entry) => item.categories?.includes(entry.slug))
    void navigate(item.kind === 'standard' && category ? jazzCategoryPath(category.slug) : '/jazz/#jazz-library')
  }
  const move = (id: string) => {
    const requested = new URLSearchParams(window.location.search).get('category')
    const category = jazzCategories.find((entry) => entry.slug === requested)
    void navigate(path(id) + (category ? `?category=${category.slug}` : ''))
  }
  return <div className="jp-root"><FocusStage item={item} index={index} total={total}
    onBack={back}
    onPrevious={() => move(previousId)}
    onNext={() => move(nextId)} /></div>
}
