# 🎵Mixify - Music Mashup Generator

**Mixify** is a browser-based music mashup generator that allows users to search for songs, select multiple tracks, customize the duration of each song segment, and combine them into a single downloadable audio mashup.

This project is developed as part of my **Trimester-End Project**.

The goal is to explore how web technologies and audio processing can be combined to create an interactive music application.

---

## ✨ Features

### 🎧 Music Discovery
- Search for songs using the Audius API.
- Browse tracks with album artwork, song titles, and artist information.
- Preview individual songs before adding them to the mashup.

### 🎼 Custom Mashup Creation
- Add multiple songs to a selected track lineup.
- Customize the segment duration of **each song individually**.
- Choose how much of each track should be included in the final mashup.
- View the estimated total mashup duration.
- Generate a combined audio track from the selected songs.

### 🎚️ Audio Playback
- Play and pause individual song previews.
- Control mashup playback.
- View the currently playing song.
- Display elapsed playback time and total duration.
- Visualize audio activity through an interactive audio visualizer.

### 💾 Export
- Generate the final mashup as a WAV audio file.
- Download the generated mashup to your device.

### 📱 User Interface
- Modern dark-themed interface.
- Responsive layout.
- Interactive track cards and playback controls.
- Dedicated Now Playing section.

---
### 🌐 Live Demo

Try Mixify here: [Launch Mixify](https://project-mmg.vercel.app/)
---

## 🛠️ Tech Stack & Skills Used

| Technology | How it is used |
| HTML5 | Application structure and audio elements |
| CSS3 | Styling, responsive layouts, animations and UI design |
| JavaScript (ES6+) | Application logic, event handling and dynamic updates |
| Audius API | Music search and audio streaming |
| Web Audio API | Audio processing, playback analysis and visualization |
| Canvas API | Rendering the audio visualizer |
| Fetch API | Making HTTP requests to retrieve music data |
| Git & GitHub | Version control and project management |

### Technical Concepts Implemented
-**HTML5:** Semantic elements, forms, audio and canvas elements.
- **CSS3:** Flexbox, Grid, responsive design, animations and transitions.
- **JavaScript (ES6+):** DOM manipulation, event handling, array methods, Promises, async/await and Fetch API.
- **Web APIs:** Audius API integration, Web Audio API and Canvas API.
- **Other:** JSON handling, audio processing and WAV file generation.

## 🚀 Getting Started

### Installation

1. Clone the repository:

   ```bash
   git clone <https://github.com/snehachandra1108/Project-MMG>
   ```

2. Navigate to the project directory:

   ```bash
   cd Project-MMG
   ```

3. Open the project in Visual Studio Code:

   ```bash
   code .
   ```

4. Run `index.html` using the Live Server extension.

5. Start searching for songs and creating your mashups!

---

## 📂 Project Structure

```text
Project-MMG/
│
├── index.html       # Application structure
├── style.css        # Styling and responsive design
├── script.js        # Application logic and audio processing
└── README.md        # Project documentation
```

---

## 🔮 Future Improvements

Some features that could be explored in future versions:

- Individual start and end points for every song segment.
- Smooth transitions and crossfading between tracks.
- Audio effects such as fade-in, fade-out and volume adjustment.
- More advanced mashup customization.
- User accounts and saved mashup projects.
- Additional music discovery and streaming integrations.

---

## ⚠️ Important Note

Music availability through the Audius API does not automatically grant permission to remix, modify, or redistribute tracks. Users should ensure that they have the necessary rights or permissions before exporting or sharing mashups.

---

## 👩‍💻 About the Project

**Project:** Mixify - Music Mashup Generator  
**Category:** Web Development  
**Academic Context:** Trimester-End Project  

Built as an opportunity to apply web development concepts, explore browser-based audio processing, integrate external APIs, and develop an interactive application.

---
