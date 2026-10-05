import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type SyntheticEvent } from 'react'
import './opencv-mat-inspector.css'

interface ImageSize {
  width: number
  height: number
}

interface PixelSample {
  x: number
  y: number
  b: number
  g: number
  r: number
}

interface Props {
  imageSrc?: string
}

export default function OpenCVMatInspector({
  imageSrc = '/media/images/opencv/armor-field.w1280.webp',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [size, setSize] = useState<ImageSize>()
  const [sample, setSample] = useState<PixelSample>()
  const [imageUnavailable, setImageUnavailable] = useState(false)

  const sampleAt = (x: number, y: number) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { willReadFrequently: true })
    if (!canvas || !context || canvas.width === 0 || canvas.height === 0) return

    const sampleX = Math.min(canvas.width - 1, Math.max(0, Math.floor(x)))
    const sampleY = Math.min(canvas.height - 1, Math.max(0, Math.floor(y)))
    const [r, g, b] = context.getImageData(sampleX, sampleY, 1, 1).data
    setSample({ x: sampleX, y: sampleY, b, g, r })
  }

  const initializeImage = (image: HTMLImageElement) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { willReadFrequently: true })
    if (!canvas || !context) return

    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    context.drawImage(image, 0, 0)
    setSize({ width: image.naturalWidth, height: image.naturalHeight })
    sampleAt(Math.floor(image.naturalWidth / 2), Math.floor(image.naturalHeight / 2))
  }

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => initializeImage(event.currentTarget)

  useEffect(() => {
    const image = imageRef.current
    if (image?.complete && image.naturalWidth > 0) initializeImage(image)
  }, [imageSrc])

  const handleImageClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!size) return
    if (event.detail === 0) {
      sampleAt(sample?.x ?? size.width / 2, sample?.y ?? size.height / 2)
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    sampleAt(
      (event.clientX - bounds.left) * size.width / bounds.width,
      (event.clientY - bounds.top) * size.height / bounds.height,
    )
  }

  const handleImageKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!size || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    const x = sample?.x ?? Math.floor(size.width / 2)
    const y = sample?.y ?? Math.floor(size.height / 2)
    const step = event.shiftKey ? 10 : 1
    sampleAt(
      x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
      y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0),
    )
  }

  return (
    <section className="opencv-mat-inspector" aria-labelledby="opencv-mat-inspector-title">
      <header className="opencv-mat-inspector__header">
        <h3 id="opencv-mat-inspector-title">实验 2 · 像素采样</h3>
        <p>点击图像读取该点的坐标与 BGR 值；聚焦图像后也可用方向键移动采样点，按住 Shift 每次移动 10 像素。</p>
      </header>

      <div className="opencv-mat-inspector__workspace">
        <div className="opencv-mat-inspector__image-wrap">
          {!imageUnavailable
            ? <button
                type="button"
                className="opencv-mat-inspector__image"
                onClick={handleImageClick}
                onKeyDown={handleImageKeyDown}
                disabled={!size}
                aria-label="选择图像像素；可用方向键移动采样点"
              >
                <img ref={imageRef} src={imageSrc} alt="用于像素采样的 RoboMaster 赛场图像" onLoad={handleImageLoad} onError={() => setImageUnavailable(true)} />
                {sample && size && <span
                  className="opencv-mat-inspector__marker"
                  style={{ left: `${sample.x / size.width * 100}%`, top: `${sample.y / size.height * 100}%` }}
                  aria-hidden="true"
                />}
              </button>
            : <div className="opencv-mat-inspector__missing">赛场图片暂时不可用。</div>}
          <canvas ref={canvasRef} className="opencv-mat-inspector__canvas" aria-hidden="true" />
        </div>

        <div className="opencv-mat-inspector__readout" aria-live="polite">
          {size
            ? <>
                <dl className="opencv-mat-inspector__metadata">
                  <div><dt>尺寸</dt><dd>{size.width} × {size.height}</dd></div>
                  <div><dt>类型</dt><dd>CV_8UC3</dd></div>
                  <div><dt>通道</dt><dd>3 · BGR</dd></div>
                </dl>
                {sample && <>
                  <dl className="opencv-mat-inspector__sample">
                    <div><dt>坐标</dt><dd>({sample.x}, {sample.y})</dd></div>
                    <div><dt>BGR</dt><dd>({sample.b}, {sample.g}, {sample.r})</dd></div>
                    <div><dt>通道值</dt><dd><span>B {sample.b}</span><span>G {sample.g}</span><span>R {sample.r}</span></dd></div>
                  </dl>
                  <p className="opencv-mat-inspector__expression">
                    对应 C++：<code>{`image.at<cv::Vec3b>(${sample.y}, ${sample.x})`}</code>
                  </p>
                </>}
              </>
            : <p className="opencv-mat-inspector__loading">正在载入图像…</p>}
        </div>
      </div>
    </section>
  )
}
