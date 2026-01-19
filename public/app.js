// Configuration
const CONFIG = {
    // Auto-detect if we're in Codespaces and use the appropriate URL
    titilerUrl: window.location.hostname.includes('github.dev') 
        ? window.location.origin.replace('-8080.', '-8000.')
        : 'http://localhost:8000',
    dsmCogUrl: 'https://terramap3d-webapp.s3.ap-south-1.amazonaws.com/site_001/01/dsm/dsm_web/dsm_cog.tif',
    orthoTileUrl: 'https://terramap3d-webapp.s3.ap-south-1.amazonaws.com/site_001/01/ortho_tiles/tile/{z}/{y}/{x}.png',
    // Actual extent from DSM (UTM 44N converted to EPSG:3857)
    // DSM: EPSG:32644 (UTM 44N), Ortho: TMS tiles in EPSG:3857/4326
    initialExtent: [8959831.02, 1857455.08, 8961315.87, 1859335.55], // EPSG:3857
    initialZoom: 17,
    initialCenter: [8960573.44, 1858395.31]
};

// Global variables
let mapSingle, mapLeft, mapRight;
let orthoLayer, dsmLayerSingle, dsmLayerLeft, dsmLayerRight;
let currentViewMode = 'single';
let currentColormap = 'terrain';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeMaps();
    setupEventListeners();
    updateCoordinates();
});

// Create base layer
function createBaseLayer(type) {
    switch(type) {
        case 'none':
            return null;
        case 'google-roadmap':
            return new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                    maxZoom: 20
                }),
                name: 'base'
            });
        case 'google-satellite':
            return new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
                    maxZoom: 20
                }),
                name: 'base'
            });
        case 'osm':
        default:
            return new ol.layer.Tile({
                source: new ol.source.OSM(),
                name: 'base'
            });
    }
}

// Create ortho layer
function createOrthoLayer() {
    // TMS tile grid for ortho tiles
    const tmsTileGrid = ol.tilegrid.createXYZ({
        extent: CONFIG.initialExtent,
        tileSize: 256
    });

    return new ol.layer.Tile({
        source: new ol.source.TileImage({
            projection: 'EPSG:3857',
            tileGrid: tmsTileGrid,
            crossOrigin: 'anonymous',
            tileUrlFunction: function (tileCoord) {
                if (!tileCoord) return null;
                const z = tileCoord[0];
                const x = tileCoord[1];
                const y = -tileCoord[2] - 1; // TMS Y-axis flip
                return `https://terramap3d-webapp.s3.ap-south-1.amazonaws.com/site_001/01/ortho_tiles/tile/${z}/${x}/${y}.png`;
            }
        }),
        name: 'ortho',
        opacity: 1.0,
        extent: CONFIG.initialExtent,
        zIndex: 20,
        visible: true
    });
}

// Create DSM layer using TiTiler
function createDSMLayer(colormap = 'terrain') {
    // DSM elevation range from metadata: 16.5m to 185.4m
    const tileUrl = `${CONFIG.titilerUrl}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?` +
        `url=${encodeURIComponent(CONFIG.dsmCogUrl)}` +
        `&colormap_name=${colormap}` +
        `&rescale=16.5,185.4`;

    return new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: tileUrl,
            maxZoom: 22,
            crossOrigin: 'anonymous'
        }),
        name: 'dsm',
        opacity: 0.8
    });
}

// Initialize maps
function initializeMaps() {
    const baseLayer = createBaseLayer('none');
    orthoLayer = createOrthoLayer();
    dsmLayerSingle = createDSMLayer(currentColormap);

    // Single map view - build layers array
    const layers = [];
    if (baseLayer) layers.push(baseLayer);
    layers.push(dsmLayerSingle);
    layers.push(orthoLayer);

    mapSingle = new ol.Map({
        target: 'map-single',
        layers: layers,
        view: new ol.View({
            center: CONFIG.initialCenter,
            zoom: CONFIG.initialZoom,
            projection: 'EPSG:3857'
        }),
        controls: ol.control.defaults.defaults({
            attribution: true,
            zoom: true
        })
    });

    // Add mouse move listener for coordinates
    mapSingle.on('pointermove', (evt) => {
        updateCoordinates(evt.coordinate);
    });

    // Initialize split view maps (hidden initially)
    initializeSplitMaps();
}

