<div align="center">

  <p>
    <a href="https://github.com/amshivang"><strong>Shivang Shukla (@amshivang)</strong></a> • 
    <a href="https://github.com/amshivang?tab=repositories">Portfolio Repositories</a> • 
    <a href="mailto:linkwithshivang@gmail.com">Contact</a>
  </p>

  # 🏛️ Ruins of the Ember Temple
  ### Three.js 3D Endless Runner Web Game

  <p>
    <em>A 60 FPS three-lane 3D endless runner built with vanilla JavaScript and Three.js (ES module CDN import), featuring Endless &amp; Adventure modes, dynamic obstacle &amp; boss sequencing, procedural Web Audio synthesis, and local progression storage.</em>
  </p>

  <p>
    <a href="https://amshivang.github.io/temple/"><img src="https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-0284C7?style=for-the-badge&logo=githubpages&logoColor=white" alt="Live Demo"/></a>
    <a href="#"><img src="https://img.shields.io/badge/Engine-Three.js%20%2B%20Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="Three.js + Vanilla JS"/></a>
    <a href="#"><img src="https://img.shields.io/badge/Performance-60%20FPS%20Native-059669?style=for-the-badge&logo=speedtest&logoColor=white" alt="60 FPS Performance"/></a>
    <a href="#"><img src="https://img.shields.io/badge/Controls-Keyboard%20%2B%20Touch%20Swipe-8B5CF6?style=for-the-badge" alt="Controls"/></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-EAB308?style=for-the-badge" alt="License: MIT"/></a>
  </p>

  <p>
    <a href="#-overview">Overview</a> •
    <a href="#-key-features">Key Features</a> •
    <a href="#-controls--gameplay">Controls</a> •
    <a href="#-architecture--tech-stack">Tech Stack</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-repository-structure">Structure</a> •
    <a href="#-performance--engine-mechanics">Engine Mechanics</a> •
    <a href="#-author--connect">Author</a>
  </p>

</div>

---

## 📌 Overview

**Ruins of the Ember Temple** is an action-packed 3D three-lane runner built with vanilla web technologies and Three.js (`THREE.WebGLRenderer`) loaded as an ES module without build tooling or bundling steps.

Players navigate seven procedural temple biomes (Sandstone Temple, Emerald Jungle, Cyan Falls, Crystal Cavern, Lava Ruins, Mystic Sky Ruins, and Moonlit Ruins), dodging stone pillars, enemies, and gaps while collecting coins, upgrades, and power-ups across Endless and Adventure modes.

🌐 **Play the Live Game:** [https://amshivang.github.io/temple/](https://amshivang.github.io/temple/)

---

## ✨ Key Features

- **⚡ Zero-Build WebGL / Three.js Engine**: Renders 60 FPS procedural biomes directly on `<canvas>` via `requestAnimationFrame` and Three.js without npm install or bundlers.
- **🗺️ Endless & Adventure Modes**: Play infinitely scaling runs or biome-staged Adventure objectives with relics, world events, and boss encounters.
- **📱 Dual Desktop & Mobile Touch Controls**: Seamlessly switches between keyboard controls and gesture-based touch swipe tracking (swipe left/right to change lanes, swipe up to jump, swipe down to slide).
- **💥 Dynamic Particle & Lighting System**: Features ambient glowing particle embers, collision sparks, dust trails, and procedural flame effects.
- **🪙 Power-Up Ecosystem & Multipliers**: Collect Magnet Charms (attracts coins within radius), Shield Runes (absorbs single impact), and Ember Multipliers (boosts score velocity).
- **🏆 Local High Score Tracking**: Persists best scores, coins collected, and distance records across browser sessions using `localStorage`.

---

## 🎮 Controls & Gameplay

| Action | Desktop Keyboard | Mobile Touchscreen |
| :--- | :--- | :--- |
| **Switch Left / Right** | <kbd>←</kbd> / <kbd>→</kbd> or <kbd>A</kbd> / <kbd>D</kbd> | Swipe Left / Swipe Right |
| **Jump over Hazards** | <kbd>↑</kbd> or <kbd>W</kbd> / <kbd>Space</kbd> | Swipe Up |
| **Slide under Obstacles**| <kbd>↓</kbd> or <kbd>S</kbd> | Swipe Down |
| **Pause / Resume** | <kbd>Escape</kbd> or <kbd>P</kbd> | Pause Button (HUD) |

---

## 🛠️ Architecture & Tech Stack

| Component / Layer | Technology | Version | Architectural Role & Rationale |
| :--- | :--- | :--- | :--- |
| **Game Core** | Vanilla JavaScript | ES6+ | State machine, entity components, collision detection & gameloop |
| **Rendering Engine**| HTML5 `<canvas>` 2D Context | Native | Direct pixel-level rasterization and perspective scaling |
| **Styling** | Modern CSS3 | Custom | Responsive viewports, HUD layouts, and glassmorphism UI overlays |
| **Persistence** | Web Storage API | `localStorage` | High-score and achievement persistence across sessions |
| **Hosting** | GitHub Pages | Static | Automated CDN delivery with sub-second initial asset load |

---

## 🚀 Quick Start

### Option 1: Play Directly in Browser
Visit the official live deployment:
👉 **[https://amshivang.github.io/temple/](https://amshivang.github.io/temple/)**

### Option 2: Local Development
Because the game has zero build tools or package managers required, running it locally is instant:

```bash
# 1. Clone repository
git clone https://github.com/amshivang/temple.git
cd temple

# 2. Run with any static HTTP server (e.g. Python):
python -m http.server 8000
```

Open `http://localhost:8000` in your web browser.

---

## 📂 Repository Structure

```
temple/
├── .gitignore               # Ignored local files
├── game.js                  # Complete 5,000+ line 2.5D game engine & renderer
├── index.html               # Canvas viewport & responsive HUD elements
├── style.css                # Dark arcade styling, animations & fonts
├── LICENSE                  # MIT License
└── README.md                # Comprehensive documentation
```

---

## ⚡ Performance & Engine Mechanics

- **Garbage-Collection Friendly**: Recycles obstacle and coin object instances using object pooling principles to prevent frame drops from runtime memory allocation.
- **Client Sandboxed**: Strictly client-side execution with zero external analytics, tracking pixels, or third-party ad networks.
- **Adaptive Canvas Scaling**: Automatically matches display DPR (Device Pixel Ratio) for sharp rendering on 4K monitors and Retina displays.

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

## 👤 Author & Connect

<div align="center">
  <p><strong>Shivang Shukla</strong></p>
  <p><em>Cybersecurity & Digital Forensics Scholar</em></p>

  <p>
    <a href="https://github.com/amshivang"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a>
    <a href="https://www.linkedin.com/in/amshivang/"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/></a>
    <a href="mailto:linkwithshivang@gmail.com"><img src="https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email"/></a>
  </p>

  <a href="https://buymeacoffee.com/amshivang">
    <img src="https://raw.githubusercontent.com/amshivang/amshivang/main/qr-code.png" alt="Buy Me A Coffee" width="180">
  </a>
  <br>
  <strong><a href="https://buymeacoffee.com/amshivang">☕ Support my open-source work on Buy Me A Coffee!</a></strong>
</div>
