# My Game Vault

Personal, iPhone-first physical game collection manager for Xbox One, Xbox Series X, and Nintendo Switch.

## Features
- Combined Xbox collection with Xbox One / Xbox Series X identification
- Separate Nintendo Switch collection
- Universal search
- Retail game-case-style spine cards; no cover artwork is required or displayed
- Tap a game spine to open its detailed game record
- Server-side duplicate protection by title/platform/edition and UPC when available
- Add, edit, and remove games
- JSON backup/restore support with merge or replace behavior
- Persistent server-side collection storage using Netlify Blobs
- Offline shell caching after first load

## Game entry workflow
Front and back game photos can be used as source material to identify the exact physical game/edition and populate its metadata. Those source photos are not required by the finished app and are not stored or displayed as collection artwork.

## Data and persistence
The live collection is stored server-side as JSON data in the Netlify Blobs `game-vault` store under the `collection` key. The browser loads the collection through `/api/games`, so clearing Safari/browser data or opening Game Vault in another browser does not erase the stored collection.

`game-imports.json` is the repository's import/seed source. It is merged into the persistent collection by the backend and is not the browser's local storage.

Collection records include title, platform, edition, UPC, summary, release information, developer/publisher, ESRB, player/co-op information, notes, physical-game metadata, and date added. Cover-image URLs and image filenames are not part of the active game schema.

No pricing or resale-value data is stored.

## Local development
Run `npm install`, then `npx netlify dev`.

Personal game collection manager. Not affiliated with or endorsed by Microsoft or Nintendo.
