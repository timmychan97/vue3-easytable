/**
 * 剪贴板工具（MOD-04）
 * - tsv-codec：纯函数，电子表格 TSV 文本与二维数组之间的编码/解码
 * - handlers：复制、剪切、粘贴、删除的 onBefore* / onAfter* 处理函数
 * - write：主动写入系统剪贴板（右键菜单复制、剪切，CLIP-06）
 */
export * from './handlers.js'
export * from './tsv-codec.js'
export * from './write.js'