// Initialize split view maps
function initializeSplitMaps() {
    const baseLayerLeft = createBaseLayer('none');
    const orthoLayerLeft = createOrthoLayer();
    
    const leftLayers = [];
    if (baseLayerLeft) leftLayers.push(baseLayerLeft);
    leftLayers.push(orthoLayerLeft);
    
    mapLeft = new ol.Map({
        target: 'map-left',
        layers: leftLayers,
        view: new ol.View({
            center: CONFIG.initialCenter,
            zoom: CONFIG.initialZoom,
            projection: 'EPSG:3857'
        }),
        controls: []
    });

    const baseLayerRight = createBaseLayer('none');
    dsmLayerRight = createDSMLayer(currentColormap);
    
    const rightLayers = [];
    if (baseLayerRight) rightLayers.push(baseLayerRight);
    rightLayers.push(dsmLayerRight);
    
    mapRight = new ol.Map({
        target: 'map-right',
        layers: rightLayers,
        view: new ol.View({
            center: CONFIG.initialCenter,
            zoom: CONFIG.initialZoom,
            projection: 'EPSG:3857'
        }),
        controls: []
    });

    // Synchronize views
    const leftView = mapLeft.getView();
    const rightView = mapRight.getView();

    leftView.on('change:center', () => {
        rightView.setCenter(leftView.getCenter());
    });
    leftView.on('change:resolution', () => {
        rightView.setResolution(leftView.getResolution());
    });
}

// Setup event listeners
function setupEventListeners() {
    // Base layer change
    document.getElementById('base-layer-select').addEventListener('change', (e) => {
        changeBaseLayer(e.target.value);
    });

    // Ortho layer toggle and opacity
    document.getElementById('ortho-toggle').addEventListener('change', (e) => {
        orthoLayer.setVisible(e.target.checked);
        if (mapLeft) {
            mapLeft.getLayers().forEach(layer => {
                if (layer.get('name') === 'ortho') {
                    layer.setVisible(e.target.checked);
                }
            });
        }
    });

    document.getElementById('ortho-opacity').addEventListener('input', (e) => {
        const opacity = e.target.value / 100;
        orthoLayer.setOpacity(opacity);
        document.getElementById('ortho-opacity-value').textContent = `${e.target.value}%`;
        if (mapLeft) {
            mapLeft.getLayers().forEach(layer => {
                if (layer.get('name') === 'ortho') {
                    layer.setOpacity(opacity);
                }
            });
        }
    });

    // DSM layer toggle and opacity
    document.getElementById('dsm-toggle').addEventListener('change', (e) => {
        dsmLayerSingle.setVisible(e.target.checked);
        if (dsmLayerRight) dsmLayerRight.setVisible(e.target.checked);
    });

    document.getElementById('dsm-opacity').addEventListener('input', (e) => {
        const opacity = e.target.value / 100;
        dsmLayerSingle.setOpacity(opacity);
        if (dsmLayerRight) dsmLayerRight.setOpacity(opacity);
        document.getElementById('dsm-opacity-value').textContent = `${e.target.value}%`;
    });

    // DSM colormap
    document.getElementById('dsm-colormap').addEventListener('change', (e) => {
        currentColormap = e.target.value;
        updateDSMColormap();
    });

    // View mode
    document.getElementById('view-mode').addEventListener('change', (e) => {
        switchViewMode(e.target.value);
    });

    // Zoom to extent
    document.getElementById('zoom-extent').addEventListener('click', () => {
        zoomToExtent();
    });

    // Reset view
    document.getElementById('reset-view').addEventListener('click', () => {
        resetView();
    });
}

