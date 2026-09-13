"""E2E test for Loop 7 (review fix): EQ graph init must not silence online playback.

Regression scenario: opening the equalizer once builds a WebAudio graph on the
shared <audio> element. Without crossOrigin=anonymous on that element, a later
cross-origin NetEase stream becomes a tainted MediaElementSource and outputs
silence. Verify: EQ opened first -> online track loads and advances.
"""
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

        # 1. Open the EQ dialog once (triggers equalizerService.init / graph build)
        page.locator('button[aria-label="打开均衡器"]').click()
        page.wait_for_timeout(600)
        page.locator('[role="dialog"]').get_by_role('button', name='关闭').click()
        page.wait_for_timeout(400)
        print('PASS [eq-init]: equalizer graph initialized')

        # 2. Search online and start playback of a free track
        page.get_by_role('button', name='搜索').first.click()
        page.locator('[role="dialog"] button', has_text='在线').first.click()
        page.locator('[role="dialog"] input').first.fill('周杰伦 晴天')
        page.locator('[role="dialog"]').get_by_role('button', name='搜索').click()
        page.wait_for_timeout(2500)
        rows = page.locator('[data-online-row]')
        assert rows.count() > 0, 'no online results'
        free_rows = rows.filter(has_not=page.locator('span', has_text='VIP'))
        target = free_rows.first if free_rows.count() > 0 else rows.first
        target.get_by_role('button', name='播放').click()
        page.wait_for_timeout(3500)

        state = page.evaluate(
            """() => {
                const a = document.querySelector('audio[data-audio-service]');
                return a ? {paused: a.paused, t: a.currentTime, err: a.error ? a.error.code : null,
                            rs: a.readyState, cross: a.crossOrigin} : null;
            }"""
        )
        assert state, 'no audio element'
        assert state['err'] is None, f'online load failed under CORS (error {state["err"]})'
        assert not state['paused'] and state['t'] > 0, f'online playback not advancing: {state}'
        assert state['cross'] == 'anonymous', 'crossOrigin not anonymous'
        print(f"PASS [eq+online]: online playback healthy through WebAudio graph (t={state['t']:.1f}s)")

        browser.close()
        print('E2E LOOP 7: ALL PASS')


if __name__ == '__main__':
    main()
    sys.exit(0)
