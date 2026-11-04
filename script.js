// ==========================================
// MIXIFY — MUSIC MASHUP GENERATOR
// Audius API + Web Audio API
// ==========================================

const API_URL = "https://api.audius.co/v1";
const APP_NAME = "MusicMashupGenerator";
const DEFAULT_SEGMENT_DURATION = 60;

let selectedTracks = [];
let currentTrack = null;
let mashupUrl = null;
let visualizerFrame = null;

const currentAudio = new Audio();
const mashupAudio = document.getElementById("mashup-audio");

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const resultCount = document.getElementById("result-count");
const selectedList = document.getElementById("selected-tracks");
const generateButton = document.getElementById("generate-btn");
const mashupSection = document.getElementById("mashup-player");
const stopMashupButton = document.getElementById("stop-mashup-btn");
const generationStatus = document.getElementById("generation-status");

const nowPlaying = document.getElementById("now-playing");
const nowTime = document.getElementById("now-time");
const nowArt = document.getElementById("now-art");
const nowTitle = document.getElementById("now-title");
const nowArtist = document.getElementById("now-artist");
const nowPlayButton = document.getElementById("now-play-btn");
const nowStopButton = document.getElementById("now-stop-btn");
const nowStateText = document.getElementById("now-state-text");
const downloadButton = document.getElementById("download-mashup-btn");
const mashupDescription = document.getElementById("mashup-description");

let previewAudioContext = null;
let previewAnalyser = null;
let mashupAudioContext = null;
let mashupAnalyser = null;

// ---------- Helpers ----------

function getArtwork(track) {
    const artwork = track.artwork;
    if (!artwork) return "";
    return artwork["480x480"] || artwork["1000x1000"] || artwork["150x150"] || "";
}

function makeArtwork(track, className = "track-art") {
    const wrapper = document.createElement("div");
    wrapper.className = className;
    const url = getArtwork(track);

    if (url) {
        const image = document.createElement("img");
        image.src = url;
        image.alt = "";
        image.loading = "lazy";
        image.onerror = () => {
            wrapper.innerHTML = "♫";
        };
        wrapper.appendChild(image);
    } else {
        wrapper.textContent = "♫";
    }
    return wrapper;
}

function artistName(track) {
    return track.user?.name || "Unknown artist";
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
}

const DEFAULT_TRACK_SEGMENT_DURATION = 60;

function getEstimatedMashupDuration() {
    return selectedTracks.reduce((total, track) => {
        const requestedDuration = Number(track.segmentDuration) || DEFAULT_TRACK_SEGMENT_DURATION;
        const trackDuration = Number(track.duration);
        const usableDuration = Number.isFinite(trackDuration) && trackDuration > 0
            ? Math.min(requestedDuration, trackDuration)
            : requestedDuration;
        return total + usableDuration;
    }, 0);
}

function updateDurationEstimate() {
    const estimate = document.getElementById("estimated-mashup-duration");
    if (estimate) {
        estimate.textContent = `Estimated mashup duration: ${formatTime(getEstimatedMashupDuration())}`;
    }
}

// ---------- Search ----------

async function searchTracks(query) {
    searchResults.innerHTML = '<div class="empty-state"><strong>Searching Audius…</strong><p>Finding tracks for you.</p></div>';
    resultCount.textContent = "Searching";

    try {
        const params = new URLSearchParams({
            query,
            limit: "20",
            app_name: APP_NAME
        });

        const response = await fetch(`${API_URL}/tracks/search?${params}`);
        if (!response.ok) throw new Error(`Search failed: ${response.status}`);

        const data = await response.json();
        const tracks = data.data || [];
        displayTracks(tracks);
        resultCount.textContent = `${tracks.length} tracks found`;
    } catch (error) {
        console.error("Search error:", error);
        searchResults.innerHTML = '<div class="empty-state"><strong>Could not load tracks.</strong><p>Please try your search again.</p></div>';
        resultCount.textContent = "Search unavailable";
    }
}

