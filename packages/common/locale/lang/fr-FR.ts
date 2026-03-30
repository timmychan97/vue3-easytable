import type { LocaleMessage } from '../types'

export default {
  分页: {
    前往: 'Aller à',
    页: '',
    每页条数: ' / page',
    合计: total => `Total ${total}`,
    向前N页: pagingCount => `Reculer de ${pagingCount} pages`,
    向后N页: pagingCount => `Avancer de ${pagingCount} pages`,
    上一页: 'Page précédente',
    下一页: 'Page suivante',
    分页导航: 'Navigation de pagination',
    第N页: page => `Page ${page}`,
    当前页: page => `Page ${page}, page actuelle`,
    跳转到: 'Aller à la page',
    每页显示条数: 'Éléments par page',
  },
  表格: {
    // filtre
    确认筛选: 'Filtrer',
    重置筛选: 'Réinitialiser',
    // menu contextuel
    剪切: 'Couper',
    复制: 'Copier',
    上方插入行: 'Insérer une ligne au-dessus',
    下方插入行: 'Insérer une ligne en-dessous',
    删除行: 'Supprimer $1 ligne(s)',
    清空行: 'Vider $1 ligne(s)',
    // 删除列: 'Supprimer $1 colonne(s)',
    清空列: 'Vider $1 colonne(s)',
    // 隐藏列: 'Masquer $1 colonne(s)',
    清空单元格: 'Vider la cellule',
    左列冻结: 'Figer la colonne à gauche',
    取消左列冻结: 'Libérer la colonne gauche',
    右列冻结: 'Figer la colonne à droite',
    取消右列冻结: 'Libérer la colonne droite',
  },
} as LocaleMessage
