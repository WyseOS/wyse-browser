
# 文件管理服务与 API 参考（中文）

本文档对文件管理实现进行了总结与分析，涵盖路由、控制器逻辑，以及用于文件存储、监控、归档和清理的 `FileService`。

- **相关文件：**
  - `file.service.ts` — 核心文件服务：保存、下载、列出、删除、归档、清理、文件监控
  - `files.controller.ts` — HTTP 控制器：实现上传/下载/列表/删除/归档行为
  - `files.routes.ts` — Fastify 路由：对外暴露的 HTTP API
  - `files.schema.ts` — OpenAPI 使用的请求/响应 zod schema

---

## 目录

- 概览
- API 端点
- 控制器行为（详述）
- `FileService` 内部实现（详述）
- 安全与校验
- 错误处理与日志
- 并发、性能与资源管理
- 测试与可观测性建议
- 建议改进项

---

## 概览

文件管理子系统支持基于会话的文件上传、下载、列表、删除以及批量归档下载。文件存储在磁盘上的 `baseFilesPath` 下，开发环境使用系统临时目录（`os.tmpdir()/files`），生产环境默认为 `/files`。系统维护一个预构建的 ZIP 归档 `files.zip`，当文件系统发生变化时会触发（防抖）重建，归档端点会优先返回该文件。

主要职责：

- 接收 multipart 上传或通过 URL 下载的请求，并将流持久化到磁盘
- 通过流式读取将文件发送给客户端，并设置正确的 HTTP 头
- 提供文件元数据（大小、最后修改时间）
- 递归列出会话目录下的文件
- 删除单个文件或清理某会话所有文件
- 在文件变更时由 `FileService` 生成并维护预构建 ZIP 归档（`files.zip`）
- 使用 `chokidar` 监控文件系统变化，并对归档重建进行防抖处理


---

## API 端点

所有端点都基于路由前缀 `/sessions/:sessionId`。

- **POST /sessions/:sessionId/files**
  - 目的：上传文件，或传入一个 URL 让服务下载并存储。
  - 输入：`multipart/form-data`，字段 `file`（二进制或 URL 字符串），可选 `path`（存储路径）。
  - 行为：解析 multipart，先将上传内容写入临时文件，验证 `path`，再通过 `FileService.saveFile` 保存到 `baseFilesPath`。
  - 响应：成功返回 200 与 `FileDetails`（{ path, size, lastModified }）；请求不合法返回 400。

