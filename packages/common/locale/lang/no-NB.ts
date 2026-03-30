import type { LocaleMessage } from '../types'

export default {
  分页: {
    前往: 'Gå til',
    页: '',
    每页条数: ' per side',
    合计: total => `Totalt ${total}`,
    向前N页: pagingCount => `${pagingCount} sider tilbake`,
    向后N页: pagingCount => `${pagingCount} sider frem`,
    上一页: 'Forrige side',
    下一页: 'Neste side',
    分页导航: 'Sidenavigasjon',
    第N页: page => `Side ${page}`,
    当前页: page => `Side ${page}, gjeldende side`,
    跳转到: 'Gå til side',
    每页显示条数: 'Elementer per side',
  },
  表格: {
    // filter
    确认筛选: 'Filtrer',
    重置筛选: 'Tilbakestill',
    // contextmenu
    剪切: 'Klipp ut',
    复制: 'Kopier',
    上方插入行: 'Sett inn rad over',
    下方插入行: 'Sett inn rad under',
    删除行: 'Slett $1 rad(er)',
    清空行: 'Tøm $1 rad(er)',
    // 删除列: 'Slett $1 kolonne(r)',
    清空列: 'Tøm $1 kolonne(r)',
    // 隐藏列: 'Skjul $1 kolonne(r)',
    清空单元格: 'Tøm celle',
    左列冻结: 'Frys kolonne til venstre',
    取消左列冻结: 'Opphev frysing til venstre',
    右列冻结: 'Frys kolonne til høyre',
    取消右列冻结: 'Opphev frysing til høyre',
  },
} as LocaleMessage
