const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(express.json());

// 1. Root endpoint: /
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index', 'index.html'));
});

// 2. Get all games endpoint: /games
app.get('/api/v1/games', (req, res) => {
    fs.readdir(DATA_DIR, (err, files) => {
        if (err) {
            // If the data directory doesn't exist yet
            if (err.code === 'ENOENT') {
                return res.json({ games: [] });
            }
            return res.status(500).json({ error: 'Failed to read data directory' });
        }
        
        // Extract game IDs from filenames
        const games = files.map(file => path.basename(file, path.extname(file)));
        
        res.json({ games });
    });
}); 

// 3. Get a specific game by ID endpoint: /id
app.get('/api/v1/:id', async (req, res) => {
    const gameId = req.params.id;
    
    // Support files with or without .json extension (based on the sample data)
    const exactFilePath = path.join(DATA_DIR, `${gameId}.json`);
    const noExtFilePath = path.join(DATA_DIR, gameId);

    let localDownloadData = null;
    
    // Read data if it exists
    let filePathToRead = null;
    if (fs.existsSync(exactFilePath)) {
        filePathToRead = exactFilePath;
    } else if (fs.existsSync(noExtFilePath)) {
        filePathToRead = noExtFilePath;
    }

    if (filePathToRead) {
        try {
            const data = fs.readFileSync(filePathToRead, 'utf8');
            try {
                // Try to parse it as JSON if it is valid JSON
                localDownloadData = JSON.parse(data);
            } catch (e) {
                // If it's plain text (like the text file with links), parse the URLs
                const links = [];
                const lines = data.split('\n');
                let currentSection = 'General';
                
                for (let line of lines) {
                    line = line.trim();
                    if (!line) continue;
                    
                    if (line.startsWith('##')) {
                        currentSection = line.replace('##', '').trim();
                    } else if (line.startsWith('- http') || line.startsWith('http')) {
                        let linkUrl = line.startsWith('- ') ? line.substring(2).trim() : line;
                        links.push({ category: currentSection, url: linkUrl });
                    }
                }
                
                localDownloadData = {
                    parsed_links: links,
                    // raw_text: data
                };
            }
        } catch (e) {
            console.error(`Error reading data file for game ${gameId}:`, e);
            localDownloadData = { error: 'Failed to read data' };
        }
    }

    // Fetch data from Steam API
    let steamData = null;
    try {
        // Using global fetch (Requires Node 18+)
        const steamResponse = await fetch(`https://store.steampowered.com/api/appdetails?appids=${gameId}`);
        if (steamResponse.ok) {
            const steamJson = await steamResponse.json();
            // The API returns an object with the game ID as the key, e.g., {"271590": { "success": true, "data": {...} }}
            if (steamJson[gameId] && steamJson[gameId].success) {
                steamData = steamJson[gameId].data;
            } else {
                steamData = { error: 'Game not found on Steam or no successful response.' };
            }
        } else {
            steamData = { error: `Steam API responded with status ${steamResponse.status}` };
        }
    } catch (e) {
        console.error(`Error fetching Steam API for game ${gameId}:`, e.message);
        steamData = { error: 'Failed to fetch from Steam API', details: e.message };
    }

    // Return the combined Response
    res.json({
        id: gameId,
        steam_data: steamData,
        download_data: localDownloadData || { message: 'No backed links found from the official FitGirl website' }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
