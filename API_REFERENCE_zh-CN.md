## API 参考 📚

### 基础 URL

```
http://127.0.0.1:13100
```

### 健康检查 💖

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | 检查 API 服务器是否正在运行。 | _无_ |

### 元数据管理 🗃️

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/metadata/flow/:name` | 检索特定流程的清单。 | **路径**: `name` (字符串, 必填) |
| `GET` | `/api/metadata/worklet/:name` | 检索特定工作单元的清单。 | **路径**: `name` (字符串, 必填) |
| `GET` | `/api/metadata/list/:type` | 列出给定类型（`flow` 或 `worklet`）的所有可用元数据。 | **路径**: `type` (字符串, 必填) - `flow` 或 `worklet` |
| `POST` | `/api/metadata/save` | 保存或更新流程清单。 | **请求体**: `UpdateMetadataDto`<br>- `metadata_type` (字符串, 必填)<br>- `name` (字符串, 必填)<br>- `data` (对象, 必填) |

### 会话管理 📈

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/session/create` | 创建新的浏览器会话。 | **请求体**: `CreateSessionDto`<br>- `session_context` (对象, 可选)<br>- `session_id` (字符串, 可选)<br>- `user_id` (字符串, 可选) |
| `POST` | `/api/session/:sessionId/add_init_script` | 向会话添加初始化脚本。 | **路径**: `sessionId` (字符串, 必填)<br>**请求体**: `AddInitScriptDto`<br>- `script` (字符串, 必填) |
| `GET` | `/api/session/:sessionId` | 检索特定会话的详细信息。 | **路径**: `sessionId` (字符串, 必填) |
| `GET` | `/api/session/:sessionId/context` | 获取会话的上下文（cookies、本地存储）。 | **路径**: `sessionId` (字符串, 必填) |
| `GET` | `/api/session/:sessionId/release` | 关闭并清理会话。 | **路径**: `sessionId` (字符串, 必填) |
| `GET` | `/api/sessions/list` | 列出所有活动会话。 | _无_ |
| `GET` | `/api/session/:sessionId/screenshot` | 在会话中截取当前页面的屏幕截图。 | **路径**: `sessionId` (字符串, 必填) |
| `GET` | `/api/fingerprint/generate` | 生成一个随机的指纹。 | _无_ |

### 浏览器操作 🎬

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/browser/action` | 执行单个浏览器操作（例如，`click`，`text`）。 | **请求体**: `BrowserActionDto`<br>- `session_id` (字符串, 必填)<br>- `page_id` (数字, 可选, 默认: 0)<br>- `action_name` (字符串, 必填)<br>- `data` (对象, 必填) |
| `POST` | `/api/browser/batch_actions` | 顺序执行一批浏览器操作。 | **请求体**: `BatchActionsDto`<br>- `session_id` (字符串, 必填)<br>- `page_id` (数字, 可选, 默认: 0)<br>- `actions` (数组, 必填):<br>  - `action_name` (字符串, 必填)<br>  - `data` (对象, 必填) |

### 页面管理 📄

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/session/:sessionId/page/create` | 在会话中创建新页面（选项卡）。 | **路径**: `sessionId` (字符串, 必填) |
| `GET` | `/api/session/:sessionId/page/:pageId/switch` | 切换会话中的活动页面。 | **路径**:<br>- `sessionId` (字符串, 必填)<br>- `pageId` (数字, 必填) |
| `GET` | `/api/session/:sessionId/page/:pageId/release` | 关闭会话中的特定页面。 | **路径**:<br>- `sessionId` (字符串, 必填)<br>- `pageId` (数字, 必填) |

### 流程管理 🌊

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/flow/create` | 从预定义的清单创建新的流程实例。 | **请求体**: `CreateFlowDto`<br>- `flow_name` (字符串, 必填)<br>- `session_id` (字符串, 可选)<br>- `user_id` (字符串, 可选)<br>- `is_save_video` (布尔值, 可选)<br>- `extension_names` (字符串数组, 可选) |
| `POST` | `/api/flow/deploy` | 使用内联 JSON 定义部署新流程。 | **请求体**: `DeployFlowDto`<br>- `flow` (对象, 必填)<br>- `session_id` (字符串, 可选)<br>- `user_id` (字符串, 可选)<br>- `is_save_video` (布尔值, 可选)<br>- `extension_names` (字符串数组, 可选) |
| `POST` | `/api/flow/fire` | 在运行中的流程实例中执行操作。 | **请求体**: `FireFlowDto`<br>- `flow_instance_id` (字符串, 必填)<br>- `action_name` (字符串, 可选, 默认: `action_flow_start`)<br>- `data` (对象, 必填) |
| `GET` | `/api/flow/list` | 列出所有活动的流程实例。 | _无_ |

### 文件管理 📁

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/session/:sessionId/files` | 上传一个或多个文件到会话的OSS存储空间，并检查会话存储限制。 | **路径**: `sessionId` (字符串, 必填)<br>**请求体**: `filePath` (字符串, 可选) - 文件的目标路径，默认为原始文件名。 |
| `GET` | `/api/session/:sessionId/files` | 列出特定会话中存储在OSS的所有文件，包括浏览器自动下载的文件。 | **路径**: `sessionId` (字符串, 必填) |
| `GET` | `/api/session/:sessionId/files/*` | 从OSS下载会话的特定文件。 | **路径**:<br>- `sessionId` (字符串, 必填)<br>- `filePath` (字符串, 必填) |
| `HEAD` | `/api/session/:sessionId/files/*` | 检索OSS中特定文件的元数据（标头），而不下载内容。 | **路径**:<br>- `sessionId` (字符串, 必填)<br>- `filePath` (字符串, 必填) |
| `DELETE` | `/api/session/:sessionId/files/*` | 从OSS中删除会话的特定文件。 | **路径**:<br>- `sessionId` (字符串, 必填)<br>- `filePath` (字符串, 必填) |
| `DELETE` | `/api/session/:sessionId/files` | 删除与特定会话关联的OSS中的所有文件。 | **路径**: `sessionId` (字符串, 必填) |

