import type { LocaleMessage } from '../types'

export default {
  分页: {
    前往: 'Ir para',
    页: '',
    每页条数: ' / página',
    合计: total => `Total ${total}`,
    向前N页: pagingCount => `${pagingCount} páginas anteriores`,
    向后N页: pagingCount => `${pagingCount} próximas páginas`,
    上一页: 'Página anterior',
    下一页: 'Próxima página',
    分页导航: 'Navegação de paginação',
    第N页: page => `Página ${page}`,
    当前页: page => `Página ${page}, página atual`,
    跳转到: 'Ir para a página',
    每页显示条数: 'Itens por página',
  },
  表格: {
    // filtro
    确认筛选: 'Filtrar',
    重置筛选: 'Limpar',
    // menu de contexto
    剪切: 'Recortar',
    复制: 'Copiar',
    上方插入行: 'Inserir linha acima',
    下方插入行: 'Inserir linha abaixo',
    删除行: 'Excluir $1 linha(s)',
    清空行: 'Limpar $1 linha(s)',
    // 删除列: 'Excluir $1 coluna(s)',
    清空列: 'Limpar $1 coluna(s)',
    // 隐藏列: 'Ocultar $1 coluna(s)',
    清空单元格: 'Limpar célula',
    左列冻结: 'Fixar coluna à esquerda',
    取消左列冻结: 'Desafixar coluna esquerda',
    右列冻结: 'Fixar coluna à direita',
    取消右列冻结: 'Desafixar coluna direita',
  },
} as LocaleMessage
