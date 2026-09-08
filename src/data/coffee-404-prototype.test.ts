import { describe, expect, it } from 'vitest'
import { createCoffee404Pool } from './coffee-404-prototype'

const post = (id: string, dataOverrides: Record<string, unknown> = {}, postOverrides: Record<string, unknown> = {}) => ({
  id,
  body: '## 春日拿铁\n\n![](\/media\/images\/coffee\/new-post\/latte.jpg)\n\n一杯很轻的咖啡。（8.5/10）\n\n## Not The End\n\n一些旅行碎片。',
  headings: [{ depth: 2, slug: '春日拿铁', text: '春日拿铁' }],
  data: {
    title: '新咖啡记录',
    description: '一篇新的咖啡记录。',
    date: new Date('2026-09-01'),
    space: 'coffee',
    draft: false,
    cover: '/media/images/coffee/new-post/cover.jpg',
    ...dataOverrides,
  },
  ...postOverrides,
})

describe('coffee 404 pool', () => {
  it('automatically adds drink sections from an uncurated Coffee post', () => {
    const [coffee] = createCoffee404Pool([post('new-coffee')]).filter((entry) => entry.sourceHref.startsWith('/posts/new-coffee'))

    expect(coffee).toMatchObject({
      id: 'new-coffee-1',
      names: ['春日拿铁'],
      image: '/media/images/coffee/new-post/latte.w960.webp',
      sourceHref: '/posts/new-coffee/#春日拿铁',
      score: '8.5/10',
    })
    expect(coffee.lead).toBe('一杯很轻的咖啡。（8.5/10）')
  })

  it('does not add drafts, non-Coffee posts, or non-drink sections', () => {
    const pool = createCoffee404Pool([
      post('draft-coffee', { draft: true }),
      post('article', { space: 'article' }),
      post('new-coffee'),
    ])

    expect(pool.filter((entry) => entry.sourceHref.includes('draft-coffee'))).toHaveLength(0)
    expect(pool.filter((entry) => entry.sourceHref.includes('/article'))).toHaveLength(0)
    expect(pool.filter((entry) => entry.sourceHref.startsWith('/posts/new-coffee'))).toHaveLength(1)
  })

  it('uses the article cover when a new Coffee post has no drink section', () => {
    const [coffee] = createCoffee404Pool([post('cover-only', {
      title: '封面咖啡',
    }, {
      body: '一段没有小节标题的咖啡记录。',
      headings: [],
    })]).filter((entry) => entry.sourceHref.startsWith('/posts/cover-only'))

    expect(coffee).toMatchObject({
      names: ['封面咖啡'],
      image: '/media/images/coffee/new-post/cover.w960.webp',
      sourceHref: '/posts/cover-only/',
    })
  })
})
