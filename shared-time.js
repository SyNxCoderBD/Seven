// shared-time.js
// Server-synced clock module. Fetches the real time from an online time
// server every 10 seconds and exposes now() so warning expiration checks are
// driven by a trusted clock instead of the (possibly wrong) device clock.

let serverTime = null;          // most recent online timestamp (ms, UTC)
let perfBaseline = null;        // performance.now() captured when serverTime was set
let lastSyncAt = null;          // last successful sync wall-clock (ms)
let lastError = null;           // last sync failure description
let lastErrorAt = null;         // when the last failure happened (ms)

function getStatus() {
    return {
        synced: serverTime != null,
        lastSyncAt,
        lastError,
        lastErrorAt
    };
}

async function fetchServerMs() {
    const startTime = performance.now();

    const candidates = [
        async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Dhaka', {
                cache: 'no-store',
                signal: controller.signal
            });
            clearTimeout(timer);
            const data = await res.json();
            return new Date(data.datetime).getTime();
        },
        async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Dhaka', {
                cache: 'no-store',
                signal: controller.signal
            });
            clearTimeout(timer);
            const data = await res.json();
            return new Date(data.dateTime).getTime();
        },
        async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const res = await fetch('https://cloudflare.com/cdn-cgi/trace', {
                cache: 'no-store',
                signal: controller.signal
            });
            clearTimeout(timer);
            if (!res.ok) return NaN;
            const text = await res.text();
            const match = text.match(/ts=(\d+(\.\d+)?)/);
            if (!match) return NaN;
            return Math.round(parseFloat(match[1]) * 1000);
        }
    ];

    for (const attempt of candidates) {
        try {
            const ms = await attempt();
            if (ms && !isNaN(ms) && ms > 0) {
                const rtt = performance.now() - startTime;
                serverTime = ms + (rtt / 2); // mid-point NTP-style correction
                perfBaseline = performance.now();
                lastSyncAt = serverTime;
                lastError = null;
                lastErrorAt = null;
                window.dispatchEvent(new Event('timesync'));
                return true;
            }
        } catch (e) {
            // try next server
        }
    }
    lastError = 'Could not reach a time server.';
    lastErrorAt = Date.now();
    window.dispatchEvent(new Event('timeerror'));
    return false;
}

// Current trusted timestamp (falls back to device clock until first sync).
export function now() {
    if (perfBaseline == null) return Date.now();
    return serverTime + (performance.now() - perfBaseline);
}

// Bangladesh (Asia/Dhaka) wall-clock formatter, always based on the synced
// server time — never derived from the device's timezone or clock.
const DHAKA_TZ = 'Asia/Dhaka';
const dhakaTimeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
});
const dhakaDateFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TZ,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
});

export function getDhakaTime() {
    return dhakaTimeFmt.format(new Date(now()));
}

export function getDhakaDate() {
    return dhakaDateFmt.format(new Date(now()));
}

// Start syncing immediately and re-sync every 10 seconds.
fetchServerMs();
setInterval(() => {
    fetchServerMs();
}, 10000);

export function getLastSync() {
    return lastSyncAt;
}

// Force an immediate re-sync (used by the admin refresh button). Returns a
// promise that resolves to the latest status after the attempt completes.
export async function loadTimeStatus() {
    await fetchServerMs();
    return getStatus();
}

export function getTimeStatus() {
    return getStatus();
}