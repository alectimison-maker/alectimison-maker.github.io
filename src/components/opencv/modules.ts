import type { OpenCVModule } from './types'

const matCpp = `cv::Mat process(const cv::Mat& image)
{
  // TODO: 返回一份可以安全修改的图像副本。
}
`

const matPython = `def process(image):
    # TODO: 返回一份可以安全修改的图像副本。
    pass
`

const roiResizeCpp = `enum class SpatialView
{
  CenterCrop,
  HalfSize,
};

cv::Mat process(const cv::Mat& image)
{
  // TODO: 切换 CenterCrop 与 HalfSize，比较裁剪和缩放结果。
  constexpr SpatialView view = SpatialView::CenterCrop;
  cv::Mat output;
  if (view == SpatialView::CenterCrop) {
    const cv::Rect roi(image.cols / 4, image.rows / 4, image.cols / 2, image.rows / 2);
    output = image(roi).clone();
  } else {
    cv::resize(image, output, {}, 0.5, 0.5, cv::INTER_AREA);
  }
  return output;
}
`

const roiResizePython = `def process(image):
    # TODO: 切换 "center_crop" 与 "half_size"，比较裁剪和缩放结果。
    view = "center_crop"
    if view == "center_crop":
        height, width = image.shape[:2]
        x, y = width // 4, height // 4
        return image[y:y + height // 2, x:x + width // 2].copy()
    return cv2.resize(image, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
`

const channelsCpp = `cv::Mat process(const cv::Mat& image)
{
  std::vector<cv::Mat> channels;
  // TODO: 按 B、G、R 顺序分离三个颜色通道。

  // TODO: 返回蓝色通道，观察蓝方灯条与场地灯光。
}
`

const channelsPython = `def process(image):
    # TODO 1: 取出 BGR 中下标为 0 的蓝色通道。
    blue = None
    # TODO 2: 返回一份独立的单通道图像。
    pass
`

const filtersCpp = `enum class FilterType
{
  Mean,
  Gaussian,
  Median,
  Bilateral,
};

cv::Mat process(const cv::Mat& image)
{
  constexpr int kernelSize = 9;
  // TODO: 在 Mean、Gaussian、Median、Bilateral 之间切换并比较结果。
  constexpr FilterType filterType = FilterType::Mean;

  cv::Mat filtered;
  switch (filterType) {
    case FilterType::Mean:
      cv::blur(image, filtered, {kernelSize, kernelSize});
      break;
    case FilterType::Gaussian:
      cv::GaussianBlur(image, filtered, {kernelSize, kernelSize}, 0);
      break;
    case FilterType::Median:
      cv::medianBlur(image, filtered, kernelSize);
      break;
    case FilterType::Bilateral:
      cv::bilateralFilter(image, filtered, kernelSize, 50, 50);
      break;
  }
  return filtered;
}
`

const filtersPython = `def process(image):
    kernel_size = 9
    # TODO: 在 "mean"、"gaussian"、"median"、"bilateral" 之间切换并比较结果。
    filter_type = "mean"

    if filter_type == "mean":
        return cv2.blur(image, (kernel_size, kernel_size))
    if filter_type == "gaussian":
        return cv2.GaussianBlur(image, (kernel_size, kernel_size), 0)
    if filter_type == "median":
        return cv2.medianBlur(image, kernel_size)
    if filter_type == "bilateral":
        return cv2.bilateralFilter(image, kernel_size, 50, 50)
    raise ValueError("unknown filter type")
`

const gaussianParamsCpp = `cv::Mat process(const cv::Mat& image)
{
  // TODO: 只改变 kernelSize 或 sigma，分开观察它们对高斯滤波的影响。
  constexpr int kernelSize = 3;
  constexpr double sigma = 0.0;

  cv::Mat filtered;
  cv::GaussianBlur(
      image,
      filtered,
      {kernelSize, kernelSize},
      sigma
  );
  return filtered;
}
`

const gaussianParamsPython = `def process(image):
    # TODO: 只改变 kernel_size 或 sigma，分开观察它们对高斯滤波的影响。
    kernel_size = 3
    sigma = 0.0
    return cv2.GaussianBlur(
        image,
        (kernel_size, kernel_size),
        sigma
    )
`

