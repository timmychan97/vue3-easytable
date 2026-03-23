const handleCopy = require('./utils/copy')
const handleReplace = require('./utils/replace')

Promise.all([
  handleCopy(),
  handleReplace(),
]).then(() => {
  console.log('Post-build complete')
}).catch((err) => {
  console.error(err)
  process.exit(1)
})
