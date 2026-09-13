"""E2E test for Loop 5: keyboard shortcuts and Now Playing panel."""
import subprocess
import sys

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(BASE)
        page.wait_for_load_state('networkidle')

        row = page.locator('.song-row', has_text='Long Song').first
        row.click()
        page.wait_for_timeout(1000)

        def audio_state():
            return page.evaluate(
                """() => {
                    const a = document.querySelector('audio[data-audio-service]');
                    return a ? {paused: a.paused, t: a.currentTime, v: a.volume, muted: a.muted} : null;
                }"""
            )

        # 1. Space pauses / resumes
        st = audio_state()
        assert st and not st['paused'], 'not playing initially'
        page.keyboard.press('Space')
        page.wait_for_timeout(400)
        st = audio_state()
        assert st and st['paused'], 'Space did not pause'
        page.keyboard.press('Space')
        page.wait_for_timeout(400)
        st = audio_state()
        assert st and not st['paused'], 'Space did not resume'
        print('PASS [space]: space toggles play/pause')

        # 2. ArrowRight seeks forward (30s track leaves headroom)
        before = audio_state()['t']
        page.keyboard.press('ArrowRight')
        page.wait_for_timeout(400)
        after = audio_state()['t']
        assert after > before + 3, f'seek forward failed: {before} -> {after}'
        print(f'PASS [arrow-right]: seek forward {before:.1f}s -> {after:.1f}s')

        # 3. ArrowUp/Down change volume, M mutes
        page.keyboard.press('ArrowDown')
        page.wait_for_timeout(300)
        v1 = audio_state()['v']
        page.keyboard.press('ArrowDown')
        page.wait_for_timeout(300)
        v2 = audio_state()['v']
        assert v2 < v1, f'volume down failed: {v1} -> {v2}'
        page.keyboard.press('KeyM')
        page.wait_for_timeout(300)
        assert audio_state()['muted'], 'M did not mute'
        page.keyboard.press('KeyM')
        page.wait_for_timeout(300)
        assert not audio_state()['muted'], 'M did not unmute'
        print(f'PASS [volume/mute]: volume {v1:.2f} -> {v2:.2f}, M toggles mute')

        # 4. Now Playing overlay: open, lyrics tab, queue tab
        page.locator('button[aria-label="展开播放面板"]').click()
        page.wait_for_timeout(800)
        assert page.get_by_text('播放队列', exact=False).count() > 0, 'NowPlaying not visible'
        page.locator('[data-nowplaying-tab="queue"]').click()
        page.wait_for_timeout(400)
        queue_rows = page.locator('[data-nowplaying-queue-row]')
        assert queue_rows.count() > 0, 'queue empty in NowPlaying'
        page.locator('[data-nowplaying-tab="lyrics"]').click()
        page.wait_for_timeout(400)
        page.get_by_role('button', name='收起').click()
        page.wait_for_timeout(600)
        print(f'PASS [now-playing]: overlay with queue ({queue_rows.count()} rows) and lyrics tabs')

        page.screenshot(path='e2e-loop5.png', full_page=True)
        browser.close()
        print('E2E LOOP 5: ALL PASS')


if __name__ == '__main__':
    main()
    sys.exit(0)