function displayTracks(tracks) {
    searchResults.replaceChildren();

    if (!tracks.length) {
        searchResults.innerHTML = '<div class="empty-state"><div class="empty-symbol">♫</div><strong>No tracks found.</strong><p>Try another song, artist or genre.</p></div>';
        return;
    }

    tracks.forEach(track => {
        const item = document.createElement("article");
        item.className = "track-item";
        item.dataset.trackId = track.id;

        const artwork = makeArtwork(track);
        const info = document.createElement("div");
        info.className = "track-info";

        const title = document.createElement("h3");
        title.textContent = track.title || "Untitled track";
        const artist = document.createElement("p");
        artist.textContent = artistName(track);
        info.append(title, artist);

        const live = document.createElement("div");
        live.className = "track-live";
        live.innerHTML = '<span class="mini-bars"><i></i><i></i><i></i><i></i></span> PLAYING';

        const actions = document.createElement("div");
        actions.className = "track-actions";

        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.textContent = currentTrack?.id === track.id && !currentAudio.paused ? "Pause" : "Play";
        playButton.addEventListener("click", () => {
            if (currentTrack?.id === track.id && !currentAudio.paused) {
                pauseTrack();
            } else {
                playTrack(track);
            }
        });

        const stopButton = document.createElement("button");
        stopButton.type = "button";
        stopButton.className = "stop-button";
        stopButton.textContent = "Stop";
        stopButton.addEventListener("click", stopTrack);

        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.textContent = selectedTracks.some(item => item.id === track.id) ? "Added ✓" : "+ Add";
        addButton.disabled = selectedTracks.some(item => item.id === track.id);
        addButton.addEventListener("click", () => addTrack(track));

        actions.append(playButton, stopButton, addButton);
        item.append(artwork, info, live, actions);
        searchResults.appendChild(item);
    });

    updatePlayingUI();
}

// ---------- Actual audio visualizer ----------

function createVisualizer(audioElement, canvas, kind) {
    if (!canvas || !window.AudioContext) return null;

    try {
        const context = new AudioContext();
        const source = context.createMediaElementSource(audioElement);
        const analyser = context.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.82;
        source.connect(analyser);
        analyser.connect(context.destination);

        const ctx = canvas.getContext("2d");
        const data = new Uint8Array(analyser.frequencyBinCount);

        function draw() {
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            const dpr = window.devicePixelRatio || 1;

            if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
                canvas.width = Math.floor(width * dpr);
                canvas.height = Math.floor(height * dpr);
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, width, height);
            analyser.getByteFrequencyData(data);

            const bars = 48;
            const gap = 3;
            const barWidth = Math.max(2, (width - gap * (bars - 1)) / bars);

            for (let i = 0; i < bars; i++) {
                const value = data[Math.floor(i * data.length / bars)] / 255;
                const idle = audioElement.paused ? 0.08 + (Math.sin(Date.now() / 450 + i * 0.6) + 1) * 0.035 : 0.06;
                const barHeight = Math.max(3, (value + idle) * height * 0.92);
                const x = i * (barWidth + gap);
                const y = (height - barHeight) / 2;
                const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
                gradient.addColorStop(0, "#e6a1f5");
                gradient.addColorStop(1, "#8060e8");
                ctx.fillStyle = gradient;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x, y, barWidth, barHeight, 3);
                else ctx.rect(x, y, barWidth, barHeight);
                ctx.fill();
            }
            requestAnimationFrame(draw);
        }

        draw();
        return { context, analyser };
    } catch (error) {
        console.warn(`Could not initialize ${kind} visualizer:`, error);
        return null;
    }
}

function initializeVisualizers() {
    currentAudio.crossOrigin = "anonymous";
    mashupAudio.crossOrigin = "anonymous";
    previewAudioContext = createVisualizer(currentAudio, document.getElementById("track-visualizer"), "track");
    mashupAudioContext = createVisualizer(mashupAudio, document.getElementById("mashup-visualizer"), "mashup");
}