**文件存储说明**：
- 浏览器下载的文件会自动流式上传到阿里云OSS，无本地存储
- 所有文件通过OSS路径前缀实现会话级别隔离 (`session/{sessionId}/`)
- 支持通过CDN公网地址直接访问文件
- 文件名采用UUID格式，确保唯一性和安全性

## 操作空间 🚀

`BrowserAction` 模块提供了一套全面的低级操作，可在会话中的页面上执行。这些操作是创建复杂自动化流程的基本构建块。

| Action | Description | Parameters |
| :--- | :--- | :--- |
| `url` | 获取当前页面的 URL。 | _无_ |
| `visit` | 将页面导航到指定的 URL。 | `url`: 要访问的 URL。 |
| `history` | 在浏览器历史记录中向前或向后导航。 | `num`: 正数表示前进，负数表示后退。 |
| `search` | 执行 Google 搜索。 | `search_key`: 要搜索的文本。 |
| `refreshpage` | 重新加载当前页面。 | _无_ |
| `click` | 点击页面上的元素或坐标。 | `element_id` 或 (`x`, `y` 坐标)。 |
| `clickfull` | 更全面的点击操作。 | `element_id` 或 (`x`, `y` 坐标)。可选: `hold` (秒), `button` ("left", "right", "middle")。 |
| `doubleclick` | 双击页面上的元素或坐标。 | `element_id` 或 (`x`, `y` 坐标)。 |
| `text` | 在元素中或当前光标位置输入文本。 | `text`: 要输入的文本。可选: `element_id`, `press_enter` (布尔值), `delete_existing_text` (布尔值), 或 (`x`, `y` 坐标)。 |
| `scrollup` | 向上滚动页面。 | _无_ |
| `scrolldown` | 向下滚动页面。 | _无_ |
| `scrollelementup` | 向上滚动元素的容器。 | `element_id`, `page_number`: 滚动页数。 |
| `scrollelementdown` | 向下滚动元素的容器。 | `element_id`, `page_number`: 滚动页数。 |
| `scrollto` | 滚动使元素可见。 | `element_id`: 要滚动到的元素 ID。 |
| `wait` | 暂停执行指定持续时间。 | `time`: 等待的秒数。 |
| `keypress` | 模拟按键。 | `keys`: 要按下的键的字符串或字符串数组（例如，'Enter'，'Control+A'）。 |
| `hover` | 悬停在页面上的元素或坐标上。 | `element_id` 或 (`x`, `y` 坐标)。 |
| `evaluate` | 在页面上下文中执行 JavaScript 片段。 | `script`: 要执行的 JavaScript 代码。 |
| `initjs` | 将初始化 JavaScript 注入页面。 | _无_ |
| `waitforloadstate` | 等待页面达到特定的加载状态。 | _无_ |
| `content` | 获取页面的完整 HTML 内容。 | _无_ |
| `createtab` | 创建新的浏览器选项卡。 | 可选: `url`: 要在新选项卡中打开的 URL。 |
| `switchtab` | 切换到不同的选项卡。 | `tab_index`: 要切换到的选项卡索引。 |
| `closetab` | 关闭浏览器选项卡。 | `tab_index`: 要关闭的选项卡索引。 |
| `tabsinfo` | 检索所有打开选项卡的信息。 | _无_ |
| `cleanupanimations` | 从页面中删除动画以稳定测试。 | _无_ |
| `previewaction` | 突出显示元素以预览操作而不执行它。 | `element_id`: 要预览的元素 ID。 |
| `setcontent` | 设置页面的 HTML 内容。 | `content`: 要设置的 HTML 内容。 |
| `ensurepageready` | 确保页面完全加载并准备好进行交互。 | _无_ |
| `selectoption` | 从下拉菜单或自定义选择组件中选择一个选项。 | `element_id` 或 (`x`, `y` 坐标)。 |
| `drag` | 执行拖放操作。 | `drag_path`: 表示拖动路径的 JSON 字符串或点数组 `{x, y}`。 |
| `screenshot` | 截取当前页面的屏幕截图。 | _无_ |
