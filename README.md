# TerraMap3D - 2D Web Viewer

A powerful 2D map viewer similar to Pix4D's 2D viewer, featuring dynamic DSM tiles via TiTiler, orthophoto overlays, multiple base maps, and split-screen comparison views.

## Features

- 🗺️ **Multiple Base Layers**: Google Maps, Google Satellite, OpenStreetMap
- 🌄 **DSM Visualization**: Dynamic elevation tiles from Cloud Optimized GeoTIFF (COG) using TiTiler
- 📸 **Orthophoto Overlay**: High-resolution orthophoto tiles from S3
- 🎨 **Multiple Colormaps**: Terrain, Viridis, Plasma, Inferno, Rainbow for DSM
- 🔀 **Split View**: Compare Ortho and DSM side-by-side (horizontal or vertical)
- 🎚️ **Layer Controls**: Toggle visibility and adjust opacity for each layer
- 🎯 **Zoom to Extent**: Quickly navigate to your data extent
- 📍 **Coordinate Display**: Real-time lat/lon coordinates

## Architecture

- **TiTiler**: Serves dynamic map tiles from COG files (DSM)
- **OpenLayers**: Web mapping library for interactive visualization
- **Nginx**: Serves the static web application
- **Docker**: Containerized setup for easy deployment

## Prerequisites

- Docker and Docker Compose
- AWS S3 credentials (if using private buckets)

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd map3d_terra
   ```

2. **Start the services:**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
   
   Or manually:
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Web App: http://localhost:8080
   - TiTiler API: http://localhost:8000

4. **Stop the services:**
   ```bash
   docker-compose down
   ```

## Configuration

Edit the configuration in `public/app.js`:

```javascript
const CONFIG = {
    titilerUrl: 'http://localhost:8000',
    dsmCogUrl: 's3://terramap3d-webapp/site_001/01/dsm/dsm_web/dsm_cog.tif',
    orthoTileUrl: 'https://terramap3d-webapp.s3.ap-south-1.amazonaws.com/site_001/01/ortho_tiles/tile/{z}/{y}/{x}.png',
    initialExtent: [8926000, 1835000, 8932000, 1841000], // EPSG:3857
    initialZoom: 15,
    initialCenter: [8929000, 1838000]
};
```

### Adjusting the Initial Extent

To set the correct extent for your data:

1. Get the bounds of your DSM COG:
   ```bash
   curl "http://localhost:8000/cog/info?url=s3://terramap3d-webapp/site_001/01/dsm/dsm_web/dsm_cog.tif"
   ```

2. Convert the bounds from EPSG:4326 (lat/lon) to EPSG:3857 (Web Mercator) using a tool like [epsg.io](https://epsg.io/transform)

3. Update the `initialExtent` in the config

## AWS S3 Configuration

### For Public Buckets

The current setup uses `AWS_NO_SIGN_REQUEST=YES`, which works for public S3 buckets without authentication.

### For Private Buckets

If your S3 bucket is private, update the `docker-compose.yml`:

```yaml
titiler:
  environment:
    - AWS_ACCESS_KEY_ID=your_access_key
    - AWS_SECRET_ACCESS_KEY=your_secret_key
    - AWS_REGION=ap-south-1
    # Remove AWS_NO_SIGN_REQUEST line
```

## Usage

### Controls

1. **Base Layer**: Switch between Google Maps, Google Satellite, or OpenStreetMap
2. **Ortho Layer**: Toggle visibility and adjust opacity (0-100%)
3. **DSM Layer**: Toggle visibility, adjust opacity, and change colormap
4. **View Mode**: Switch between Single, Split Horizontal, or Split Vertical views
5. **Zoom to Extent**: Fit the map to your data extent
6. **Reset View**: Return to initial zoom and center

### Split View Modes

- **Single View**: All layers in one map
- **Split Horizontal**: Ortho on top, DSM on bottom
- **Split Vertical**: Ortho on left, DSM on right

### Colormaps for DSM

- **Terrain**: Natural terrain colors (green to brown to white)
- **Viridis**: Purple to yellow (perceptually uniform)
- **Plasma**: Purple to pink to yellow
- **Inferno**: Black to red to yellow
- **Rainbow**: Full color spectrum

## Development

### File Structure

```
map3d_terra/
├── docker-compose.yml          # Docker services configuration
├── start.sh                    # Quick start script
├── public/
│   ├── index.html             # Main HTML structure
│   ├── style.css              # Styling and layout
│   └── app.js                 # OpenLayers application logic
└── README.md                  # This file
```

### Customization

- **Add more base layers**: Edit `createBaseLayer()` in `app.js`
- **Change styling**: Modify `style.css`
- **Add more controls**: Extend the HTML and JavaScript

### TiTiler Endpoints

TiTiler provides various endpoints for working with COG files:

- Info: `/cog/info?url={cog_url}`
- Statistics: `/cog/statistics?url={cog_url}`
- Tiles: `/cog/tiles/{z}/{x}/{y}?url={cog_url}&colormap_name={colormap}`
- Preview: `/cog/preview.png?url={cog_url}&colormap_name={colormap}`

## Troubleshooting

### TiTiler can't access S3

- Verify the S3 URL is correct
- Check AWS credentials if using a private bucket
- Ensure the bucket region is correct

### Tiles not loading

- Open browser DevTools (F12) and check the Network tab
- Verify TiTiler is running: `curl http://localhost:8000/docs`
- Check CORS settings if accessing from a different domain

### Map is blank

- Verify the initial extent matches your data location
- Check the browser console for errors
- Ensure the ortho tile URL pattern is correct

## Performance Tips

1. **COG Optimization**: Ensure your DSM is a proper Cloud Optimized GeoTIFF with overviews
2. **Tile Caching**: Consider adding a tile cache layer (like Varnish) for production
3. **Compression**: Enable compression in nginx for faster loading

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions, please open an issue on GitHub.