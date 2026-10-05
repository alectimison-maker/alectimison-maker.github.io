import assert from 'node:assert/strict'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { DockerExecutor } from '../src/runtime.mjs'

const runDockerTests = process.env.OPENCV_DOCKER_INTEGRATION === 'true'
const directories = []

afterEach(async () => {
  const executor = new DockerExecutor()
  await Promise.all(directories.splice(0).map((directory) => executor.cleanup(directory)))
})

describe('DockerExecutor integration', { skip: !runDockerTests }, () => {
  it('compiles and runs the contours tutorial inside the sandbox budget', async () => {
    const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
    const executor = new DockerExecutor({
      image: process.env.OPENCV_RUNNER_IMAGE ?? 'aliouswe/opencv-runner:4.5.4',
      inputImage: path.join(repositoryRoot, 'src/assets/media/images/opencv/armor-field.jpg'),
    })
    const code = `cv::Mat process(const cv::Mat& image)
{
  cv::Mat gray, binary;
  cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
  cv::threshold(gray, binary, 120, 255, cv::THRESH_BINARY);
  std::vector<std::vector<cv::Point>> contours;
  cv::findContours(binary, contours, cv::RETR_EXTERNAL, cv::CHAIN_APPROX_NONE);
  cv::Mat drawing = image.clone();
  for (const auto& contour : contours) {
    if (cv::contourArea(contour) < 20) continue;
    cv::Point2f points[4];
    cv::minAreaRect(contour).points(points);
    for (int i = 0; i < 4; ++i) cv::line(drawing, points[i], points[(i + 1) % 4], {0, 255, 0}, 2);
  }
  return drawing;
}`

    const result = await executor.execute(
      { id: `integration-${process.pid}`, language: 'cpp', code },
      { onState: () => {} },
    )
    if (result.directory) directories.push(result.directory)

    assert.equal(result.status, 'succeeded', result.diagnostics || result.stderr)
    assert.match(result.stdout, /process returned 1280 × 768 with 3 channel\(s\)/)
  })
})