const thresholdCpp = `cv::Mat process(const cv::Mat& image)
{
  cv::Mat gray;
  cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
  cv::GaussianBlur(gray, gray, {3, 3}, 0);

  cv::Mat binary;
  // TODO: 在 120、150、180 中选择阈值并比较保留下来的区域。
  constexpr double thresholdValue = 120.0;
  cv::threshold(gray, binary, thresholdValue, 255, cv::THRESH_BINARY);

  return binary;
}
`

const thresholdPython = `def process(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    # TODO: 在 120、150、180 中选择阈值并比较保留下来的区域。
    threshold_value = 120
    _, binary = cv2.threshold(gray, threshold_value, 255, cv2.THRESH_BINARY)
    return binary
`

const morphologyCpp = `cv::Mat process(const cv::Mat& image)
{
  cv::Mat gray, binary;
  cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
  cv::GaussianBlur(gray, gray, {3, 3}, 0);
  cv::threshold(gray, binary, 150, 255, cv::THRESH_BINARY);

  // TODO 1: 创建 3 × 3 的矩形结构元素。
  cv::Mat kernel;
  // TODO 2: 用开运算去掉小型高亮噪声。

  return binary;
}
`

const morphologyPython = `def process(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    # TODO 1: 创建 3 × 3 的矩形结构元素。
    kernel = None
    # TODO 2: 用开运算去掉小型高亮噪声。
    return binary
`

const contoursCpp = `cv::Mat process(const cv::Mat& image)
{
  cv::Mat gray, binary;
  cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
  cv::GaussianBlur(gray, gray, {3, 3}, 0);
  cv::threshold(gray, binary, 150, 255, cv::THRESH_BINARY);
  const auto kernel = cv::getStructuringElement(cv::MORPH_RECT, {3, 3});
  cv::morphologyEx(binary, binary, cv::MORPH_OPEN, kernel);

  std::vector<std::vector<cv::Point>> contours;
  // TODO 1: 只寻找最外层轮廓。

  cv::Mat drawing = image.clone();
  // TODO 2: 为面积大于 20 的轮廓绘制最小外接旋转矩形。

  return drawing;
}
`

const contoursPython = `def process(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    # TODO 1: 只寻找最外层轮廓。
    contours = []
    drawing = image.copy()
    # TODO 2: 为面积大于 20 的轮廓绘制最小外接旋转矩形。
    return drawing
`

const lightbarsCpp = `cv::Mat process(const cv::Mat& image)
{
  cv::Mat gray, binary;
  cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
  cv::GaussianBlur(gray, gray, {3, 3}, 0);
  cv::threshold(gray, binary, 150, 255, cv::THRESH_BINARY);
  const auto kernel = cv::getStructuringElement(cv::MORPH_RECT, {3, 3});
  cv::morphologyEx(binary, binary, cv::MORPH_OPEN, kernel);
  std::vector<std::vector<cv::Point>> contours;
  cv::findContours(binary, contours, cv::RETR_EXTERNAL, cv::CHAIN_APPROX_NONE);

  cv::Mat drawing = image.clone();
  struct Lightbar { cv::RotatedRect rect; bool is_red; float length; float angle; };
  std::vector<Lightbar> lightbars;
  for (const auto& contour : contours) {
    if (cv::contourArea(contour) < 20) continue;
    auto rect = cv::minAreaRect(contour);
    // TODO 1: 检查长宽比、长度、角度与颜色置信度，并收集合格候选。
  }
  // TODO 2: 只绘制能组成合理同色配对的候选灯条。
  return drawing;
}
`

const lightbarsPython = `def process(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    drawing = image.copy()
    lightbars = []
    for contour in contours:
        if cv2.contourArea(contour) < 20:
            continue
        rect = cv2.minAreaRect(contour)
        # TODO 1: 检查长宽比、长度、角度与颜色置信度，并收集合格候选。
    # TODO 2: 只绘制能组成合理同色配对的候选灯条。
    return drawing
`

