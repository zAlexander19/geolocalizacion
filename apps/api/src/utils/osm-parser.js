import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { XMLParser } from 'fast-xml-parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Parse OSM XML file and extract relevant data
 * @param {string} osmFilePath - Path to the OSM file
 * @returns {Object} Parsed OSM data with nodes, ways, and relations
 */
export function parseOSMFile(osmFilePath) {
  try {
    const xmlData = fs.readFileSync(osmFilePath, 'utf8')
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
      trimValues: true,
      arrayMode: false,
      isArray: (name) => ['node', 'way', 'relation', 'nd', 'member', 'tag'].includes(name)
    })

    const result = parser.parse(xmlData)
    const osm = result.osm || {}

    // Create node lookup map for quick access
    const nodeMap = new Map()
    const nodes = Array.isArray(osm.node) ? osm.node : (osm.node ? [osm.node] : [])
    
    nodes.forEach(node => {
      if (node.id && node.lat && node.lon) {
        nodeMap.set(node.id, {
          id: node.id,
          lat: node.lat,
          lon: node.lon,
          tags: parseTags(node.tag)
        })
      }
    })

    // Parse ways (buildings, roads, etc.)
    const ways = Array.isArray(osm.way) ? osm.way : (osm.way ? [osm.way] : [])
    const parsedWays = ways.map(way => {
      const tags = parseTags(way.tag)
      const nodeRefs = Array.isArray(way.nd) ? way.nd : (way.nd ? [way.nd] : [])
      
      // Get coordinates for all nodes in this way
      const coordinates = nodeRefs
        .map(nd => nodeMap.get(nd.ref))
        .filter(n => n)
        .map(n => ({ lat: n.lat, lon: n.lon }))

      return {
        id: way.id,
        tags,
        nodes: nodeRefs.map(nd => nd.ref),
        coordinates,
        centroid: calculateCentroid(coordinates)
      }
    })

    // Parse relations (multipolygons, routes, etc.)
    const relations = Array.isArray(osm.relation) ? osm.relation : (osm.relation ? [osm.relation] : [])

    return {
      bounds: osm.bounds,
      nodes: Array.from(nodeMap.values()),
      ways: parsedWays,
      relations,
      nodeMap
    }
  } catch (error) {
    console.error('Error parsing OSM file:', error)
    throw error
  }
}

/**
 * Parse OSM tags into a key-value object
 */
function parseTags(tags) {
  if (!tags) return {}
  
  const tagArray = Array.isArray(tags) ? tags : [tags]
  const result = {}
  
  tagArray.forEach(tag => {
    if (tag.k && tag.v !== undefined) {
      result[tag.k] = tag.v
    }
  })
  
  return result
}

/**
 * Calculate centroid of a polygon
 */
function calculateCentroid(coordinates) {
  if (!coordinates || coordinates.length === 0) {
    return { lat: 0, lon: 0 }
  }

  let totalLat = 0
  let totalLon = 0
  let count = 0

  coordinates.forEach(coord => {
    if (coord.lat && coord.lon) {
      totalLat += coord.lat
      totalLon += coord.lon
      count++
    }
  })

  if (count === 0) {
    return { lat: 0, lon: 0 }
  }

  return {
    lat: totalLat / count,
    lon: totalLon / count
  }
}

/**
 * Extract buildings from parsed OSM data
 */
export function extractBuildings(osmData) {
  const buildings = []

  osmData.ways.forEach(way => {
    if (way.tags.building) {
      const name = way.tags.name || way.tags['building:name'] || way.tags['addr:street'] || `Edificio ${way.id}`
      const buildingType = way.tags.building !== 'yes' ? way.tags.building : 'building'

      buildings.push({
        osm_id: way.id,
        nombre_edificio: name,
        acronimo: way.tags['short_name'] || way.tags['alt_name'] || '',
        cord_latitud: way.centroid.lat,
        cord_longitud: way.centroid.lon,
        tipo: buildingType,
        direccion: way.tags['addr:full'] || way.tags['addr:street'] || '',
        disponibilidad: 'Disponible',
        estado: true,
        imagen: '',
        coordinates: way.coordinates,
        tags: way.tags
      })
    }
  })

  // Also check nodes that might be buildings (POIs marked as buildings)
  osmData.nodes.forEach(node => {
    if (node.tags.building || node.tags.amenity === 'university' || node.tags.amenity === 'college') {
      const name = node.tags.name || node.tags['building:name'] || `Edificio ${node.id}`
      
      buildings.push({
        osm_id: node.id,
        nombre_edificio: name,
        acronimo: node.tags['short_name'] || node.tags['alt_name'] || '',
        cord_latitud: node.lat,
        cord_longitud: node.lon,
        tipo: node.tags.building || node.tags.amenity || 'building',
        direccion: node.tags['addr:full'] || node.tags['addr:street'] || '',
        disponibilidad: 'Disponible',
        estado: true,
        imagen: '',
        tags: node.tags
      })
    }
  })

  return buildings
}

/**
 * Extract Points of Interest (POIs) from parsed OSM data
 */
export function extractPOIs(osmData) {
  const pois = []

  osmData.nodes.forEach(node => {
    if (node.tags.amenity || node.tags.shop || node.tags.tourism || node.tags.leisure) {
      pois.push({
        osm_id: node.id,
        nombre: node.tags.name || node.tags.amenity || node.tags.shop || 'POI',
        tipo: node.tags.amenity || node.tags.shop || node.tags.tourism || node.tags.leisure,
        cord_latitud: node.lat,
        cord_longitud: node.lon,
        tags: node.tags
      })
    }
  })

  return pois
}

/**
 * Main function to parse OSM and extract usable data
 */
export function parseOSMForImport(osmFilePath) {
  console.log('Parsing OSM file:', osmFilePath)
  
  const osmData = parseOSMFile(osmFilePath)
  const buildings = extractBuildings(osmData)
  const pois = extractPOIs(osmData)

  console.log(`Found ${buildings.length} buildings`)
  console.log(`Found ${pois.length} POIs`)

  return {
    buildings,
    pois,
    bounds: osmData.bounds,
    stats: {
      totalNodes: osmData.nodes.length,
      totalWays: osmData.ways.length,
      buildingsCount: buildings.length,
      poisCount: pois.length
    }
  }
}
