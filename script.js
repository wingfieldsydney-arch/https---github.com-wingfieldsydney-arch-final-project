// ===============================
// SPOTIFY + FIREBASE FINAL PROJECT
// Save as: script.js
// ===============================

// ---------- FIREBASE IMPORTS ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- FIREBASE CONFIG ----------
// Replace with YOUR Firebase values
const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_AUTH_DOMAIN",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_STORAGE_BUCKET",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const favoritesCollection = collection(db, "favorites");

// ---------- SPOTIFY SETTINGS ----------
const clientId = "PASTE_SPOTIFY_CLIENT_ID";
const redirectUri = "http://127.0.0.1:5501/Home.html";

// ---------- LOGIN BUTTON ----------
function createLoginButton() {
  if (localStorage.getItem("spotifyToken")) return;

  const btn = document.createElement("button");
  btn.textContent = "Login with Spotify";
  btn.style.display = "block";
  btn.style.margin = "20px auto";

  btn.addEventListener("click", () => {
    window.location.href =
      `https://accounts.spotify.com/authorize?client_id=${clientId}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;
  });

  document.body.insertBefore(btn, document.body.children[1]);
}

// ---------- GET TOKEN ----------
function getToken() {
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");

    if (token) {
      localStorage.setItem("spotifyToken", token);
      window.location.href = "Home.html";
    }
  }

  return localStorage.getItem("spotifyToken");
}

// ---------- SPOTIFY SEARCH ----------
async function searchSpotify(query, type) {
  const token = getToken();

  if (!token) {
    alert("Please login to Spotify first.");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=8`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error("Spotify API failed");
    }

    return await response.json();
  } catch (error) {
    console.log(error);
    alert("Could not load Spotify data.");
    return null;
  }
}

// ---------- DISPLAY RESULTS ----------
function showTracks(tracks) {
  const container = document.getElementById("api-results-container");
  if (!container) return;

  container.innerHTML = "<h2>Tracks</h2>";

  tracks.forEach(track => {
    const card = document.createElement("div");
    card.className = "result-card";

    const image = track.album.images[0]?.url || "";

    card.innerHTML = `
      <img src="${image}">
      <h3>${track.name}</h3>
      <p>${track.artists.map(a => a.name).join(", ")}</p>
      <button>Add Favorite</button>
    `;

    card.querySelector("button").addEventListener("click", async () => {
      await addFavorite(track.name, "Track");
    });

    container.appendChild(card);
  });
}

function showArtists(artists) {
  const container = document.getElementById("api-results-container");
  if (!container) return;

  container.innerHTML = "<h2>Artists</h2>";

  artists.forEach(artist => {
    const card = document.createElement("div");
    card.className = "result-card";

    const image = artist.images[0]?.url || "";

    card.innerHTML = `
      <img src="${image}">
      <h3>${artist.name}</h3>
      <p>Followers: ${artist.followers.total}</p>
      <button>Add Favorite</button>
    `;

    card.querySelector("button").addEventListener("click", async () => {
      await addFavorite(artist.name, "Artist");
    });

    container.appendChild(card);
  });
}

// ---------- FIREBASE CRUD ----------

// CREATE
async function addFavorite(name, type) {
  await addDoc(favoritesCollection, {
    name: name,
    type: type,
    note: "Favorite item"
  });

  loadFavorites();
}

// READ
async function loadFavorites() {
  let container = document.getElementById("favorites-container");

  if (!container) {
    const box = document.createElement("div");
    box.className = "results-box";
    box.innerHTML = `
      <h3>Favorites</h3>
      <div id="favorites-container"></div>
    `;
    document.body.appendChild(box);
    container = document.getElementById("favorites-container");
  }

  container.innerHTML = "";

  const snapshot = await getDocs(favoritesCollection);

  snapshot.forEach(item => {
    const data = item.data();

    const card = document.createElement("div");
    card.className = "result-card";

    card.innerHTML = `
      <h3>${data.name}</h3>
      <p>${data.type}</p>
      <p>${data.note}</p>
      <button class="editBtn">Edit</button>
      <button class="deleteBtn">Delete</button>
    `;

    // UPDATE
    card.querySelector(".editBtn").addEventListener("click", async () => {
      const newNote = prompt("New note:", data.note);

      if (newNote) {
        await updateDoc(doc(db, "favorites", item.id), {
          note: newNote
        });

        loadFavorites();
      }
    });

    // DELETE
    card.querySelector(".deleteBtn").addEventListener("click", async () => {
      await deleteDoc(doc(db, "favorites", item.id));
      loadFavorites();
    });

    container.appendChild(card);
  });
}

// ---------- PAGE BUTTONS ----------
document.addEventListener("DOMContentLoaded", () => {
  createLoginButton();
  getToken();
  loadFavorites();

  const searchBtn = document.getElementById("search-button");
  const trackBtn = document.getElementById("add-track-button");
  const clearBtn = document.getElementById("clear-button");

  if (searchBtn) {
    searchBtn.addEventListener("click", async () => {
      const query = document.getElementById("search-input").value;

      if (window.location.pathname.toLowerCase().includes("artists")) {
        const data = await searchSpotify(query, "artist");
        if (data) showArtists(data.artists.items);
      } else {
        const data = await searchSpotify(query, "track");
        if (data) showTracks(data.tracks.items);
      }
    });
  }

  if (trackBtn) {
    trackBtn.addEventListener("click", async () => {
      const query = document.getElementById("track-input").value;
      const data = await searchSpotify(query, "track");

      if (data) showTracks(data.tracks.items);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const container = document.getElementById("api-results-container");
      if (container) container.innerHTML = "";
    });
  }
});