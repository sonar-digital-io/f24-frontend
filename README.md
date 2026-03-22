# Fan Demo - Angular OpenCascade.js Project

A modern Angular 21 application featuring OpenCascade.js for 3D CAD visualization with Material Design UI.

![Angular](https://img.shields.io/badge/Angular-21-dd0031?logo=angular)
![Material](https://img.shields.io/badge/Material-21-3f51b5?logo=material-design)
![OpenCascade](https://img.shields.io/badge/OpenCascade.js-1.1.1-orange)
![Three.js](https://img.shields.io/badge/Three.js-0.182-black?logo=three.js)

## Features

- 🏗️ **Angular 21** with standalone components
- 🎨 **Angular Material** with custom dark theme
- 🔧 **Vite/esbuild** for fast compilation
- 💅 **SCSS/SASS** styling
- 🔩 **OpenCascade.js** - Industrial-grade CAD kernel
- 🎮 **Three.js** - 3D WebGL rendering

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   └── cad-viewer/          # 3D CAD viewer component
│   ├── services/
│   │   └── opencascade.service.ts  # OpenCascade.js wrapper
│   ├── app.ts                   # Root component
│   ├── app.html                 # Main template
│   └── app.scss                 # Main styles
├── styles.scss                  # Global styles
└── public/
    ├── opencascade.wasm.js      # OpenCascade.js loader
    └── opencascade.wasm.wasm    # WebAssembly binary
```

## OpenCascade.js Demo

The demo showcases OpenCascade.js capabilities:

- **Parametric Primitives**: Box, Sphere, Cylinder, Torus, Cone
- **Shape Tessellation**: Convert CAD geometry to Three.js meshes
- **Interactive 3D Viewer**: Orbit controls for pan, zoom, rotate

### Supported Shapes

| Shape | Constructor |
|-------|-------------|
| Box | `createBox(width, height, depth)` |
| Sphere | `createSphere(radius)` |
| Cylinder | `createCylinder(radius, height)` |
| Torus | `createTorus(majorRadius, minorRadius)` |
| Cone | `createCone(bottomRadius, topRadius, height)` |

## Technologies

- **Angular 21** - Web framework
- **Angular Material 21** - UI components
- **OpenCascade.js 1.1.1** - CAD kernel (WebAssembly)
- **Three.js 0.182** - 3D graphics
- **SCSS** - Styling preprocessor

## Controls

- **Left Mouse Button + Drag**: Rotate view
- **Scroll Wheel**: Zoom in/out
- **Right Mouse Button + Drag**: Pan view

## License

MIT
