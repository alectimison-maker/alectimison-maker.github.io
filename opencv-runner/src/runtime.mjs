import { access, mkdir, mkdtemp, readFile, rm, writeFile, copyFile, chmod } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { LIMITS } from './policy.mjs'

const cppHarness = (code) => `#include "/opt/opencv-runner/include/opencv-runner.hpp"

${code}

int main()
{
  cv::setNumThreads(1);
  const cv::Mat input = cv::imread("/workspace/input.webp", cv::IMREAD_COLOR);
  if (input.empty()) {
    std::cerr << "InputError: 无法读取固定教学图片\\n";
    return 2;
  }
  cv::Mat result = process(input);
  if (result.empty()) {
    std::cerr << "ResultError: process 必须返回非空 cv::Mat\\n";
    return 3;
  }
  if (result.rows > 4096 || result.cols > 4096) {
    std::cerr << "ResultError: 输出图像尺寸不能超过 4096 × 4096\\n";
    return 4;
  }
  if (!cv::imwrite("/workspace/result.png", result)) {
    std::cerr << "ResultError: 输出图像无法编码为 PNG\\n";
    return 5;
  }
  std::cout << "process returned " << result.cols << " × " << result.rows
            << " with " << result.channels() << " channel(s)\\n";
  return 0;
}
`

const pythonHarness = (code) => `import cv2
import numpy as np

${code}

cv2.setNumThreads(1)
image = cv2.imread("/workspace/input.webp", cv2.IMREAD_COLOR)
if image is None:
    raise RuntimeError("InputError: 无法读取固定教学图片")
result = process(image)
if not isinstance(result, np.ndarray) or result.size == 0:
    raise TypeError("ResultError: process 必须返回非空 numpy.ndarray")
if result.ndim not in (2, 3) or result.shape[0] > 4096 or result.shape[1] > 4096:
    raise ValueError("ResultError: 输出图像格式无效或尺寸超过 4096 × 4096")
if not cv2.imwrite("/workspace/result.png", result):
    raise RuntimeError("ResultError: 输出图像无法编码为 PNG")
channels = 1 if result.ndim == 2 else result.shape[2]
print(f"process returned {result.shape[1]} × {result.shape[0]} with {channels} channel(s)")
`

function collectProcess(command, args, { signal, timeoutMs, onTerminate, env = process.env }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], env })
    let stdout = ''
    let stderr = ''
    const append = (current, chunk) => (current + chunk).slice(0, LIMITS.outputBytes)
    const redactDockerConfigPath = (value) => value.replace(/(open )[^:\n]*\/\.docker\/config\.json(?=:)/g, '$1[Docker config]')
    child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk.toString()) })
    child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk.toString()) })
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
      onTerminate?.()
    }, timeoutMs)
    const abort = () => {
      child.kill('SIGKILL')
      onTerminate?.()
    }
    signal?.addEventListener('abort', abort, { once: true })
    child.on('close', (exitCode, exitSignal) => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
      resolve({ exitCode, exitSignal, stdout: redactDockerConfigPath(stdout), stderr: redactDockerConfigPath(stderr), timedOut, aborted: signal?.aborted ?? false })
    })
    child.on('error', (error) => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
      resolve({ exitCode: -1, stdout: redactDockerConfigPath(stdout), stderr: redactDockerConfigPath(append(stderr, error.message)), timedOut, aborted: signal?.aborted ?? false })
    })
  })
}

export class DockerExecutor {
  constructor({
    image = process.env.OPENCV_RUNNER_IMAGE ?? 'aliouswe/opencv-runner:4.5.4',
    runtime = process.env.OPENCV_DOCKER_RUNTIME ?? '',
    inputImage = process.env.OPENCV_INPUT_IMAGE,
    workRoot = process.env.OPENCV_WORK_ROOT ?? tmpdir(),
  } = {}) {
    this.image = image
    this.runtime = runtime
    this.inputImage = inputImage
    this.workRoot = workRoot
    this.dockerConfigPromise = undefined
  }

  async dockerEnvironment() {
    if (!this.dockerConfigPromise) {
      this.dockerConfigPromise = (async () => {
        // systemd hides the service account home; never make Docker CLI read its private config or credentials.
        const directory = await mkdtemp(path.join(tmpdir(), 'opencv-docker-config-'))
        try {
          await writeFile(path.join(directory, 'config.json'), '{}\n', { mode: 0o600 })
          return directory
        } catch (error) {
          await rm(directory, { recursive: true, force: true })
          throw error
        }
      })()
    }
    return { ...process.env, DOCKER_CONFIG: await this.dockerConfigPromise }
  }

