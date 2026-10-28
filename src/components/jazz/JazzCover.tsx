import type { JazzImageVariant } from '../../data/jazz-types'

export default function JazzCover({ src, variants = [], alt, className, sizes = '(max-width: 800px) 50vw, 20vw', width = 240, height = 240, preferSmall = false }: {
  src: string; variants?: JazzImageVariant[]; alt: string; className?: string; sizes?: string; width?: number; height?: number; preferSmall?: boolean
}) {
  const webp = variants.map((variant) => `${variant.webp} ${variant.width}w`).join(', ')
  const avif = variants.filter((variant) => variant.avif).map((variant) => `${variant.avif} ${variant.width}w`).join(', ')
  return <picture>
    {!preferSmall && avif && <source type="image/avif" srcSet={avif} sizes={sizes} />}
    {webp && <source type="image/webp" srcSet={webp} sizes={sizes} />}
    <img src={preferSmall ? variants[0]?.webp ?? src : src} srcSet={webp || undefined} sizes={variants.length ? sizes : undefined} alt={alt} className={className}
      width={width} height={height} loading="lazy" decoding="async" draggable={false} />
  </picture>
}
