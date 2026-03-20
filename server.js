const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 1. Root endpoint: /
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index', 'index.html'));
});

// // 2. Get all games endpoint (DEPRECATED: now using dynamic scraping)

// app.get('/api/v1/games', (req, res) => {
//     res.json({ 
//         message: "This endpoint is deprecated as the API now uses dynamic scraping to support any Steam ID.",
//         games: [] 
//     });
// }); 

// 3. Get popular games from SteamSpy
app.get('/api/v1/popular', async (req, res) => {
    try {
        const spyResponse = await fetch('https://steamspy.com/api.php?request=top100forever');
        if (spyResponse.ok) {
            const data = await spyResponse.json();
            const steamSpyIds = Object.keys(data);
            
            // Return all top IDs since we can now scrape any game on the fly
            res.json({ popular: steamSpyIds });
        } else {
            res.status(spyResponse.status).json({ error: 'Failed to fetch popular games from SteamSpy API' });
        }
    } catch (e) {
        console.error('Error fetching SteamSpy API for popular games:', e.message);
        res.status(500).json({ error: 'Failed to fetch popular games' });
    }
});

// 4. Get a specific game by ID endpoint: /id
app.get('/api/v1/:id', async (req, res) => {
    const gameId = req.params.id;
    
    // 1. Fetch data from Steam API first to get the title
    let steamData = null;
    let gameTitle = null;
    try {
        const steamResponse = await fetch(`https://store.steampowered.com/api/appdetails?appids=${gameId}`);
        if (steamResponse.ok) {
            const steamJson = await steamResponse.json();
            if (steamJson[gameId] && steamJson[gameId].success) {
                steamData = steamJson[gameId].data;
                gameTitle = steamData.name;
            } else {
                steamData = { error: 'Game not found on Steam store.' };
            }
        } else {
            steamData = { error: `Steam API responded with status ${steamResponse.status}` };
        }
    } catch (e) {
        console.error(`Error fetching Steam API for game ${gameId}:`, e.message);
        steamData = { error: 'Failed to fetch from Steam API', details: e.message };
    }

    // 2. Dynamically Scrape download data if we have a title
    let downloadData = null;
    if (gameTitle) {
        console.log(`Searching FitGirl for: ${gameTitle}...`);
        downloadData = await scrapeFitGirl(gameTitle);
    }

    if (!downloadData) {
         return res.status(404).json({ 
            id: gameId,
            steam_data: steamData,
            error: 'No download links found for this game.' 
         });
    }

    // Return the combined Response (matching original structure)
    res.json({
        id: gameId,
        steam_data: steamData,
        download_data: downloadData
    });
});

// Helper function to scrape links directly from FitGirl website
async function scrapeFitGirl(gameTitle) {
    try {
        // Search for the game title on FitGirl site
        const searchUrl = `https://fitgirl-repacks.site/?s=${encodeURIComponent(gameTitle)}`;
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) return null;
        
        const searchHtml = await searchResponse.text();
        
        // Find the first post link in search results
        const postLinkMatch = searchHtml.match(/<h1 class="entry-title"><a href="(https:\/\/fitgirl-repacks\.site\/[^"]+)"/);
        if (!postLinkMatch) return null;
        
        const postUrl = postLinkMatch[1];
        
        // Fetch the actual post page
        const postResponse = await fetch(postUrl);
        if (!postResponse.ok) return null;
        
        const postHtml = await postResponse.text();
        
        // Extract links using regex (hosters like fuckingfast, datanodes, etc.)
        const links = [];
        const linkRegex = /href="(https?:\/\/(?:fuckingfast\.co|datanodes\.to|multiupload\.io|1337x\.to|tapochek\.net|datanodes\.to)[^"]+)"/g;
        
        let match;
        while ((match = linkRegex.exec(postHtml)) !== null) {
            const url = match[1];
            // Determine category based on URL
            let category = 'Direct Links';
            if (url.includes('1337x') || url.includes('tapochek') || url.includes('.torrent')) {
                category = 'Torrent';
            } else if (url.includes('fuckingfast') || url.includes('datanodes') || url.includes('multiupload')) {
                category = 'Direct Links';
            }
            
            if (!links.some(l => l.url === url)) {
                links.push({ category, url });
            }
        }
        
        if (links.length === 0) return null;

        return { 
            parsed_links: links,
            // You can optionally add more fields here if needed, but keeping it minimal to match previous structure
        };
    } catch (error) {
        console.error('Scraping error:', error);
        return null;
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
