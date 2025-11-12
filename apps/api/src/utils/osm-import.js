import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseOSMForImport } from './osm-parser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Resolve data file path
 */
function resolveDataPath() {
  const tryPaths = [
    path.resolve(__dirname, '../../data/db.json'),
    path.resolve(__dirname, '../../apps/api/data/db.json'),
  ]
  for (const p of tryPaths) {
    if (fs.existsSync(p)) return p
  }
  // default to first path
  const dir = path.dirname(tryPaths[0])
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return tryPaths[0]
}

/**
 * Load current database
 */
function loadDB() {
  const dbPath = resolveDataPath()
  if (!fs.existsSync(dbPath)) {
    return { buildings: [], floors: [], rooms: [], bathrooms: [], faculties: [] }
  }
  try {
    const raw = fs.readFileSync(dbPath, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    console.error('Error reading DB file:', e)
    return { buildings: [], floors: [], rooms: [], bathrooms: [], faculties: [] }
  }
}

/**
 * Save database
 */
function saveDB(db) {
  const dbPath = resolveDataPath()
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8')
}

/**
 * Get next available ID
 */
function nextId(items, key) {
  const max = items.reduce((acc, it) => Math.max(acc, Number(it[key]) || 0), 0)
  return max + 1
}

/**
 * Import OSM buildings into database
 * @param {string} osmFilePath - Path to OSM file
 * @param {Object} options - Import options
 * @returns {Object} Import results
 */
export function importOSMData(osmFilePath, options = {}) {
  const {
    mergeMode = 'add', // 'add' | 'replace' | 'merge'
    updateExisting = false,
    skipDuplicates = true
  } = options

  console.log(`\n🗺️  Starting OSM import from: ${osmFilePath}`)
  console.log(`Mode: ${mergeMode}, Update existing: ${updateExisting}, Skip duplicates: ${skipDuplicates}\n`)

  // Parse OSM file
  const osmData = parseOSMForImport(osmFilePath)
  
  // Load current database
  const db = loadDB()
  const originalBuildingsCount = db.buildings?.length || 0

  // Initialize arrays if they don't exist
  if (!db.buildings) db.buildings = []
  if (!db.floors) db.floors = []
  if (!db.rooms) db.rooms = []
  if (!db.bathrooms) db.bathrooms = []
  if (!db.faculties) db.faculties = []

  let added = 0
  let updated = 0
  let skipped = 0

  // Handle different merge modes
  if (mergeMode === 'replace') {
    db.buildings = []
    console.log('⚠️  Clearing existing buildings (replace mode)')
  }

  // Import buildings
  osmData.buildings.forEach(osmBuilding => {
    // Check if building already exists (by OSM ID or name)
    const existingIndex = db.buildings.findIndex(b => 
      (b.osm_id && b.osm_id === osmBuilding.osm_id) ||
      (b.nombre_edificio && b.nombre_edificio.toLowerCase() === osmBuilding.nombre_edificio.toLowerCase())
    )

    if (existingIndex !== -1) {
      if (updateExisting) {
        // Update existing building
        const existing = db.buildings[existingIndex]
        db.buildings[existingIndex] = {
          ...existing,
          ...osmBuilding,
          id_edificio: existing.id_edificio, // Keep original ID
          imagen: existing.imagen || osmBuilding.imagen, // Keep existing image
          // Preserve coordinates if they exist and are valid
          cord_latitud: osmBuilding.cord_latitud || existing.cord_latitud,
          cord_longitud: osmBuilding.cord_longitud || existing.cord_longitud
        }
        updated++
        console.log(`✏️  Updated: ${osmBuilding.nombre_edificio}`)
      } else if (skipDuplicates) {
        skipped++
        console.log(`⏭️  Skipped (duplicate): ${osmBuilding.nombre_edificio}`)
      }
    } else {
      // Add new building
      const newId = nextId(db.buildings, 'id_edificio')
      db.buildings.push({
        id_edificio: newId,
        ...osmBuilding,
        created_from_osm: true,
        imported_at: new Date().toISOString()
      })
      added++
      console.log(`✅ Added: ${osmBuilding.nombre_edificio} (ID: ${newId})`)
    }
  })

  // Save updated database
  saveDB(db)

  const results = {
    success: true,
    stats: {
      originalCount: originalBuildingsCount,
      finalCount: db.buildings.length,
      added,
      updated,
      skipped,
      osmStats: osmData.stats
    },
    buildings: db.buildings
  }

  console.log(`\n📊 Import Summary:`)
  console.log(`   Original buildings: ${originalBuildingsCount}`)
  console.log(`   Added: ${added}`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Final count: ${db.buildings.length}`)
  console.log(`\n✅ Import completed successfully!\n`)

  return results
}

/**
 * CLI function to run import from command line
 */
export async function runImportFromCLI() {
  const osmFilePath = path.resolve(__dirname, '../../data/map.osm')
  
  if (!fs.existsSync(osmFilePath)) {
    console.error(`❌ OSM file not found: ${osmFilePath}`)
    process.exit(1)
  }

  try {
    const results = importOSMData(osmFilePath, {
      mergeMode: 'add',
      updateExisting: false,
      skipDuplicates: true
    })
    
    console.log('\n📍 Sample of imported buildings:')
    results.buildings.slice(0, 5).forEach(b => {
      console.log(`   - ${b.nombre_edificio} (${b.cord_latitud}, ${b.cord_longitud})`)
    })
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runImportFromCLI()
}
