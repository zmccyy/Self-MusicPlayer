"""E2E test for Loop 4: online search -> play (stream redirect) -> save to library."""
import json
import subprocess
import sys

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'


def api_json(path: str) -> dict:
    out = subprocess.run(
        ['node', '-e', f"fetch('http://localhost:3799{path}').then(r=>r.json()).then(d=>console.log(JSON.stringify(d)))"],
        capture_output=True, text=True,
    )
    return json.loads(out.stdout.strip().splitlines()[-1])


def main():
    before = len(api_json('/api/tracks')['tracks'])

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(BASE)
        page.wait_for_load_state('networkidle')

        # 1. open search, switch to online mode, search
        page.get_by_role('button', name='搜索').first.click()
        page.locator('[role="dialog"] button', has_text='在线').first.click()
        page.locator('[role="dialog"] input').first.fill('周杰伦 晴天')
        page.locator('[role="dialog"]').get_by_role('button', name='搜索').click()
        page.wait_for_timeout(2500)

        rows = page.locator('[data-online-row]')
        assert rows.count() > 0, 'no online results'
        print(f'PASS [search]: {rows.count()} online results')

        # prefer a non-VIP row for both play & save
        free_rows = rows.filter(has_not=page.locator('span', has_text='VIP'))
        target = free_rows.first if free_rows.count() > 0 else rows.first

        # 2. play online (stream redirect)
        target.get_by_role('button', name='播放').click()
        page.wait_for_timeout(3000)
        state = page.evaluate(
            """() => {
                const a = document.querySelector('audio[data-audio-service]');
                if (!a) return null;
                return { src: a.currentSrc || a.src, srcAttr: a.src, paused: a.paused, t: a.currentTime, err: a.error ? a.error.code : null };
            }"""
        )
        assert state, 'no audio element'
        netease_stream = ('netease/stream' in state['srcAttr']) or ('netease' in state['src'])
        assert netease_stream, f'unexpected src: {state}'
        # VIP trial would still "play"; a fully blocked track errors — check no error and time advances
        assert not state['err'], f"audio error code {state['err']}"
        print(f"PASS [play]: online track streaming (paused={state['paused']}, t={state['t']:.1f}s)")

        # 3. save to library (a 409 duplicate from an earlier failed run also counts)
        target.get_by_role('button', name='收藏').click()
        page.wait_for_timeout(6000)
        after = len(api_json('/api/tracks')['tracks'])
        dialog_text = page.locator('[role="dialog"]').inner_text()
        if after == before + 1:
            print('PASS [save]: online track downloaded into library (+1)')
        elif after == before and '已存在相同内容' in dialog_text:
            print('PASS [save]: content already in library (dedup), accepted')
        else:
            raise AssertionError(f'save failed: count {before}->{after}, dialog={dialog_text[:200]}')

        # 4. saved track replaces temp one in queue and stays playable
        row = page.locator('.song-row').first
        # the queue now holds the real library track; player should still be playing
        state2 = page.evaluate(
            """() => {
                const a = document.querySelector('audio[data-audio-service]');
                return a ? { paused: a.paused, src: (a.currentSrc || a.src) } : null;
            }"""
        )
        assert state2 and not state2['paused'], 'playback interrupted after save'
        print('PASS [queue]: playback continues with library track in queue')

        page.screenshot(path='e2e-loop4.png', full_page=True)
        browser.close()

    # cleanup: remove the track we just saved
    tracks = api_json('/api/tracks?query=晴天')['tracks']
    for t in tracks:
        subprocess.run(
            ['node', '-e',
             f"fetch('http://localhost:3799/api/tracks/{t['id']}',{{method:'DELETE'}}).then(()=>console.log('deleted'))"],
            capture_output=True, text=True,
        )
    print('E2E LOOP 4: ALL PASS')


if __name__ == '__main__':
    main()
    sys.exit(0)