// ---------- Now playing ----------

function updatePlaybackTime() {
    const current = currentAudio.currentTime || 0;
    const duration = Number.isFinite(currentAudio.duration)
        ? currentAudio.duration
        : 0;

    nowTime.textContent =
        `${formatTime(current)} / ${formatTime(duration)}`;
}

function updateNowPlaying(track) {
    nowTitle.textContent = track?.title || "Nothing playing";
    nowArtist.textContent = track ? artistName(track) : "Choose a track to preview";
    nowArt.replaceChildren();
    nowTime.textContent = "0:00 / 0:00";

    if (track && getArtwork(track)) {
        const img = document.createElement("img");
        img.src = getArtwork(track);
        img.alt = "";
        nowArt.appendChild(img);
    } else {
        nowArt.textContent = "♫";
    }
}

function updatePlayingUI() {
    document.querySelectorAll(".track-item").forEach(item => {
        const isActive = currentTrack && item.dataset.trackId === String(currentTrack.id);
        item.classList.toggle("is-playing", Boolean(isActive && !currentAudio.paused));
        const button = item.querySelector(".track-actions button");
        if (button && isActive) button.textContent = currentAudio.paused ? "Play" : "Pause";
        else if (button) button.textContent = "Play";
    });

    const isPlaying = Boolean(currentTrack && !currentAudio.paused);
    nowPlaying.classList.toggle("is-playing", isPlaying);
    nowPlayButton.textContent = isPlaying ? "Ⅱ" : "▶";
    nowPlayButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    nowStateText.textContent = isPlaying ? "NOW PLAYING" : (currentTrack ? "PAUSED" : "READY");
}

async function playTrack(track) {
    try {
        if (currentTrack?.id !== track.id) {
            currentAudio.pause();
            currentAudio.removeAttribute("src");
            currentAudio.load();
            currentTrack = track;
            updateNowPlaying(track);

            const params = new URLSearchParams({ app_name: APP_NAME });
            currentAudio.src = `${API_URL}/tracks/${encodeURIComponent(track.id)}/stream?${params}`;
        }

        if (previewAudioContext?.context.state === "suspended") {
            await previewAudioContext.context.resume();
        }

        await currentAudio.play();
        updatePlayingUI();
    } catch (error) {
        console.error("Playback error:", error);
        updatePlayingUI();
        alert("Unable to play this track. Please try another one.");
    }
}

function pauseTrack() {
    currentAudio.pause();
    updatePlayingUI();
}

function stopTrack() {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentTrack = null;
    updateNowPlaying(null);
    updatePlayingUI();
}

nowPlayButton.addEventListener("click", () => {
    if (!currentTrack) return;
    if (currentAudio.paused) playTrack(currentTrack);
    else pauseTrack();
});
nowStopButton.addEventListener("click", stopTrack);
currentAudio.addEventListener("play", updatePlayingUI);
currentAudio.addEventListener("pause", updatePlayingUI);
currentAudio.addEventListener("ended", stopTrack);
currentAudio.addEventListener("timeupdate", updatePlaybackTime);
currentAudio.addEventListener("loadedmetadata", updatePlaybackTime);
currentAudio.addEventListener("durationchange", updatePlaybackTime);

// ---------- Selected tracks ----------

function addTrack(track) {
    if (selectedTracks.some(item => item.id === track.id)) return;
    selectedTracks.push({ ...track, segmentDuration: DEFAULT_TRACK_SEGMENT_DURATION });
    updateSelectedTracks();
    displayCurrentSearchAddStates();
}

