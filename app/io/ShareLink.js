// ShareLink.js - Encode / decode a whole WaveDocument into a shareable URL.
//
// A share link carries the full `.wp` document inside the URL fragment, so it
// works on static hosting with no backend:
//
//     https://example.org/#d=<base64url( deflate-raw( .wp JSON ) )>
//
// The `.wp` JSON is exactly what JsonIO.buildDocumentJson() / saveToFile()
// produce, so a shared document round-trips through loadFromFileContent().
//
// This is also the format the WavePaint MCP server emits, letting an AI hand
// the user a ready-to-open WavePaint link. Also accepts `?d=`, and the
// uncompressed `#j=` / `?j=` variants.

(function (global) {
    'use strict';

    function bytesToBase64Url(bytes) {
        let bin = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function base64UrlToBytes(s) {
        s = s.replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        const bin = atob(s);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }

    async function deflateRaw(bytes) {
        const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    async function inflateRaw(bytes) {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    /**
     * Build a share URL for the given document.
     * @param {WaveDocument} doc
     * @param {string} [baseUrl] Defaults to the current page (without hash).
     * @returns {Promise<string>}
     */
    async function createShareLink(doc, baseUrl) {
        const json = buildDocumentJson(doc);
        const packed = await deflateRaw(new TextEncoder().encode(json));
        const base = (baseUrl || (location.origin + location.pathname)).replace(/[#?].*$/, '');
        return base + '#d=' + bytesToBase64Url(packed);
    }

    /**
     * Extract a `.wp` JSON string from the current URL, if present. Returns null
     * when there is no share payload.
     * @returns {Promise<string|null>}
     */
    async function readSharedJsonFromUrl() {
        const hash = location.hash && location.hash.length > 1 ? location.hash.slice(1) : '';
        const query = location.search && location.search.length > 1 ? location.search.slice(1) : '';
        const params = new URLSearchParams(hash || query);
        if (params.get('d')) {
            const raw = await inflateRaw(base64UrlToBytes(params.get('d')));
            return new TextDecoder().decode(raw);
        }
        if (params.get('j')) {
            return new TextDecoder().decode(base64UrlToBytes(params.get('j')));
        }
        return null;
    }

    /**
     * If the URL carries a shared document, load it into `doc`.
     * @returns {Promise<boolean>} true if a document was loaded.
     */
    async function loadDocFromLink(doc) {
        const json = await readSharedJsonFromUrl();
        if (!json) return false;
        return loadFromFileContent(doc, json);
    }

    function hasSharePayload() {
        return /[#?].*\b(d|j)=/.test(location.href);
    }

    global.ShareLink = { createShareLink, readSharedJsonFromUrl, loadDocFromLink, hasSharePayload };
    // Convenience globals used by the menu / app init
    global.createShareLink = createShareLink;
    global.loadDocFromLink = loadDocFromLink;
    global.hasSharePayload = hasSharePayload;
})(typeof window !== 'undefined' ? window : this);
