# Web 端音乐播放器

一款基于 Web 技术的本地音乐播放器，提供简洁现代的界面和完整的播放功能。  
当前仓库主应用为 React + TypeScript 重构版本，位于 `music-player-react/`。

## 功能特性

- **核心播放**：播放/暂停、上一曲/下一曲、进度条拖拽、音量控制
- **播放模式**：顺序播放、随机播放、单曲循环
- **歌单管理**：创建、编辑、删除歌单，分类管理
- **本地文件**：支持 MP3、WAV、OGG、FLAC、AAC 格式，支持批量上传
- **数据存储**：IndexedDB 本地存储，刷新后数据保留
- **主题切换**：浅色/深色主题
- **歌词显示（第一阶段）**：
  - 支持 LRC 格式解析与同步显示
  - 歌词上传、嵌入式歌词提取（MP3 ID3）
  - 歌词编辑器，点击歌词跳转播放
- **PWA 支持（第一阶段）**：
  - 可添加到主屏幕，离线访问
  - Service Worker 缓存，离线播放已缓存音乐
  - Media Session API，系统通知栏播放控制
- **第三方 API 集成（第二阶段）**：
  - 网易云音乐、QQ 音乐在线搜索
  - 在线播放、添加到本地歌单
  - 可配置 API 代理地址
- **社交分享（第三阶段）**：
  - Web Share API 原生分享
  - 分享链接生成、复制到剪贴板
- **音效调节（第三阶段）**：
  - Web Audio API 10 段均衡器
  - 预设：流行、摇滚、爵士、古典、电子、重低音、人声
- **键盘快捷键**：
  - 空格键：播放/暂停
  - 左/右方向键：快退/快进 5 秒
  - 上/下方向键：增加/减少音量
  - `M` 键：静音/取消静音

## 使用方法

### 1. 启动项目

```bash
cd music-player-react
npm install
npm run dev
```

然后在浏览器中打开 `http://localhost:5173`。

### 2. 上传音乐

1. 点击页面右上角的「上传音乐」按钮
2. 选择本地音乐文件（支持多选）
3. 等待上传完成

### 3. 创建歌单

1. 点击左侧边栏的「创建歌单」按钮
2. 输入歌单名称和分类
3. 保存即可

### 4. 歌词功能

1. **上传歌词**：选择歌曲播放后，在歌词面板点击上传按钮，选择 `.lrc` 文件
2. **编辑歌词**：点击编辑按钮，按 LRC 格式编辑（每行 `[分:秒] 歌词内容`）
3. **嵌入式歌词**：上传的 MP3 若含 ID3 歌词，会自动提取
4. **点击跳转**：点击某行歌词可跳转到对应播放时间

### 5. 在线搜索（需配置 API）

1. 点击「API 配置」设置网易云/QQ 音乐 API 代理地址
2. 网易云：运行 `npx NeteaseCloudMusicApi`（默认 `http://localhost:3001`）
3. QQ 音乐：需部署 QQMusicApi 等代理服务（默认 `http://localhost:3300`）
4. 在搜索框输入关键词搜索，点击播放或「+」添加到本地

### 6. PWA 安装

1. 使用 HTTPS 或 localhost 访问应用
2. 浏览器会显示「添加到主屏幕」或安装提示
3. 安装后可离线使用，系统通知栏显示播放控制

### 7. 分享

点击播放栏的分享按钮，可分享当前歌曲或应用链接。  
支持 Web Share API（移动端）或复制到剪贴板。

### 8. 音效调节

点击播放栏的音效按钮打开均衡器面板，可选择预设（流行、摇滚、爵士等）或手动调节各频段，设置会自动保存。

## 开发命令

在 `music-player-react/` 目录下执行：

```bash
npm run dev         # 本地开发
npm run build       # 生产构建
npm run preview     # 构建结果预览
npm run lint        # ESLint 检查
npm run type-check  # TypeScript 类型检查
npm run test        # Vitest 单元测试
```

## 项目结构

```text
music-player/
├── music-player-react/
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── manifest.json
│   │   └── sw.js
│   ├── src/
│   │   ├── api/                 # 网易云/QQ API 适配
│   │   ├── app/providers/       # ThemeProvider 等全局 provider
│   │   ├── components/          # 播放器、歌单、歌词、搜索、均衡器组件
│   │   ├── constants/           # 常量（均衡器预设等）
│   │   ├── hooks/               # 上传、MediaSession、PWA、主题等 hooks
│   │   ├── services/            # audio/storage/lyric/apiGateway 等服务
│   │   ├── stores/              # Zustand 状态管理
│   │   ├── test/                # 测试初始化
│   │   ├── types/               # 领域类型定义
│   │   ├── utils/               # LRC/ID3/时间格式化等工具
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── style.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   └── package.json
├── REACT_REFACTOR_PLAN.md       # 重构计划
├── REACT_REFACTOR_EXECUTION_LOG.md
└── README.md
```

## 技术栈

- React 18
- TypeScript
- Vite
- Zustand
- TanStack Query
- Dexie（IndexedDB）
- Tailwind CSS
- Vitest + Testing Library

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 许可证

MIT
