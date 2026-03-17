# FitGirl API Backend

This is a custom Node.js/Express backend REST API designed to serve game data. It acts as an aggregator, combining official game metadata dynamically fetched from the Steam API with backed download links from the official FitGirl Repacks website.

## Features
- **Steam API Integration:** Automatically fetches rich game metadata (title, description, release date, images, system requirements) from the official Steam Store using the Game App ID.
- **Link Data Parsing:** Reads and parses text or JSON files stored in the `data/` directory to extract organized download links.
- **Combined JSON Response:** Merges the official Steam data with backed download links from the official FitGirl Repacks website into a single, cohesive JSON response.
- **CORS Enabled:** Cross-Origin Resource Sharing is built-in, meaning the API is ready to be consumed seamlessly by any frontend web application.

## Endpoints

### 1. Root Endpoint
- **URL:** `/`
- **Method:** `GET`
- **Description:** Serves the default `index.html` landing page, providing a web interface or documentation for the API.

### 2. Get All Games
- **URL:** `/api/v1/games`
- **Method:** `GET`
- **Description:** Scans the `data/` directory and returns a list of all available games based on the filenames stored there.
- **Response Example:**
  ```json
  {
    "games": [
      {
        "id": "271590",
        "filename": "271590.txt"
      }
    ]
  }
  ```

### 3. Get Game Details by ID
- **URL:** `/api/v1/:id`
- **Method:** `GET`
- **Parameters:** `:id` (The Steam App ID of the game, e.g., `271590` for GTA V)
- **Description:** This is the core endpoint of the application. It performs two main tasks simultaneously:
  1. **Parses Link Data:** Looks for a file named `data/<id>.json` or `data/<id>` (plain text) in the data folder, containing backed links from the official FitGirl Repacks website. If it encounters plain text, it structurally parses markdown-style headings (e.g., `## Filehosts`) and bulleted links to generate a categorized list of download links.
  2. **Fetches Steam Data:** Makes an external request to the Steam Store API (`https://store.steampowered.com/api/appdetails?appids=<id>`) to get the game's official details.
- **Response Example:**
  ```json
  {
    "id": "271590",
    "steam_data": {
      "type": "game",
      "name": "Grand Theft Auto V",
      "steam_appid": 271590,
      "short_description": "...",
      "header_image": "https://..."
    },
    "download_data": {
      "parsed_links": [
        {
          "category": "Direct Links",
          "url": "http://example.com/download/part1.rar"
        }
      ]
    }
  }
  ```

## How to Format the `data` Directory
To add backed links for a specific game, simply create a file in the `data/` folder named exactly as the game's Steam App ID. For example, to add links for Grand Theft Auto V, create `data/271590` or `data/271590.json`.

If using plain text, you can easily categorize your links like this:
```text
## Direct Links
- http://filehost.example.com/download/part1.rar
- http://filehost.example.com/download/part2.rar

## Torrents
- magnet:?xt=urn:btih:example...
```
The API will intelligently parse the `##` lines as categories and the `-` lines as URLs.

## Installation and Setup
1. **Prerequisites:** Ensure you have Node.js installed (v18 or higher is required due to the use of the native `fetch` API).
2. Clone or download this project repository.
3. Open a terminal in the project folder and run `npm install` to install required dependencies (`express`, `cors`).
4. Run `node server.js` to start the backend server.
5. The API will now be listening locally at `http://localhost:3000`.

## Legal Notice
Please read the [LEGAL.md](LEGAL.md) file carefully for important legal disclaimers and information regarding the nature and use of this software.
