const { parallel } = require('gulp')
const handleCopy = require('./build/utils/copy')
const handleReplace = require('./build/utils/replace')

exports.default = parallel([
  handleReplace,
  handleCopy,
])
