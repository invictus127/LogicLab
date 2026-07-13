# LogicLab — Digital Electronics Virtual Lab

An offline-first, installable web app for learning digital electronics by doing: toggle real gates, minimize Boolean expressions with a Karnaugh Map solver, clock flip-flops, wire up multiplexers, and watch a signal actually propagate through a gate — all with vanilla HTML, CSS and JavaScript.

> Built as a portfolio project for Electronics & Telecommunication / Computer Engineering students who want something more tactile than a textbook truth table.

---

## ✨ Features

**Combinational logic**
- Interactive simulator for AND, OR, NOT, NAND, NOR, XOR, XNOR, Buffer with live LED output, circuit symbol, Boolean expression and auto-generated truth table (downloadable as CSV)
- Half Adder and Full Adder simulators with truth tables and equations
- 2:1 / 4:1 Multiplexer and 1:2 / 1:4 Demultiplexer simulators
- 4:2 Encoder and 2:4 Decoder (with enable line) simulators

**Simplification & sequential logic**
- Karnaugh Map solver (2, 3 and 4 variables) that groups adjacent minterms and derives a minimal SOP expression using a **Quine–McCluskey** implementation, with colour-coded prime-implicant groups
- SR, JK, D and T flip-flop lab with a manual clock, live Q/Q′ state, characteristic truth table and a canvas-drawn timing/waveform diagram

**Signal behaviour**
- Propagation-delay visualizer — toggle an input and watch the signal animate along the wire before the output LED updates, with an adjustable delay slider

**Build your own**
- Drag-and-drop Circuit Builder: drag gates onto a canvas, click an output port then an input port to wire them, simulate the whole network, delete nodes/wires, reset, and **export/import circuits as JSON**

**Tools & reference**
- Binary calculator: decimal ⇄ binary ⇄ hex ⇄ octal conversion, plus binary add/subtract/multiply/divide
- Learning Center with 13 reference cards (gates, Boolean algebra, truth tables, combinational/sequential circuits, flip-flops, encoders/decoders, MUX/DEMUX, adders, number systems)
- 15-question randomized quiz with a timer, progress bar, per-question explanations and score summary
- Instant search across gates, topics and simulators
- Dark/light theme toggle (persisted with `localStorage`)
- Fully responsive, keyboard-accessible, installable **PWA** with offline support via a service worker

---

## 📸 Screenshots

_Add screenshots or a short GIF walkthrough here once deployed, e.g.:_

```
/screenshots/hero.png
/screenshots/gates.png
/screenshots/kmap.png
/screenshots/circuit-builder.png
```

---

## 🗂 Folder Structure

```
logiclab/
├── index.html      # Markup for every section/simulator
├── style.css       # Design tokens, layout, components, responsive rules
├── script.js       # All simulator logic (vanilla ES6, modular IIFEs)
├── manifest.json    # PWA manifest (installable app metadata)
├── sw.js            # Service worker — cache-first offline support
├── icon.svg         # App icon / favicon
└── README.md
```

---

## 🚀 Installation

No build step, no dependencies, no backend.

```bash
git clone https://github.com/<your-username>/logiclab.git
cd logiclab
```

Then either:
- Open `index.html` directly in a browser, or
- Serve it locally for full PWA/service-worker behaviour:

```bash
npx serve .
# or
python -m http.server 8080
```

Visit the app, then use your browser's "Install App" option to add LogicLab to your desktop or home screen.

---

## 🛠 Technologies Used

| Layer | Choice |
|---|---|
| Markup | Semantic HTML5 |
| Styling | Hand-written CSS3 (custom properties, CSS Grid/Flexbox, glassmorphism) |
| Logic | Vanilla JavaScript (ES6), no frameworks |
| Data viz | `<canvas>` for waveform timing diagrams, SVG for gate symbols & wiring |
| Offline | Service Worker + Web App Manifest (PWA) |
| Fonts | Space Grotesk (display), Inter (body), JetBrains Mono (data/expressions) |

---

## 🧭 Future Improvements

- Multi-bit registers and a simple shift-register simulator
- Sharable circuit links (encode circuit JSON into the URL)
- Screenshot/export-to-PNG for the circuit builder
- Sound effects with a global mute toggle
- Larger K-Maps (5–6 variables) with don't-care support
- A guided "lesson mode" that chains simulators into a curriculum

---

## 📄 License

MIT License — free to use, modify and share for learning or portfolio purposes.

## 👤 Author

Built as a digital electronics learning project. Replace this section with your name, portfolio link and contact details before publishing.

---

## 🧳 Resume-Ready Content

### Resume bullet points
- Designed and built **LogicLab**, an offline-first digital electronics simulator covering 8 logic gates, K-Map minimization (Quine–McCluskey), flip-flops, MUX/DEMUX, encoders/decoders and a drag-and-drop circuit builder, using vanilla HTML/CSS/JavaScript with zero external frameworks.
- Implemented a Quine–McCluskey-based Karnaugh Map solver that derives minimal Boolean expressions from user-selected minterms and visualizes prime-implicant groupings.
- Engineered a custom circuit-evaluation engine supporting drag-and-drop gate placement, click-to-wire connections, real-time simulation, and JSON-based circuit export/import; shipped as an installable Progressive Web App with offline support via a service worker.

### LinkedIn project description
LogicLab is a fully client-side digital electronics virtual lab that turns first-semester logic design theory into an interactive playground: simulate all 8 standard logic gates, minimize expressions with a Karnaugh Map solver built on the Quine–McCluskey algorithm, drive SR/JK/D/T flip-flops through a manual clock while watching a live waveform, route signals through multiplexers/demultiplexers/encoders/decoders, and freely wire up custom circuits on a drag-and-drop canvas — all offline, installable as a PWA, with no backend or frameworks.

### GitHub repository description
Interactive, offline-first digital electronics virtual lab — logic gates, K-Map (Quine–McCluskey) solver, flip-flops, MUX/DEMUX, encoders/decoders, adders, propagation-delay visualization and a drag-and-drop circuit builder. Vanilla HTML/CSS/JS, installable as a PWA.

### Portfolio description
LogicLab reimagines the first digital electronics course as a hands-on browser lab. Every concept — from a single AND gate to a hand-wired combinational circuit — is something you click, drag and watch respond instantly, backed by real algorithms (Quine–McCluskey minimization, a topological circuit-evaluation engine) rather than static diagrams.

### Technologies used
HTML5 · CSS3 (Custom Properties, Grid, Flexbox, glassmorphism) · Vanilla JavaScript (ES6) · Canvas API · SVG · Web App Manifest · Service Worker API · `localStorage`

### Skills demonstrated
- Algorithm implementation (Quine–McCluskey Boolean minimization, topological circuit evaluation)
- DOM manipulation and event-driven UI architecture without a framework
- Responsive, accessible front-end design (keyboard navigation, ARIA roles, reduced-motion support)
- Progressive Web App engineering (manifest + service worker, offline caching strategy)
- Data visualization (canvas-based timing diagrams, dynamic SVG diagrams)
- Educational UX design for a technical audience

### Future enhancements
See **Future Improvements** above — multi-bit registers, shareable circuit URLs, PNG export, sound design, larger K-Maps with don't-care terms, and a guided lesson mode.
