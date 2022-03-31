
const fs = require('fs-extra');
const path = require('path');
(async () => {
  await fs.copy(path.join(__dirname, 'vscode'), path.join(__dirname, 'lib','vscode'));
})();
