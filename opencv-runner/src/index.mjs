import { DockerExecutor } from './runtime.mjs'
import { createOpenCVServer } from './app.mjs'

const port = Number(process.env.PORT ?? 8787)
const host = process.env.HOST ?? '127.0.0.1'
const { server } = createOpenCVServer({ executor: new DockerExecutor() })
server.listen(port, host, () => console.log(`OpenCV runner listening on http://${host}:${port}`))
