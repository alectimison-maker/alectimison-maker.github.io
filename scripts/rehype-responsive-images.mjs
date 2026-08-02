import { visit } from 'unist-util-visit'
import imageManifest from '../public/image-manifest.json' with { type: 'json' }

const decodePath = (value) => {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

const manifestKey = (source) => source
  .split('/')
  .map((segment) => encodeURIComponent(segment))
  .join('/')

const responsiveVariants = (source) => imageManifest[manifestKey(source)]?.variants ?? []

export default function rehypeResponsiveImages() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'img') return
      const source = decodePath(String(node.properties?.src ?? ''))
      if (!source.startsWith('/media/')) return
      const extensionIndex = source.lastIndexOf('.')
      if (extensionIndex < 0) return
      const extension = source.slice(extensionIndex).toLowerCase()
      if (extension === '.svg' || extension === '.ico') return
      const variants = responsiveVariants(source)
      if (!variants.length) return
      const webpVariants = variants.filter((variant) => variant.webp)
      const avifVariants = variants.filter((variant) => variant.avif)
      const fallback = webpVariants.findLast((variant) => variant.width <= 1600) ?? webpVariants.at(-1)
      node.properties = {
        ...node.properties,
        src: fallback.webp,
        srcSet: webpVariants.map((variant) => `${variant.webp} ${variant.width}w`).join(', '),
        sizes: '(max-width: 760px) calc(100vw - 2rem), 70ch',
        loading: 'lazy',
        decoding: 'async',
      }
      if (parent && typeof index === 'number') {
        parent.children[index] = {
          type: 'element',
          tagName: 'picture',
          properties: {},
          children: [
            ...(avifVariants.length ? [{
              type: 'element',
              tagName: 'source',
              properties: {
                type: 'image/avif',
                srcSet: avifVariants.map((variant) => `${variant.avif} ${variant.width}w`).join(', '),
                sizes: '(max-width: 760px) calc(100vw - 2rem), 70ch',
              },
              children: [],
            }] : []),
            node,
          ],
        }
      }
    })
  }
}
