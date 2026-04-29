export type Playlist = {
  id: string
  name: string
  category: string
  songs: string[] // songId 列表
  // 兼容未来扩展（原生实现当前版本未存描述/时间戳）
  createdAt?: number
  updatedAt?: number
}