  async readiness() {
    if (!this.inputImage) return { ok: false, message: 'OPENCV_INPUT_IMAGE 未配置。' }
    try {
      await access(this.inputImage)
      return { ok: true }
    } catch {
      return { ok: false, message: '固定教学图片不存在或不可读。' }
    }
  }

  async execute(job, { signal, onState }) {
    if (!this.inputImage) throw new Error('RunnerConfigError: OPENCV_INPUT_IMAGE 未配置。')
    await mkdir(this.workRoot, { recursive: true })
    const directory = await mkdtemp(path.join(this.workRoot, 'opencv-job-'))
    await chmod(directory, 0o777)
    const sourceName = job.language === 'cpp' ? 'main.cpp' : 'main.py'
    await writeFile(path.join(directory, sourceName), job.language === 'cpp' ? cppHarness(job.code) : pythonHarness(job.code), { mode: 0o666 })
    await copyFile(this.inputImage, path.join(directory, 'input.webp'))
    await chmod(path.join(directory, 'input.webp'), 0o644)
    const dockerEnv = await this.dockerEnvironment()

    const commonArgs = [
      'run', '--rm', '--network', 'none', '--read-only', '--memory', '512m', '--memory-swap', '512m', '--cpus', '1',
      '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '65532:65532',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m', '-v', `${directory}:/workspace:rw`,
    ]
    if (this.runtime) commonArgs.push('--runtime', this.runtime)
    const removeContainer = (name) => {
      const cleanup = spawn('docker', ['rm', '-f', name], { stdio: 'ignore', env: dockerEnv })
      cleanup.unref()
    }
    let result
    if (job.language === 'cpp') {
      const compileName = `opencv-compile-${job.id}`
      onState('compiling')
      const compile = await collectProcess('docker', [
        ...commonArgs, '--name', compileName, '--pids-limit', '128', this.image,
        'bash', '-lc', 'g++ -std=c++17 -O0 -pipe /workspace/main.cpp -o /workspace/app $(pkg-config --cflags --libs opencv4)',
      ], { signal, timeoutMs: LIMITS.compileMs, onTerminate: () => removeContainer(compileName), env: dockerEnv })
      if (compile.aborted || compile.timedOut || compile.exitCode !== 0) {
        result = { ...compile, diagnostics: compile.timedOut ? `CompileTimeLimitExceeded: 编译时间超过 ${LIMITS.compileMs / 1_000} 秒。` : '' }
      } else {
        const runName = `opencv-run-${job.id}`
        onState('running')
        result = await collectProcess('docker', [
          ...commonArgs, '--name', runName, '--pids-limit', '32',
          '--env', 'OMP_NUM_THREADS=1', '--env', 'OPENBLAS_NUM_THREADS=1', this.image, '/workspace/app',
        ], { signal, timeoutMs: LIMITS.runMs, onTerminate: () => removeContainer(runName), env: dockerEnv })
      }
    } else {
      const runName = `opencv-run-${job.id}`
      onState('running')
      result = await collectProcess('docker', [
        ...commonArgs, '--name', runName, '--pids-limit', '32',
        '--env', 'OMP_NUM_THREADS=1', '--env', 'OPENBLAS_NUM_THREADS=1', this.image, 'python3', '/workspace/main.py',
      ], { signal, timeoutMs: LIMITS.runMs, onTerminate: () => removeContainer(runName), env: dockerEnv })
    }

    if (result.aborted) {
      await rm(directory, { recursive: true, force: true })
      return { ...result, status: 'cancelled' }
    }
    if (result.timedOut) {
      return { ...result, status: 'failed', diagnostics: result.diagnostics || 'RunTimeLimitExceeded: 运行时间超过 3 秒。', directory }
    }
    if (result.exitCode !== 0) {
      return { ...result, status: 'failed', diagnostics: result.exitSignal ? `进程被 ${result.exitSignal} 终止。` : '', directory }
    }
    const resultPath = path.join(directory, 'result.png')
    await readFile(resultPath)
    return { ...result, status: 'succeeded', resultPath, directory }
  }

  async cleanup(directory) {
    if (directory) await rm(directory, { recursive: true, force: true })
  }
}