- **HEAD /sessions/:sessionId/files/*（通配）**
  - 目的：返回文件的元信息头（Content-Length、Last-Modified、Content-Type）。
  - 响应：200 + 相关头；不存在或错误返回 404/500 等。

- **GET /sessions/:sessionId/files/*（通配）**
  - 目的：下载指定文件作为附件。
  - 行为：流式返回文件，设置 Content-Type、Content-Length、Content-Disposition、Last-Modified 等头。

- **GET /sessions/:sessionId/files**
  - 目的：列出会话下的文件，按 lastModified 降序。
  - 响应：{ data: [ { path, size, lastModified } ] }

- **DELETE /sessions/:sessionId/files/*（通配）**
  - 目的：删除单个文件。
  - 响应：成功返回 204 No Content。

- **DELETE /sessions/:sessionId/files**
  - 目的：删除所有文件并清理临时归档文件。
  - 响应：成功返回 204 No Content。

- **GET /sessions/:sessionId/files.zip**
  - 目的：下载预构建的 `files.zip` 归档（如果存在）；否则返回空的 ZIP 流。
  - 响应：`application/zip` 流。先调用 `FileService.getPrebuiltArchivePath()` 获取路径，若存在则直接返回文件，否则动态生成空归档并返回。

---

## 控制器行为（详述）

文件上传流程（位于 `FilesController.handleFileUpload`）：

- 验证请求为 multipart。
- 使用 `for await (const part of request.parts())` 逐部分解析。
  - 若 `part.fieldname === 'file'` 且 `part.type === 'file'`：将二进制流写入 OS 临时目录下的临时文件。
  - 若 `file` 字段是普通字段（字符串），则把该字符串视为下载 URL。
  - 可选的 `path` 字段作为最终存储路径（需通过 `validatePath` 校验）。
- 若上传的是二进制文件，则从临时文件创建 `readStream` 并调用 `FileService.saveFile` 保存到目标路径。
- 若提供了文件 URL，则 `createStreamFromUrl` 发起 HTTP(S) GET，请求返回的流直接传递给 `saveFile`。
- `saveFile` 返回文件元数据，控制器将其返回给客户端。
- 在成功或出错时确保删除临时文件。

控制器中的关键校验：
- `validatePath` 会拒绝绝对路径、包含 `..`、空字符（NUL）以及归一化后以 `..` 开头的路径。
- 对于通过 URL 下载的文件，会从 URL path 或 `Content-Disposition` 头中提取文件名，并对文件名进行安全字符过滤。

文件下载流程（`handleFileDownload` 与 `handleFileHead`）：
- 委托给 `FileService.downloadFile` / `getFile`，由服务负责路径安全检查与存在性验证。
- 设置相应响应头并流式返回文件内容。

列表（`handleFileList`）与删除端点直接映射到 `FileService.listFiles` / `deleteFile` / `cleanupFiles`。

归档下载（`handleDownloadArchive`）：
- 调用 `FileService.getPrebuiltArchivePath()`，若归档文件存在则直接返回该文件；否则生成并返回一个空的 ZIP 流。

---

## `FileService` 内部实现（详述）

位置：`/services/file.service.ts`

主要职责：
- 管理基础文件目录 `baseFilesPath`，依据环境选择路径：
  - 开发：`os.tmpdir()/files`
  - 生产：`/files`
- 提供单例访问 `FileService.getInstance()`。
- 使用 `chokidar` 监听基础目录的变化，并在变化时调用防抖后的 `_createArchive`。
- 实现核心持久化操作：
  - `saveFile({ filePath, stream })` — 将可读流保存为磁盘文件（相对 `baseFilesPath`），并返回元数据。
  - `downloadFile({ filePath })` — 读取文件状态并返回文件流与元数据。
  - `getFile({ filePath })` — 仅返回元数据。
  - `listFiles()` — 递归遍历 `baseFilesPath`，收集文件及其元数据，并按 `lastModified` 降序排序。
  - `deleteFile({ filePath })` — 删除单个文件（先检查存在与是否为文件）。
  - `cleanupFiles()` — 取消防抖、删除预构建归档目录内的临时文件并删除 `baseFilesPath`，然后重建目录并触发归档创建。
  - `_createArchive()` — 归档创建流程：
    - 在 `prebuiltArchiveDir` 创建临时文件 `files-<timestamp>.zip.tmp`。
    - 使用 `archiver('zip')` 将目录内容打包，若目录缺失或为空则创建空归档。
    - 将归档输出到临时文件并 finalize，完成后将临时文件原子重命名为 `files.zip`。
    - 使用 `isArchiving` 标记并处理流错误、警告和清理工作。

重要内部辅助：
- `getSafeFilePath(relativePath: string)` — 解析并确保最终路径位于 `baseFilesPath` 内（防止路径遍历）。
- `exists(filePath)` — 对 `fs.stat` 的封装，处理 ENOENT 场景。
- 使用 `lodash.debounce` 对归档创建进行防抖（`archiveDebounceTime = 500ms`）。

归档相关的边界与容错：
- 使用临时 `.tmp` 文件并在成功关闭后重命名，以避免对外提供不完整的归档文件。
- 在 `cleanupFiles()` 中清理 `.zip.tmp` 临时归档文件。
- 若 `baseFilesPath` 不存在或不是目录，仍会生成空的 ZIP 归档以保证归档端点可用。

---

## 安全与校验

- 路径遍历防护存在于两个位置：
  - 控制器层的 `validatePath` 防止明显的恶意输入（`..`、绝对路径、NUL 字符）。
  - `FileService.getSafeFilePath` 强制解析后路径以 `baseFilesPath` 为前缀，作为最终的权威检查。
- 上传大小受 `@fastify/multipart` 配置限制，使用 `server.steelBrowserConfig.fileStorage?.maxSizePerSession` 或默认 100 MB。
- 从 URL 派生的文件名会被限制为仅包含 `[A-Za-z0-9._-]` 等安全字符。
- 归档写入仅限于 `prebuiltArchiveDir`（例如 `/tmp/.steel`），减少意外写入敏感路径的风险。

潜在风险/注意事项：
- 若存在并发上传写入同一路径，可能发生竞态写入导致文件损坏（当前没有显式锁）。
- 控制器的 `validatePath` 与服务的 `getSafeFilePath` 是互补的；以服务端的检查为最终准则。

---

## 错误处理与日志

- 关键方法在出错时会使用 `console`（控制台）或控制器内的 `server.log` 记录日志。
- `saveFile` 在写入失败时会尝试清理临时文件，并记录无法删除时的错误。
- `_createArchive` 对流错误、归档错误和警告事件有完整的处理，并在失败时尝试删除临时归档文件。
- 来自底层 `fs` 的错误会被转换为用户友好的消息（例如 `File not found`），但某些底层错误仍会被抛出以便上层处理。

---

## 并发、性能与资源管理

- 文件监控使用 `awaitWriteFinish` 以减少不完整写入引起的事件。
- 归档创建使用了防抖（500ms）以合并短时间内的多次文件系统变化。
- `_createArchive` 通过写入临时文件并重命名完成原子切换，避免暴露半成品归档。
- 上传和下载均使用流式处理：控制器将 multipart 写入临时文件，再流入 `saveFile`；下载使用 `fs.createReadStream`。

并发关注点：
- `isArchiving` 目前仅用于日志告警；若并发触发多次 `_createArchive` 仍可能并行执行，重命名阶段会有竞态风险。当前实现记录警告但不排队或阻止并行。
- 保存文件没有加锁；对同一路径的并发写入可能导致数据损坏。
- 在读取期间删除文件会导致 `downloadFile`/`getFile` 报错，这是底层文件系统行为，需上层处理。

资源考虑：
- 临时上传文件写入 OS tmpdir，若程序崩溃或未能正常清理，可能留下孤立临时文件，直到手动或 `cleanupFiles` 清理。

---

## 测试与可观测性建议

- 为 `getSafeFilePath` 添加单元测试，确保不存在路径遍历绕过。
- 添加集成测试覆盖：通过 URL 上传、二进制上传、列表、删除、归档生成与下载等场景。
- 在 `saveFile` 中记录写入大小与耗时用于发现慢速上传或性能瓶颈。
- 暴露并汇报以下度量指标：
  - 每个会话存储的文件数
  - 归档创建耗时与失败率
  - 文件监控事件的活动频率（events/min）

---

## 建议改进项

- **序列化归档任务**：将当前仅记录警告的 `isArchiving` 行为替换为任务队列或互斥锁，确保同一时间只有一个归档在运行，多余请求入队等待重新触发。
- **保存时使用原子写法**：对目标文件使用临时文件（例如 `<target>.tmp`）写入，写完后原子重命名为目标文件，避免中断时产生不完整文件。
- **文件级锁或版本控制**：避免对同一路径的并发写入导致冲突，或提供明确的覆盖规则（如 `overwrite=true` 时允许覆盖）。
- **按会话配置存储路径**：当前 `baseFilesPath` 为全局目录，考虑按 `sessionId` 分隔存储以实现数据隔离和多租户支持。
- **启动时清理遗留临时文件**：程序启动时扫描 `prebuiltArchiveDir` 与临时上传目录，清理过期或残留的 `.tmp` 文件。
- **切换到结构化日志**：用 `server.log` 或其他结构化日志库替代 `console.*`，方便集中式日志收集与分析。
- **通过 API 暴露归档队列状态**：允许客户端查询归档状态（进行中、最近构建时间、大小），以改善用户体验。

---

## 文件参考

- `file.service.ts` — 核心实现
- `files.controller.ts` — 控制器实现
- `files.routes.ts` — 路由定义
- `files.schema.ts` — zod schema

