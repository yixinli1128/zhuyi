import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// GitHub Pages does not rewrite unknown paths to index.html.  Give it the
// same built entry document at /404.html so Vue Router can render its own
// matching route after a direct visit or a browser refresh.
const distDirectory = resolve('dist')
await copyFile(
  resolve(distDirectory, 'index.html'),
  resolve(distDirectory, '404.html'),
)