const pairingCpp = `cv::Mat process(const cv::Mat& image)
{
  cv::Mat gray, binary;
  cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
  cv::GaussianBlur(gray, gray, {3, 3}, 0);
  cv::threshold(gray, binary, 150, 255, cv::THRESH_BINARY);
  const auto kernel = cv::getStructuringElement(cv::MORPH_RECT, {3, 3});
  cv::morphologyEx(binary, binary, cv::MORPH_OPEN, kernel);
  std::vector<std::vector<cv::Point>> contours;
  cv::findContours(binary, contours, cv::RETR_EXTERNAL, cv::CHAIN_APPROX_NONE);

  struct Lightbar { cv::RotatedRect rect; bool is_red; float length; float angle; };
  std::vector<Lightbar> lightbars;
  for (const auto& contour : contours) {
    if (cv::contourArea(contour) < 20) continue;
    auto rect = cv::minAreaRect(contour);
    const float length = std::max(rect.size.width, rect.size.height);
    const float width = std::min(rect.size.width, rect.size.height);
    if (width <= 0) continue;
    const float ratio = length / width;
    cv::Point2f points[4];
    rect.points(points);
    const auto edge0 = points[1] - points[0];
    const auto edge1 = points[2] - points[1];
    const auto axis = cv::norm(edge0) > cv::norm(edge1) ? edge0 : edge1;
    const float angle = std::atan2(std::abs(axis.x), std::abs(axis.y)) * 180.0f / CV_PI;
    if (ratio <= 1.8f || ratio >= 15.0f || length <= 8.0f || angle >= 35.0f) continue;
    double blueSum = 0, redSum = 0;
    for (const auto& point : contour) {
      const auto pixel = image.at<cv::Vec3b>(point);
      blueSum += pixel[0];
      redSum += pixel[2];
    }
    const double colorConfidence = std::abs(redSum - blueSum) / (redSum + blueSum + 1.0);
    if (colorConfidence < 0.08) continue;
    lightbars.push_back({rect, redSum > blueSum, length, angle});
  }
  std::sort(lightbars.begin(), lightbars.end(), [](const auto& a, const auto& b) {
    return a.rect.center.x < b.rect.center.x;
  });

  cv::Mat drawing = image.clone();
  // TODO: 配对高度、纵向位置相近的灯条，并框出候选装甲板。
  return drawing;
}
`

const pairingPython = `def process(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    lightbars = []
    for contour in contours:
        if cv2.contourArea(contour) < 20:
            continue
        rect = cv2.minAreaRect(contour)
        length, width = max(rect[1]), min(rect[1])
        if width <= 0:
            continue
        box = cv2.boxPoints(rect)
        edges = [box[(i + 1) % 4] - box[i] for i in range(4)]
        axis = max(edges, key=lambda edge: float(np.dot(edge, edge)))
        angle = float(np.degrees(np.arctan2(abs(axis[0]), abs(axis[1]))))
        ratio = length / width
        if ratio <= 1.8 or ratio >= 15.0 or length <= 8.0 or angle >= 35.0:
            continue
        pixels = image[contour[:, 0, 1], contour[:, 0, 0]]
        blue_sum = float(pixels[:, 0].sum())
        red_sum = float(pixels[:, 2].sum())
        color_confidence = abs(red_sum - blue_sum) / (red_sum + blue_sum + 1.0)
        if color_confidence < 0.08:
            continue
        lightbars.append((rect, red_sum > blue_sum, length, angle))
    lightbars.sort(key=lambda item: item[0][0][0])
    drawing = image.copy()
    # TODO: 配对高度、纵向位置相近的灯条，并框出候选装甲板。
    return drawing
`

