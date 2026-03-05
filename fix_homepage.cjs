const fs = require('fs');
let content = fs.readFileSync('apps/web/src/features/public/HomePage.jsx', 'utf8');

// 1. Re-add the imports for NavigationArrow and UserLocationMarker
if (!content.includes('NavigationArrow')) {
    content = content.replace("import CompassGuide from '../../components/CompassGuide'", 
        "import CompassGuide from '../../components/CompassGuide'\nimport NavigationArrow from '../../components/NavigationArrow'\nimport UserLocationMarker from '../../components/UserLocationMarker'");
}

// 2. Remove CompassGuide from the route modal
content = content.replace(/<CompassGuide[\s\S]*?\/>/, '');

// 3. Update the RouteLeafletMap Marker
// Inside RouteLeafletMap, we need to replace the user <Marker ...> Tu ubicación </Marker> with UserLocationMarker
content = content.replace(/<Marker position=\{\[userLocation\.latitude,\s*userLocation\.longitude\]\}[\s\S]*?<\/Marker>/, 
    "<UserLocationMarker userLocation={userLocation} enableMapRotation={true} />");

// 4. Inject NavigationArrow inside the Route Map Box container (right after the RouteLeafletMap)
content = content.replace(/<RouteLeafletMap([\s\S]*?)isMobile=\{isMobile\}[\s\S]*?\/>/, 
    "<RouteLeafletMap={isMobile}\n                  />\n\n                  <NavigationArrow userLocation={userLocation} routeInfo={routeInfo} />");

// 5. Move Floating Info Overlay to the bottom of the card.
// Extract Floating Info Overlay
const overlayMatch = content.match(/{\/\* Floating Info Overlay \*\/}[\s\S]*?<\/Box>([\s]*{\/\* Bottom Content \(Button & Info\) - Overlay \*\/})/);
if (overlayMatch) {
    let overlayBlock = overlayMatch[0];
    overlayBlock = overlayBlock.replace('top: 16,', 'bottom: 16,').replace('zIndex: 1000,', 'zIndex: 10,');
    
    // Remove it from current position
    content = content.replace(/{\/\* Floating Info Overlay \*\/}[\s\S]*?<\/Box>[\s]*{\/\* Bottom Content \(Button & Info\) - Overlay \*\/}/, 
        "{/* Bottom Content (Button & Info) - Overlay */}");
    
    // Insert it before Bottom Content
    content = content.replace("{/* Bottom Content (Button & Info) - Overlay */}", overlayBlock);
}

fs.writeFileSync('apps/web/src/features/public/HomePage.jsx', content, 'utf8');