// Change base layer
function changeBaseLayer(type) {
    const newBaseLayer = createBaseLayer(type);
    
    if (currentViewMode === 'single') {
        const layers = mapSingle.getLayers();
        // Remove old base layer
        const oldBase = layers.getArray().find(l => l.get('name') === 'base');
        if (oldBase) layers.remove(oldBase);
        // Add new base layer at the bottom
        if (newBaseLayer) layers.insertAt(0, newBaseLayer);
    } else {
        const leftLayers = mapLeft.getLayers();
        const rightLayers = mapRight.getLayers();
        const oldLeftBase = leftLayers.getArray().find(l => l.get('name') === 'base');
        const oldRightBase = rightLayers.getArray().find(l => l.get('name') === 'base');
        if (oldLeftBase) leftLayers.remove(oldLeftBase);
        if (oldRightBase) rightLayers.remove(oldRightBase);
        if (newBaseLayer) {
            leftLayers.insertAt(0, newBaseLayer);
            rightLayers.insertAt(0, createBaseLayer(type));
        }
    }
}

// Update DSM colormap
function updateDSMColormap() {
    const newDSMLayerSingle = createDSMLayer(currentColormap);
    newDSMLayerSingle.setOpacity(dsmLayerSingle.getOpacity());
    newDSMLayerSingle.setVisible(dsmLayerSingle.getVisible());

    const layers = mapSingle.getLayers();
    const dsmIndex = layers.getArray().findIndex(l => l.get('name') === 'dsm');
    if (dsmIndex !== -1) {
        layers.setAt(dsmIndex, newDSMLayerSingle);
    }
    dsmLayerSingle = newDSMLayerSingle;

    if (mapRight) {
        const newDSMLayerRight = createDSMLayer(currentColormap);
        newDSMLayerRight.setOpacity(dsmLayerRight.getOpacity());
        newDSMLayerRight.setVisible(dsmLayerRight.getVisible());
        
        const rightLayers = mapRight.getLayers();
        const dsmRightIndex = rightLayers.getArray().findIndex(l => l.get('name') === 'dsm');
        if (dsmRightIndex !== -1) {
            rightLayers.setAt(dsmRightIndex, newDSMLayerRight);
        }
        dsmLayerRight = newDSMLayerRight;
    }
}

// Switch view mode
function switchViewMode(mode) {
    currentViewMode = mode;
    const mapSingleEl = document.getElementById('map-single');
    const mapSplitEl = document.getElementById('map-split');

    if (mode === 'single') {
        mapSingleEl.style.display = 'block';
        mapSplitEl.style.display = 'none';
        
        setTimeout(() => {
            mapSingle.updateSize();
        }, 100);
    } else {
        mapSingleEl.style.display = 'none';
        mapSplitEl.style.display = 'flex';
        
        const container = mapSplitEl;
        if (mode === 'split-horizontal') {
            container.classList.remove('vertical');
            container.classList.add('horizontal');
        } else {
            container.classList.remove('horizontal');
            container.classList.add('vertical');
        }

        setTimeout(() => {
            mapLeft.updateSize();
            mapRight.updateSize();
            
            // Sync view with single map
            const singleView = mapSingle.getView();
            mapLeft.getView().setCenter(singleView.getCenter());
            mapLeft.getView().setZoom(singleView.getZoom());
        }, 100);
    }
}

// Zoom to extent
function zoomToExtent() {
    const extent = CONFIG.initialExtent;
    
    if (currentViewMode === 'single') {
        mapSingle.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000
        });
    } else {
        mapLeft.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000
        });
    }
}

// Reset view
function resetView() {
    const view = currentViewMode === 'single' ? mapSingle.getView() : mapLeft.getView();
    view.animate({
        center: CONFIG.initialCenter,
        zoom: CONFIG.initialZoom,
        duration: 1000
    });
}

// Update coordinates display
function updateCoordinates(coordinate) {
    if (!coordinate) {
        const view = mapSingle.getView();
        coordinate = view.getCenter();
    }
    
    const lonLat = ol.proj.toLonLat(coordinate);
    const coordText = `Lon: ${lonLat[0].toFixed(6)}° | Lat: ${lonLat[1].toFixed(6)}°`;
    document.getElementById('coordinates').textContent = coordText;
}
