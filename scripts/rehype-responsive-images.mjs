import { visit } from 'unist-util-visit'

const decodePath = (value) => {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

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
      const stem = source.slice(0, extensionIndex)
      node.properties = {
        ...node.properties,
        src: `${stem}.w1600.webp`,
        srcSet: [480, 960, 1600, 2560].map((width) => `${encodeURI(stem)}.w${width}.webp ${width}w`).join(', '),
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
            {
              type: 'element',
              tagName: 'source',
              properties: {
                type: 'image/avif',
                srcSet: [960, 1600, 2560].map((width) => `${encodeURI(stem)}.w${width}.avif ${width}w`).join(', '),
                sizes: '(max-width: 760px) calc(100vw - 2rem), 70ch',
              },
              children: [],
            },
            node,
          ],
        }
      }
    })
  }
}
