# Web 端音乐播放器

一款前后端分离的本地/在线音乐播放器，提供简洁现代的界面与完整的播放能力。

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS v4 + Zustand，位于 `music-player-react/`
- **后端**：Node.js + Express 5 + SQLite（`node:sqlite`）+ music-metadata，位于 `server/`

## 快速开始

```bash
# 1. 启动后端（默认 http://localhost:3799）
cd server
npm install
npm run dev

# 2. 启动前端（默认 http://localhost:5173，/api 自动代理到后端）
cd ../music-player-react
npm install
npm run dev
```

生产部署：`cd music-player-react && npm run build` 后由后端直接托管 `dist/`
（服务端检测到构建产物后自动开启静态托管），只暴露后端一个端口即可。

## 功能特性

### 核心播放

- 播放/暂停、上一曲/下一曲、进度条拖拽、音量控制、静音
- 播放模式：顺序播放（播完停止）、列表循环、随机播放（避免连播同一首）、单曲循环
- 服务端音频流支持 HTTP Range，拖动进度即时响应
- 全屏 Now Playing 面板：大封面 + 同步歌词 + 播放队列两个 Tab
- 键盘快捷键：`空格` 播放/暂停、`←/→` 快退/快进 5 秒、`↑/↓` 音量增减、`M` 静音
  （输入框聚焦时不触发）
- Media Session API：系统媒体通知栏显示歌曲信息与播放控制

### 音乐库（后端管理）

- 上传本地音频（MP3/WAV/OGG/FLAC/AAC/M4A 等），元数据（标题/歌手/专辑/封面/时长）
  由服务端 music-metadata 解析
- 扫描文件夹批量导入：递归扫描服务端本机目录，SHA-1 内容哈希自动去重
- 歌曲信息编辑（标题/歌手/专辑/流派/年份）
- 歌曲删除（同时清理音频文件、封面与歌词，歌单关联级联移除）
- 曲库搜索（按标题/歌手/专辑模糊匹配）
- **元数据与音频文件由后端 SQLite + 文件系统管理，刷新页面后曲库与播放链接不失效**
  （播放队列/进度暂不持久化）

### 歌单

- 服务端歌单 CRUD，支持描述
- 添加歌曲到歌单 / 从歌单移除
- 歌单内拖拽排序（顺序持久化到服务端）
- 歌单重命名与删除

### 歌词

- 支持嵌入式歌词（MP3 USLT）自动提取
- LRC 文件上传、歌词编辑器（点击歌词行跳转播放）
- 在线匹配：从网易云音乐搜索候选歌词并一键绑定（支持翻译）
- 翻译 LRC 按时间轴就近合并，原文下方显示译文

### 在线音乐（网易云音乐）

- 在线搜索（服务端代理，无需用户自建 CORS 代理）
- 在线试听播放（服务端代理流，同源访问，支持 Range，与均衡器兼容）
- 一键收藏下载到本地曲库（VIP 试听片段基于时长校验自动拒绝并提示）
- 历史版本曾内置 QQ 音乐搜索（用户自配代理），重构后由服务端 NetEase
  代理取代

### 音效

- Web Audio API 10 段均衡器（31Hz–16kHz）
- 预设：平坦、流行、摇滚、爵士、古典、电子、人声、重低音
- 均衡器状态本地持久化

### 其他

- 深色/浅色双主题（CSS 变量驱动，真实切换并持久化）
- PWA：可安装到主屏幕，Service Worker 缓存（同源音频可离线回放）
- 全局错误边界，接口错误友好提示

## 后端 API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查（含曲库数量） |
| GET | `/api/tracks` | 曲库列表，支持 `?query=&sort=&dir=` |
| POST | `/api/tracks` | multipart 上传音频（字段名 `files`，可批量） |
| PATCH | `/api/tracks/:id` | 编辑元数据 |
| DELETE | `/api/tracks/:id` | 删除歌曲及关联文件 |
| GET | `/api/tracks/:id/stream` | 音频流（Range 支持） |
| GET | `/api/tracks/:id/cover` | 内嵌封面 |
| GET/POST | `/api/tracks/:id/lyric` | 读取/保存歌词（含翻译） |
| GET/POST/PUT/PATCH/DELETE | `/api/playlists...` | 歌单 CRUD、成员增删、排序 |
| POST | `/api/library/scan` | 扫描目录导入 `{ path }` |
| GET | `/api/netease/search` | NetEase 搜索代理 |
| GET | `/api/netease/lyrics/:songId` | NetEase 歌词（含翻译） |
| GET | `/api/netease/stream/:songId` | 在线试听（服务端代理流，支持 Range） |
| POST | `/api/netease/download/:songId` | 下载入库（试听片段自动拒绝） |

数据与音频文件位于 `server/data/`（SQLite + `music/` + `covers/`），已被 gitignore。

## 开发

```bash
# 前端
cd music-player-react
npm run type-check   # TS 检查（strict）
npm run lint         # ESLint
npm test             # Vitest

# 后端
cd server
npm run type-check   # TS strict + noUncheckedIndexedAccess
npm test             # Vitest + supertest（NetEase 代理用例需真实网络，
                     # 设 RUN_NETEASE_TESTS=1 开启，默认跳过）

# 端到端（需前后端均在运行，Python + Playwright）
cd music-player-react
python e2e/loop0_play.py        # 最小闭环：列表/播放/刷新持久
python e2e/loop1_library.py     # 扫描导入/编辑/删除
python e2e/loop2_playlists.py   # 歌单全流程
python e2e/loop3_lyrics.py      # 在线歌词匹配（真实网络）
python e2e/loop4_online.py      # 在线搜索/试听/收藏（真实网络）
python e2e/loop5_experience.py  # 快捷键/Now Playing
python e2e/loop6_theme_eq.py    # 主题/均衡器
```

## License

见 [LICENSE](LICENSE)。
