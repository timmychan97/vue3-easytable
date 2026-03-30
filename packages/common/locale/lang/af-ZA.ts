import type { LocaleMessage } from '../types'

export default {
  分页: {
    前往: 'Gaan na',
    页: '',
    每页条数: ' / bladsy',
    合计: total => `Totaal ${total}`,
    向前N页: pagingCount => `Vorige ${pagingCount} bladsye`,
    向后N页: pagingCount => `Volgende ${pagingCount} bladsye`,
    上一页: 'Vorige bladsy',
    下一页: 'Volgende bladsy',
    分页导航: 'Bladsynavigasie',
    第N页: page => `Bladsy ${page}`,
    当前页: page => `Bladsy ${page}, huidige bladsy`,
    跳转到: 'Gaan na bladsy',
    每页显示条数: 'Items per bladsy',
  },
  表格: {
    // filter
    确认筛选: 'Filtreer',
    重置筛选: 'Stel terug',
    // konteksmenu
    剪切: 'Sny',
    复制: 'Kopieer',
    上方插入行: 'Voeg ry bo in',
    下方插入行: 'Voeg ry onder in',
    删除行: 'Verwyder $1 ry(e)',
    清空行: 'Maak $1 ry(e) leeg',
    // 删除列: 'Verwyder $1 kolom(me)',
    清空列: 'Maak $1 kolom(me) leeg',
    // 隐藏列: 'Verberg $1 kolom(me)',
    清空单元格: 'Maak sel leeg',
    左列冻结: 'Vries kolom links',
    取消左列冻结: 'Ontvrys linkerkolom',
    右列冻结: 'Vries kolom regs',
    取消右列冻结: 'Ontvrys regterkolom',
  },
} as LocaleMessage
