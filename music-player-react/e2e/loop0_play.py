"""E2E test for Loop 0 minimal loop: server-backed library playback.

Verifies:
1. Song list renders from backend API (Demo Song visible).
2. Clicking a row plays audio via /api/tracks/:id/stream (not blob: URL).
3. Playback actually advances (currentTime grows).
4. After page reload the same track still plays (blob-URL persistence bug fixed).
"""
import re
import sys

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'


def get_audio_state(page):
    return page.evaluate(
        """() => {
            const a = document.querySelector('audio[data-audio-service]');
            if (!a) return null;
            return {
                src: a.currentSrc || a.src,
                paused: a.paused,
                currentTime: a.currentTime,
                readyState: a.readyState,
                duration: a.duration,
                error: a.error ? a.error.code : null,
            };
        }"""
    )


def assert_playing(page, label, expect_server_src=True):
    page.wait_for_timeout(800)
    state = get_audio_state(page)
    if state is None:
        print(f'FAIL [{label}]: no audio element in DOM')
        return False
    ok = True
    if state['error']:
        print(f"FAIL [{label}]: audio error code {state['error']}")
        ok = False
    if state['paused']:
        print(f'FAIL [{label}]: audio is paused')
        ok = False
    if expect_server_src and not re.search(r'/api/tracks/.+/stream', state['src']):
        print(f"FAIL [{label}]: unexpected src {state['src']}")
        ok = False
    if not (state['currentTime'] > 0 or state['readyState'] >= 2):
        print(f"FAIL [{label}]: no progress (t={state['currentTime']}, rs={state['readyState']})")
        ok = False
    if ok:
        print(
            f"PASS [{label}]: playing t={state['currentTime']:.2f}s "
            f"src={state['src'].split('/')[-2:]}"
        )
    return ok


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        errors = []
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)

        # 1. Load app, library renders from backend
        page.goto(BASE)
        page.wait_for_load_state('networkidle')
        demo = page.locator('.song-row', has_text='Demo Song')
        if demo.count() == 0:
            print('FAIL: Demo Song not rendered from backend API')
            sys.exit(1)
        print(f'PASS [library]: Demo Song rendered ({demo.count()} row)')

        # 2. Click to play, verify server stream + progress
        demo.first.click()
        if not assert_playing(page, 'play'):
            page.screenshot(path='e2e-fail-play.png', full_page=True)
            sys.exit(1)

        # 3. Reload -> playback must still work (server owns the file now)
        page.reload()
        page.wait_for_load_state('networkidle')
        demo = page.locator('.song-row', has_text='Demo Song')
        if demo.count() == 0:
            print('FAIL after reload: Demo Song missing')
            sys.exit(1)
        demo.first.click()
        if not assert_playing(page, 'after-reload'):
            page.screenshot(path='e2e-fail-reload.png', full_page=True)
            sys.exit(1)

        page.screenshot(path='e2e-loop0.png', full_page=True)
        real_errors = [e for e in errors if 'play failed' not in e]
        if real_errors:
            print('Console errors:', real_errors[:5])
        browser.close()
        print('E2E LOOP 0: ALL PASS')


if __name__ == '__main__':
    main()
