const clientId = "PASTE_YOUR_SPOTIFY_CLIENT_ID_HERE";
const redirectUri = "http://127.0.0.1:5501/Home.html";

const authEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const apiEndpoint = "https://api.spotify.com/v1";

function randomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

async function createCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function loginToSpotify() {
  const verifier = randomString(64);
  const challenge = await createCodeChallenge(verifier);

  localStorage.setItem("spotify_verifier", verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge
  });

  window.location.href = `${authEndpoint}?${params.toString()}`;
}

async function getAccessToken(code) {
  const verifier = localStorage.getItem("spotify_verifier");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUri,
    code_verifier: verifier
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body
  });

  const data = await response.json();

  if (data.access_token) {
    localStorage.setItem("spotify_token", data.access_token);
    window.location.href = "Home.html";
  } else {
    alert("Spotify login failed. Check your Client ID and Redirect URI.");
    console.log(data);
  }
}

function getToken() {
  return localStorage.getItem("spotify_token");
}

function addLoginButton() {
  if (getToken()) return;

  const button = document.createElement("button");
  button.textContent = "Login with Spotify";
  button.style.display = "block";
  button.style.margin = "20px auto";
  button.addEventListener("click", loginToSpotify);

  document.body.insertBefore(button, document.body.children[1]);
}

async function spotifySearch(query, type) {
  const token = getToken();

  if (!token) {
    alert("Please login with Spotify first.");
    return;
  }

  const response = await fetch(
    `${apiEndpoint}/search?q=${encodeURIComponent(query)}&type=${type}&limit=12`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return await response.json();
}

function displayResults(data, pageType) {
  const container = document.getElementById("api-results-container");

  if (!container) return;

  container.innerHTML = "";

  if (pageType === "search") {
    displayTracks(data.tracks?.items || [], container);
    displayArtists(data.artists?.items || [], container);
    displayAlbums(data.albums?.items || [], container);
  }

  if (pageType === "artists") {
    displayArtists(data.artists?.items || [], container);
  }

  if (pageType === "tracks") {
    displayTracks(data.tracks?.items || [], container);
  }
}

function displayTracks(tracks, container) {
  const title = document.createElement("h2");
  title.textContent = "Tracks";
  container.appendChild(title);

  tracks.forEach(track => {
    const card = document.createElement("div");
    card.className = "result-card";

    const image = track.album.images[0]?.url || "";

    card.innerHTML = `
      <img src="${image}" alt="${track.name}">
      <h3>${track.name}</h3>
      <p>Artist: ${track.artists.map(artist => artist.name).join(", ")}</p>
      <p>Album: ${track.album.name}</p>
      <a href="${track.external_urls.spotify}" target="_blank">Open on Spotify</a>
    `;

    container.appendChild(card);
  });
}

function displayArtists(artists, container) {
  const title = document.createElement("h2");
  title.textContent = "Artists";
  container.appendChild(title);

  artists.forEach(artist => {
    const card = document.createElement("div");
    card.className = "result-card";

    const image = artist.images[0]?.url || "";

    card.innerHTML = `
      <img src="${image}" alt="${artist.name}">
      <h3>${artist.name}</h3>
      <p>Followers: ${artist.followers.total.toLocaleString()}</p>
      <p>Genres: ${artist.genres.join(", ") || "No genres listed"}</p>
      <a href="${artist.external_urls.spotify}" target="_blank">Open on Spotify</a>
    `;

    container.appendChild(card);
  });
}

function displayAlbums(albums, container) {
  const title = document.createElement("h2");
  title.textContent = "Albums";
  container.appendChild(title);

  albums.forEach(album => {
    const card = document.createElement("div");
    card.className = "result-card";

    const image = album.images[0]?.url || "";

    card.innerHTML = `
      <img src="${image}" alt="${album.name}">
      <h3>${album.name}</h3>
      <p>Artist: ${album.artists.map(artist => artist.name).join(", ")}</p>
      <p>Release Date: ${album.release_date}</p>
      <a href="${album.external_urls.spotify}" target="_blank">Open on Spotify</a>
    `;

    container.appendChild(card);
  });
}

function clearResults() {
  const container = document.getElementById("api-results-container");
  if (container) container.innerHTML = "";
}

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    await getAccessToken(code);
    return;
  }

  addLoginButton();

  const page = window.location.pathname.toLowerCase();

  const searchButton = document.getElementById("search-button");
  const clearButton = document.getElementById("clear-button");
  const addTrackButton = document.getElementById("add-track-button");

  if (searchButton) {
    searchButton.addEventListener("click", async () => {
      const input = document.getElementById("search-input");
      const query = input.value.trim();

      if (query === "") {
        alert("Please enter something to search.");
        return;
      }

      let data;

      if (page.includes("artists")) {
        data = await spotifySearch(query, "artist");
        displayResults(data, "artists");
      } else {
        data = await spotifySearch(query, "track,artist,album");
        displayResults(data, "search");
      }
    });
  }

  if (addTrackButton) {
    addTrackButton.addEventListener("click", async () => {
      const input = document.getElementById("track-input");
      const query = input.value.trim();

      if (query === "") {
        alert("Please enter a track name.");
        return;
      }

      const data = await spotifySearch(query, "track");
      displayResults(data, "tracks");
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", clearResults);
  }
});