function displayCurrentSearchAddStates() {
    document.querySelectorAll(".track-item").forEach(item => {
        const trackIsAdded = selectedTracks.some(track => String(track.id) === item.dataset.trackId);
        const addButton = item.querySelector(".track-actions button:last-child");
        if (addButton) {
            addButton.disabled = trackIsAdded;
            addButton.textContent = trackIsAdded ? "Added ✓" : "+ Add";
        }
    });
}

function removeTrack(trackId) {
    selectedTracks = selectedTracks.filter(track => track.id !== trackId);
    updateSelectedTracks();
    displayCurrentSearchAddStates();
}

function updateSelectedTracks() {
    selectedList.replaceChildren();

    if (!selectedTracks.length) {
        selectedList.innerHTML = '<div class="empty-state compact"><div class="empty-symbol">＋</div><strong>Your lineup is empty.</strong><p>Add tracks from your search results.</p></div>';
    } else {
        selectedTracks.forEach((track, index) => {
            const item = document.createElement("div");
            item.className = "selected-item";

            const number = document.createElement("span");
            number.className = "selected-number";
            number.textContent = String(index + 1).padStart(2, "0");

            const art = makeArtwork(track);
            art.className = "track-art";
            const info = document.createElement("div");
            info.className = "track-info";
            const title = document.createElement("h3");
            title.textContent = track.title || "Untitled track";
            const artist = document.createElement("p");
            artist.textContent = artistName(track);
            info.append(title, artist);

            const durationControl = document.createElement("div");
            durationControl.className = "selected-duration-control";

            const durationHeader = document.createElement("div");
            durationHeader.className = "selected-duration-header";
            const durationLabel = document.createElement("label");
            durationLabel.textContent = "Segment duration";
            const durationValue = document.createElement("strong");
            durationValue.textContent = `${track.segmentDuration || DEFAULT_TRACK_SEGMENT_DURATION} sec`;
            durationHeader.append(durationLabel, durationValue);

            const durationInput = document.createElement("input");
            durationInput.type = "range";
            durationInput.min = "5";
            durationInput.max = "180";
            durationInput.step = "5";
            durationInput.value = String(track.segmentDuration || DEFAULT_TRACK_SEGMENT_DURATION);
            durationInput.setAttribute("aria-label", `Segment duration for ${track.title || "selected track"}`);
            durationInput.addEventListener("input", () => {
                track.segmentDuration = Number(durationInput.value);
                durationValue.textContent = `${track.segmentDuration} sec`;
                updateDurationEstimate();
            });
            durationControl.append(durationHeader, durationInput);

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "remove-btn";
            remove.textContent = "Remove";
            remove.addEventListener("click", () => removeTrack(track.id));

            item.append(number, art, info, remove, durationControl);
            selectedList.appendChild(item);
        });
    }

    document.getElementById("selection-count").textContent =
        `${selectedTracks.length} ${selectedTracks.length === 1 ? "track" : "tracks"} selected`;
    generateButton.disabled = selectedTracks.length < 2;
    updateDurationEstimate();
}

// ---------- Mashup generation ----------

async function fetchAudioBuffer(track, audioContext) {
    const params = new URLSearchParams({ app_name: APP_NAME });
    const streamUrl = `${API_URL}/tracks/${encodeURIComponent(track.id)}/stream?${params}`;
    const response = await fetch(streamUrl);
    if (!response.ok) throw new Error(`Unable to fetch "${track.title}": ${response.status}`);
    return audioContext.decodeAudioData(await response.arrayBuffer());
}

