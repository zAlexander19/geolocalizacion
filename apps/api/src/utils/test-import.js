import { parseOSMForImport } from './osm-parser.js'
import { importOSMData } from './osm-import.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const osmFilePath = path.resolve(__dirname, '../../data/map.osm')

console.log('Testing OSM import...')
console.log('OSM file path:', osmFilePath)

try {
  const results = importOSMData(osmFilePath, {
    mergeMode: 'add',
    updateExisting: false,
    skipDuplicates: true
  })
  
  console.log('\nImport completed!')
  console.log('Results:', JSON.stringify(results.stats, null, 2))
} catch (error) {
  console.error('Error during import:', error)
}
