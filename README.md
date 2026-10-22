# Bhagya Vastu · Navagraha (home page concept)

A 3D home page concept for Dr. Kkomal Vasisht's Bhagya Vastu, built on the content of https://bhagyavastu.com.

The page is a scroll-driven voyage through the nine grahas:

| Chapter | What the camera does |
|---|---|
| Hero | The whole Navagraha: a living sun, eight grahas on golden orbits, the twelve rashis |
| Trinity | Rises above the system |
| Vastu Shastra | Falls down a beam of light onto a glowing 9 × 9 Vastu mandala; a house rises from the grid |
| Vedic Astrology | Flies among the grahas, each named (Surya, Chandra, Mangal …) |
| Numerology | Each graha shows its number (1 Sun … 9 Mars) |
| Services, calculators, sciences, why, YouTube | Close-ups of Shani, Chandra, Guru, Surya and Mangal |
| About | Rahu in eclipse behind her portrait |
| Worldwide | A globe with arcs from Noida to Dubai, London, New York, Singapore, Sydney … |
| Close | The nine grahas fall into one line beneath "Ready to Transform", numbered 1–9 |

Run it with any static server (module scripts do not load from `file://`):

```
python3 -m http.server 8765
open http://localhost:8765/        # add ?debug for an FPS readout
```

Files: `index.html` (layout and her content), `scene.js` (Three.js r160 scene, from jsDelivr), `assets/` (her logo and portrait, from her site).
The page carries `noindex` and says "design concept" in the footer.