async function generateMashup() {
    if (selectedTracks.length < 2) {
        alert("Please select at least two tracks.");
        return;
    }

    const tracksToMix = [...selectedTracks];
    let audioContext;

    generateButton.disabled = true;
    generateButton.textContent = "Preparing your mix…";
    generationStatus.textContent = "Loading and processing your selected tracks…";

    try {
        audioContext = new AudioContext();
        await audioContext.resume();

        const buffers = [];
        for (let i = 0; i < tracksToMix.length; i++) {
            generationStatus.textContent = `Processing track ${i + 1} of ${tracksToMix.length}: ${tracksToMix[i].title}`;
            buffers.push(await fetchAudioBuffer(tracksToMix[i], audioContext));
        }

        const durations = buffers.map((buffer, index) =>
            Math.min(Number(tracksToMix[index].segmentDuration) || DEFAULT_TRACK_SEGMENT_DURATION, buffer.duration)
        );
        const sampleRate = audioContext.sampleRate;
        const channels = 2;
        const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
        const output = audioContext.createBuffer(channels, Math.ceil(totalDuration * sampleRate), sampleRate);

        let position = 0;
        buffers.forEach((buffer, index) => {
            const sampleCount = Math.min(Math.floor(durations[index] * sampleRate), buffer.length);
            for (let channel = 0; channel < channels; channel++) {
                const source = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
                const destination = output.getChannelData(channel);
                for (let i = 0; i < sampleCount; i++) {
                    destination[position + i] = source[i];
                }
            }
            position += sampleCount;
        });

        const wavBlob = audioBufferToWav(output);
        if (mashupUrl) URL.revokeObjectURL(mashupUrl);
        mashupUrl = URL.createObjectURL(wavBlob);

        mashupAudio.pause();
        mashupAudio.src = mashupUrl;
        mashupAudio.load();
        downloadButton.href = mashupUrl;
        const durationSummary = tracksToMix
            .map(track => `${track.title || "Track"}: ${Math.min(Number(track.segmentDuration) || DEFAULT_TRACK_SEGMENT_DURATION, Number(track.duration) || Number(track.segmentDuration) || DEFAULT_TRACK_SEGMENT_DURATION)}s`)
            .join(" · ");
        mashupDescription.textContent =
            `${tracksToMix.length} tracks · ${formatTime(totalDuration)} total · ${durationSummary}`;

        mashupSection.hidden = false;
        generationStatus.textContent = "Your mashup has been created successfully.";
        mashupSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
        console.error("Mashup generation error:", error);
        generationStatus.textContent = "Mashup generation failed. Please try again.";
        alert("Unable to generate mashup. Check the browser console for details.");
    } finally {
        if (audioContext) await audioContext.close();
        generateButton.disabled = selectedTracks.length < 2;
        generateButton.innerHTML = "<span>✦</span> Generate mashup <span>→</span>";
    }
}

function audioBufferToWav(buffer) {
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const samples = buffer.length;
    const bytesPerSample = 2;
    const dataSize = samples * channels * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    function writeString(offset, string) {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bytesPerSample, true);
    view.setUint16(32, channels * bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < samples; i++) {
        for (let channel = 0; channel < channels; channel++) {
            const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
            view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
            offset += 2;
        }
    }
    return new Blob([arrayBuffer], { type: "audio/wav" });
}

function stopMashup() {
    mashupAudio.pause();
    mashupAudio.currentTime = 0;
}

// Resume the mashup AudioContext when the user starts playback.
// Browsers commonly create AudioContexts in the suspended state until
// playback is initiated by a user gesture.
mashupAudio.addEventListener("play", async () => {
    try {
        if (mashupAudioContext && mashupAudioContext.context.state !== "running") {
            await mashupAudioContext.context.resume();
        }
        console.log("Mashup AudioContext state:", mashupAudioContext?.context.state);
    } catch (error) {
        console.error("Could not resume mashup AudioContext:", error);
    }
});

mashupAudio.addEventListener("error", () => {
    console.error("Mashup audio playback error:", mashupAudio.error);
});


searchForm.addEventListener("submit", event => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) {
        searchInput.focus();
        return;
    }
    searchTracks(query);
});

generateButton.addEventListener("click", generateMashup);
stopMashupButton.addEventListener("click", stopMashup);

initializeVisualizers();
updateSelectedTracks();
updateDurationEstimate();
console.log("Mixify initialized.");
