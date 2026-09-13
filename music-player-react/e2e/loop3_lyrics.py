"""E2E test for Loop 3: online lyric matching (real NetEase backend proxy)."""
import json
import os
import random
import struct
import subprocess
import sys
import tempfile

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'


def json_dumps(obj) -> str:
    return json.dumps(obj, ensure_ascii=False)


def make_wav(freq=440, seconds=30, sample_rate=44100):
    import math

    n = seconds * sample_rate
    data = b''.join(
        struct.pack('<h', int(8000 * math.sin(2 * math.pi * freq * i / sample_rate)))
        for i in range(n)
    )
    header = (
        b'RIFF' + (36 + len(data)).to_bytes(4, 'little') + b'WAVE'
        + b'fmt ' + (16).to_bytes(4, 'little') + (1).to_bytes(2, 'little') + (1).to_bytes(2, 'little')
        + sample_rate.to_bytes(4, 'little') + (sample_rate * 2).to_bytes(4, 'little')
        + (2).to_bytes(2, 'little') + (16).to_bytes(2, 'little')
        + b'data' + len(data).to_bytes(4, 'little')
    )
    return header + data


def api_json(path: str) -> dict:
    out = subprocess.run(
        ['node', '-e', f"fetch('http://localhost:3799{path}').then(r=>r.json()).then(d=>console.log(JSON.stringify(d)))"],
        capture_output=True, text=True,
    )
    import json

    return json.loads(out.stdout.strip().splitlines()[-1])


def main():
    # Import a track whose filename matches a well-known NetEase song
    scan_dir = tempfile.mkdtemp(prefix='lyric-e2e-')
    wav_path = os.path.join(scan_dir, '周杰伦 - 晴天.wav')
    with open(wav_path, 'wb') as f:
        f.write(make_wav(freq=random.randint(300, 3000)))
    payload = json_dumps({'path': scan_dir})
    out = subprocess.run(
        ['node', '-e',
         "fetch('http://localhost:3799/api/library/scan',{method:'POST',headers:{'Content-Type':'application/json'},"
         "body:process.argv[1]}).then(r=>r.json()).then(d=>console.log('ADDED:'+d.added))",
         payload],
        capture_output=True, text=True,
    )
    assert 'ADDED:1' in out.stdout, f'import failed: {out.stdout} {out.stderr}'

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(BASE)
        page.wait_for_load_state('networkidle')

        # Select the song so it becomes currentSong
        row = page.locator('.song-row', has_text='晴天').first
        row.click()
        page.wait_for_timeout(800)

        # Open the lyric match modal
        page.get_by_role('button', name='在线匹配').click()
        keyword_input = page.locator('[role="dialog"] input').first
        assert '晴天' in keyword_input.input_value(), 'keyword not prefilled'
        page.locator('[role="dialog"]').get_by_role('button', name='搜索').click()
        page.wait_for_timeout(2500)

        candidates = page.locator('[role="dialog"] button', has_text='使用此歌词')
        assert candidates.count() > 0, 'no candidates found from NetEase search'
        candidates.first.click()
        page.wait_for_timeout(2500)
        # success feedback now comes as a sonner toast
        page.wait_for_selector('[data-sonner-toast]', timeout=5000)
        assert '已绑定' in page.inner_text('[data-sonner-toast]'), 'save toast missing'
        print('PASS [match]: lyric fetched from NetEase and saved')

        # Close and verify the lyric panel renders lines now
        page.locator('[role="dialog"]').get_by_role('button', name='关闭').click()
        page.wait_for_timeout(800)
        panel = page.locator('section', has=page.get_by_text('歌词', exact=True)).last
        lyric_area = page.locator('div.max-h-72')
        assert lyric_area.count() > 0, 'lyric lines area not rendered'
        assert page.locator('[data-line-index]').count() > 0, 'no lyric lines rendered'
        print('PASS [panel]: lyric panel shows synced lines')

        # Server-side verification
        tracks = api_json('/api/tracks')
        track = [t for t in tracks['tracks'] if t['title'] == '晴天'][0]
        lyric = api_json(f"/api/tracks/{track['id']}/lyric")
        assert lyric['lyric'], 'server has no lyric content'
        print(f"PASS [server]: lyric stored (translation={'yes' if lyric.get('translation') else 'no'})")

        page.screenshot(path='e2e-loop3.png', full_page=True)
        browser.close()
        print('E2E LOOP 3: ALL PASS')


if __name__ == '__main__':
    main()
    sys.exit(0)
