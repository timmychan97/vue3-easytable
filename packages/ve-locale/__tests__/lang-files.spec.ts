import nbNO from '@/common/locale/lang/nb-NO'
import noNB from '@/common/locale/lang/no-NB'
import zhCN from '@/common/locale/lang/zh-CN'

describe('language pack files (I18N-05)', () => {
  it('the Norwegian Bokmål pack is nb-NO (BCP 47), with every key of zh-CN', () => {
    expect(nbNO.分页.前往).toBe('Gå til')
    expect(Object.keys(nbNO.分页).sort()).toEqual(Object.keys(zhCN.分页).sort())
    expect(Object.keys(nbNO.表格).sort()).toEqual(Object.keys(zhCN.表格).sort())
  })

  it('no-NB is kept as a deprecated alias of nb-NO', () => {
    expect(noNB).toBe(nbNO)
  })
})
