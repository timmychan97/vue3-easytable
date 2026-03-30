import type { LocaleMessage } from '../types'

export default {
  分页: {
    前往: 'Iya ku',
    页: '',
    每页条数: ' / Emakhasi',
    合计: total => `Okuphelele ${total}`,
    向前N页: pagingCount => `Amakhasi ${pagingCount} Adlulile`,
    向后N页: pagingCount => `Amakhasi ${pagingCount} Alandelayo`,
    上一页: 'Ikhasi elidlulile',
    下一页: 'Ikhasi elilandelayo',
    分页导航: 'Ukuzulazula kwamakhasi',
    第N页: page => `Ikhasi ${page}`,
    当前页: page => `Ikhasi ${page}, ikhasi langoku`,
    跳转到: 'Yiya ekhasini',
    每页显示条数: 'Izinto ngekhasi',
  },
  表格: {
    // isihlungi
    确认筛选: 'Hlungisa',
    重置筛选: 'Setha Kabusha',
    // imenyu yomxholo
    剪切: 'Sika',
    复制: 'Kopisha',
    上方插入行: 'Faka umugqa ngenhla',
    下方插入行: 'Faka umugqa ngezansi',
    删除行: 'Susa $1 umugqa',
    清空行: 'Sula $1 umugqa',
    // 删除列: 'Susa $1 ikholomu',
    清空列: 'Sula $1 ikholomu',
    // 隐藏列: 'Fihla $1 ikholomu',
    清空单元格: 'Sula iseli',
    左列冻结: 'Gina ikholomu kwesokunxele',
    取消左列冻结: 'Khulula ikholomu yesokunxele',
    右列冻结: 'Gina ikholomu kwesokudla',
    取消右列冻结: 'Khulula ikholomu yesokudla',
  },
} as LocaleMessage