export const OPEN_CV_MODULES: Record<string, OpenCVModule> = {
  mat: {
    id: 'mat',
    title: '实验 1 · 安全地复制 cv::Mat',
    prompt: '返回输入图像的深拷贝。直接返回共享数据虽然也能显示，但后续原地操作会污染输入。',
    hints: ['cv::Mat 的 copyTo 或 clone 都会复制像素数据。', '这个练习只需要一行 return image.clone();。'],
    cpp: { template: matCpp, solution: matCpp.replace('  // TODO: 返回一份可以安全修改的图像副本。', '  return image.clone();') },
    python: { template: matPython, solution: matPython.replace('    # TODO: 返回一份可以安全修改的图像副本。\n    pass', '    return image.copy()') },
  },
  'roi-resize': {
    id: 'roi-resize',
    title: '实验 3 · ROI 裁剪与图像缩放',
    prompt: '先查看图像中心区域的裁剪结果，再切换到半尺寸缩放。观察局部细节和远处灯条像素尺寸的变化。',
    hints: ['中心 ROI 使用图像宽、高的一半，左上角从宽、高的四分之一处开始；裁剪后用 clone() 得到独立图像。', '缩小图像时保持宽高比例，并用 INTER_AREA；缩小后要重新检查最短灯条长度和轮廓面积阈值。'],
    cpp: {
      template: roiResizeCpp,
      solution: roiResizeCpp.replace(
        '  // TODO: 切换 CenterCrop 与 HalfSize，比较裁剪和缩放结果。',
        '  // 先运行 CenterCrop，再改为 HalfSize 比较两种结果。',
      ),
      answerHighlights: [{ start: 'constexpr SpatialView view =' }],
    },
    python: {
      template: roiResizePython,
      solution: roiResizePython.replace(
        '    # TODO: 切换 "center_crop" 与 "half_size"，比较裁剪和缩放结果。',
        '    # 先运行 center_crop，再改为 half_size 比较两种结果。',
      ),
      answerHighlights: [{ start: 'view = "center_crop"' }],
    },
  },
  channels: {
    id: 'channels',
    title: '实验 4 · 拆分 BGR 通道',
    prompt: '把彩色图拆成三个单通道矩阵，先确认 OpenCV 的通道顺序，再观察蓝色通道中的灯条与场地干扰。',
    hints: ['cv::split(image, channels) 后，channels[0]、[1]、[2] 依次是 B、G、R。', '尝试分别返回三个通道；亮度高只说明该通道响应强，不等于目标已经被识别。'],
    cpp: {
      template: channelsCpp,
      solution: channelsCpp
        .replace('  // TODO: 按 B、G、R 顺序分离三个颜色通道。', '  cv::split(image, channels);')
        .replace('  // TODO: 返回蓝色通道，观察蓝方灯条与场地灯光。', '  return channels[0].clone();'),
    },
    python: {
      template: channelsPython,
      solution: channelsPython
        .replace('    # TODO 1: 取出 BGR 中下标为 0 的蓝色通道。\n    blue = None', '    blue = image[:, :, 0]')
        .replace('    # TODO 2: 返回一份独立的单通道图像。\n    pass', '    return blue.copy()'),
    },
  },
  filters: {
    id: 'filters',
    title: '实验 5A · 滤波方法比较',
    prompt: '固定输入与核尺寸，只在均值、高斯、中值和双边滤波之间切换，比较不同邻域规则产生的结果。',
    hints: ['修改 filterType（Python 中为 filter_type），依次运行 Mean、Gaussian、Median 和 Bilateral。', '再比较 3、9、15 三种奇数核尺寸；不要只看画面是否干净，还要观察细灯条的宽度、亮度与边界。'],
    cpp: {
      template: filtersCpp,
      solution: filtersCpp.replace(
        '  // TODO: 在 Mean、Gaussian、Median、Bilateral 之间切换并比较结果。\n  constexpr FilterType filterType = FilterType::Mean;',
        '  constexpr FilterType filterType = FilterType::Gaussian;',
      ),
    },
    python: {
      template: filtersPython,
      solution: filtersPython.replace(
        '    # TODO: 在 "mean"、"gaussian"、"median"、"bilateral" 之间切换并比较结果。\n    filter_type = "mean"',
        '    filter_type = "gaussian"',
      ),
    },
  },
  'gaussian-params': {
    id: 'gaussian-params',
    title: '实验 5B · 高斯滤波参数',
    prompt: '保持高斯滤波方法不变，分别调节核尺寸与 sigma，观察平滑强度、灯条亮度和边缘位置的变化。',
    hints: ['先固定 sigma = 0，依次比较 3 × 3、9 × 9 和 15 × 15；核尺寸必须是正奇数。', '再固定核尺寸，只比较 sigma = 0.8、2.0 和 4.0；每次只改变一个变量。'],
    cpp: {
      template: gaussianParamsCpp,
      solution: gaussianParamsCpp.replace(
        '  // TODO: 只改变 kernelSize 或 sigma，分开观察它们对高斯滤波的影响。\n  constexpr int kernelSize = 3;',
        '  constexpr int kernelSize = 9;',
      ),
      answerHighlights: [
        { start: 'constexpr int kernelSize =' },
        { start: 'constexpr double sigma =' },
      ],
    },
    python: {
      template: gaussianParamsPython,
      solution: gaussianParamsPython.replace(
        '    # TODO: 只改变 kernel_size 或 sigma，分开观察它们对高斯滤波的影响。\n    kernel_size = 3',
        '    kernel_size = 9',
      ),
      answerHighlights: [
        { start: 'kernel_size =' },
        { start: 'sigma =' },
      ],
    },
  },
  threshold: {
    id: 'threshold',
    title: '实验 6 · 灰度化与阈值选择',
    prompt: '改变阈值，比较目标灯条、数字笔画、墙面反光和远处小目标之间的取舍。',
    hints: ['依次尝试 120、150、180：阈值越高，候选通常越少，但弱灯条也更容易消失。', '这张固定图在 150 附近较均衡；真实相机仍应结合曝光和一组样本重新标定。'],
    cpp: {
      template: thresholdCpp,
      solution: thresholdCpp.replace('  // TODO: 在 120、150、180 中选择阈值并比较保留下来的区域。\n  constexpr double thresholdValue = 120.0;', '  constexpr double thresholdValue = 150.0;'),
      answerHighlights: [
        { start: 'cv::cvtColor(' },
        { start: 'constexpr double thresholdValue =' },
        { start: 'cv::threshold(' },
      ],
    },
    python: {
      template: thresholdPython,
      solution: thresholdPython.replace('    # TODO: 在 120、150、180 中选择阈值并比较保留下来的区域。\n    threshold_value = 120', '    threshold_value = 150'),
      answerHighlights: [
        { start: 'gray = cv2.cvtColor(' },
        { start: 'threshold_value =' },
        { start: '_, binary = cv2.threshold(' },
      ],
    },
  },
  morphology: {
    id: 'morphology',
    title: '实验 7 · 用形态学清理二值图',
    prompt: '对二值图做开运算，先腐蚀再膨胀，去掉比结构元素更小的高亮噪声。',
    hints: ['getStructuringElement(MORPH_RECT, {3, 3}) 会创建矩形结构元素。', '把核改为 5 × 5 或 7 × 7：噪声会减少，但远处细灯条也可能被一起删除。'],
    cpp: {
      template: morphologyCpp,
      solution: morphologyCpp
        .replace('  // TODO 1: 创建 3 × 3 的矩形结构元素。\n  cv::Mat kernel;', '  cv::Mat kernel = cv::getStructuringElement(cv::MORPH_RECT, {3, 3});')
        .replace('  // TODO 2: 用开运算去掉小型高亮噪声。', '  cv::morphologyEx(binary, binary, cv::MORPH_OPEN, kernel);'),
    },
    python: {
      template: morphologyPython,
      solution: morphologyPython
        .replace('    # TODO 1: 创建 3 × 3 的矩形结构元素。\n    kernel = None', '    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))')
        .replace('    # TODO 2: 用开运算去掉小型高亮噪声。\n    return binary', '    return cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)'),
    },
  },
  contours: {
    id: 'contours',
    title: '实验 8 · 轮廓与旋转矩形',
    prompt: '寻找二值图中的外轮廓，并用最小外接旋转矩形观察候选高亮区域。',
    hints: ['findContours 使用 RETR_EXTERNAL 与 CHAIN_APPROX_NONE。', 'RotatedRect::points 可以写入四个 Point2f，再逐边 cv::line。'],
    cpp: {
      template: contoursCpp,
      solution: contoursCpp.replace('  // TODO 1: 只寻找最外层轮廓。', '  cv::findContours(binary, contours, cv::RETR_EXTERNAL, cv::CHAIN_APPROX_NONE);').replace('  // TODO 2: 为面积大于 20 的轮廓绘制最小外接旋转矩形。', `  for (const auto& contour : contours) {
    if (cv::contourArea(contour) < 20) continue;
    cv::Point2f points[4];
    cv::minAreaRect(contour).points(points);
    for (int i = 0; i < 4; ++i) cv::line(drawing, points[i], points[(i + 1) % 4], {0, 255, 0}, 2);
  }`),
      answerHighlights: [
        { start: 'cv::findContours(' },
        { start: 'for (const auto& contour : contours) {', end: '  }' },
      ],
    },
    python: {
      template: contoursPython,
      solution: contoursPython.replace('    # TODO 1: 只寻找最外层轮廓。\n    contours = []', '    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)').replace('    # TODO 2: 为面积大于 20 的轮廓绘制最小外接旋转矩形。', `    for contour in contours:
        if cv2.contourArea(contour) < 20:
            continue
        box = np.int32(cv2.boxPoints(cv2.minAreaRect(contour)))
        cv2.polylines(drawing, [box], True, (0, 255, 0), 2)`),
      answerHighlights: [
        { start: 'contours, _ = cv2.findContours(' },
        { start: 'for contour in contours:', end: 'cv2.polylines(' },
      ],
    },
  },
  lightbars: {
    id: 'lightbars',
    title: '实验 9 · 灯条几何与颜色置信度',
    prompt: '同时约束轮廓形状、方向和红蓝颜色置信度，并用同色灯条的几何配对关系抑制孤立干扰。',
    hints: ['先用 1.8–15、最短长度 8、最大倾角 35°；再逐项收紧，观察漏检从哪一步开始。', '沿轮廓采样红蓝通道；只有找到长度、间距、高度和倾角合理的同色伙伴，才显示为有效灯条。'],
    cpp: {
      template: lightbarsCpp,
      solution: lightbarsCpp
        .replace('    // TODO 1: 检查长宽比、长度、角度与颜色置信度，并收集合格候选。', `    const float length = std::max(rect.size.width, rect.size.height);
    const float width = std::min(rect.size.width, rect.size.height);
    if (width <= 0) continue;
    const float ratio = length / width;
    cv::Point2f points[4];
    rect.points(points);
    const auto edge0 = points[1] - points[0];
    const auto edge1 = points[2] - points[1];
    const auto axis = cv::norm(edge0) > cv::norm(edge1) ? edge0 : edge1;
    const float angle = std::atan2(std::abs(axis.x), std::abs(axis.y)) * 180.0f / CV_PI;
    if (ratio <= 1.8f || ratio >= 15.0f || length <= 8.0f || angle >= 35.0f) continue;
    double blueSum = 0, redSum = 0;
    for (const auto& point : contour) {
      const auto pixel = image.at<cv::Vec3b>(point);
      blueSum += pixel[0];
      redSum += pixel[2];
    }
    const double confidence = std::abs(redSum - blueSum) / (redSum + blueSum + 1.0);
    if (confidence < 0.08) continue;
    lightbars.push_back({rect, redSum > blueSum, length, angle});`)
        .replace('  // TODO 2: 只绘制能组成合理同色配对的候选灯条。', `  std::vector<bool> supported(lightbars.size(), false);
  for (std::size_t i = 0; i < lightbars.size(); ++i) {
    for (std::size_t j = i + 1; j < lightbars.size(); ++j) {
      const auto& left = lightbars[i];
      const auto& right = lightbars[j];
      if (left.is_red != right.is_red) continue;
      const float averageLength = (left.length + right.length) / 2.0f;
      const float lengthRatio = std::max(left.length, right.length) / std::min(left.length, right.length);
      const float distanceRatio = std::abs(left.rect.center.x - right.rect.center.x) / averageLength;
      const float yDifferenceRatio = std::abs(left.rect.center.y - right.rect.center.y) / averageLength;
      const float angleDifference = std::abs(left.angle - right.angle);
      if (lengthRatio > 1.4f || distanceRatio < 1.5f || distanceRatio > 4.0f) continue;
      if (yDifferenceRatio > 0.25f || angleDifference > 10.0f) continue;
      supported[i] = supported[j] = true;
    }
  }
  for (std::size_t i = 0; i < lightbars.size(); ++i) {
    if (!supported[i]) continue;
    cv::Point2f points[4];
    lightbars[i].rect.points(points);
    const cv::Scalar color = lightbars[i].is_red ? cv::Scalar(0, 0, 255) : cv::Scalar(255, 0, 0);
    for (int j = 0; j < 4; ++j) cv::line(drawing, points[j], points[(j + 1) % 4], color, 2);
  }`),
    },
    python: {
      template: lightbarsPython,
      solution: lightbarsPython
        .replace('        # TODO 1: 检查长宽比、长度、角度与颜色置信度，并收集合格候选。', `        length, width = max(rect[1]), min(rect[1])
        if width <= 0:
            continue
        box = cv2.boxPoints(rect)
        edges = [box[(i + 1) % 4] - box[i] for i in range(4)]
        axis = max(edges, key=lambda edge: float(np.dot(edge, edge)))
        angle = float(np.degrees(np.arctan2(abs(axis[0]), abs(axis[1]))))
        ratio = length / width
        if ratio <= 1.8 or ratio >= 15.0 or length <= 8.0 or angle >= 35.0:
            continue
        pixels = image[contour[:, 0, 1], contour[:, 0, 0]]
        blue_sum = float(pixels[:, 0].sum())
        red_sum = float(pixels[:, 2].sum())
        confidence = abs(red_sum - blue_sum) / (red_sum + blue_sum + 1.0)
        if confidence < 0.08:
            continue
        lightbars.append((rect, red_sum > blue_sum, length, angle))`)
        .replace('    # TODO 2: 只绘制能组成合理同色配对的候选灯条。', `    supported = set()
    for i, (left, left_is_red, left_length, left_angle) in enumerate(lightbars):
        for j in range(i + 1, len(lightbars)):
            right, right_is_red, right_length, right_angle = lightbars[j]
            if left_is_red != right_is_red:
                continue
            average_length = (left_length + right_length) / 2.0
            length_ratio = max(left_length, right_length) / min(left_length, right_length)
            distance_ratio = abs(right[0][0] - left[0][0]) / average_length
            y_difference_ratio = abs(left[0][1] - right[0][1]) / average_length
            angle_difference = abs(left_angle - right_angle)
            if length_ratio > 1.4 or distance_ratio < 1.5 or distance_ratio > 4.0:
                continue
            if y_difference_ratio > 0.25 or angle_difference > 10.0:
                continue
            supported.update((i, j))
    for index in sorted(supported):
        rect, is_red, _, _ = lightbars[index]
        box = np.int32(cv2.boxPoints(rect))
        color = (0, 0, 255) if is_red else (255, 0, 0)
        cv2.polylines(drawing, [box], True, color, 2)`),
    },
  },
  pairing: {
    id: 'pairing',
    title: '实验 10 · 配对并框出装甲板',
    prompt: '把同色且长度、方向、纵向位置与间距都相近的灯条配对，得到几何候选装甲板。',
    hints: ['本图可先试：长度比 ≤ 1.4、间距为平均长度的 1.5–4 倍、纵向差 ≤ 0.25、角度差 ≤ 10°。', '逐个放宽参数并观察新增误检；这些值是样本上的起点，不应被当成跨相机的固定真理。'],
    cpp: {
      template: pairingCpp,
      solution: pairingCpp.replace('  // TODO: 配对高度、纵向位置相近的灯条，并框出候选装甲板。', `  for (std::size_t i = 0; i < lightbars.size(); ++i) {
    for (std::size_t j = i + 1; j < lightbars.size(); ++j) {
      const auto& left = lightbars[i];
      const auto& right = lightbars[j];
      if (left.is_red != right.is_red) continue;
      const float averageLength = (left.length + right.length) / 2.0f;
      const float lengthRatio = std::max(left.length, right.length) / std::min(left.length, right.length);
      const float distanceRatio = (right.rect.center.x - left.rect.center.x) / averageLength;
      const float yDifferenceRatio = std::abs(left.rect.center.y - right.rect.center.y) / averageLength;
      const float angleDifference = std::abs(left.angle - right.angle);
      if (lengthRatio > 1.4f || distanceRatio < 1.5f || distanceRatio > 4.0f) continue;
      if (yDifferenceRatio > 0.25f || angleDifference > 10.0f) continue;
      cv::rectangle(drawing, left.rect.boundingRect() | right.rect.boundingRect(), {0, 255, 0}, 3);
    }
  }`),
    },
    python: {
      template: pairingPython,
      solution: pairingPython.replace('    # TODO: 配对高度、纵向位置相近的灯条，并框出候选装甲板。', `    for i, (left, left_is_red, left_length, left_angle) in enumerate(lightbars):
        for right, right_is_red, right_length, right_angle in lightbars[i + 1:]:
            if left_is_red != right_is_red:
                continue
            average_length = (left_length + right_length) / 2.0
            length_ratio = max(left_length, right_length) / min(left_length, right_length)
            distance_ratio = (right[0][0] - left[0][0]) / average_length
            y_difference_ratio = abs(left[0][1] - right[0][1]) / average_length
            angle_difference = abs(left_angle - right_angle)
            if length_ratio > 1.4 or distance_ratio < 1.5 or distance_ratio > 4.0:
                continue
            if y_difference_ratio > 0.25 or angle_difference > 10.0:
                continue
            points = np.vstack((cv2.boxPoints(left), cv2.boxPoints(right)))
            x, y, w, h = cv2.boundingRect(np.int32(points))
            cv2.rectangle(drawing, (x, y), (x + w, y + h), (0, 255, 0), 3)`),
    },
  },
}
