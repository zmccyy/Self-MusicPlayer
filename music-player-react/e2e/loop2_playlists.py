"""E2E test for Loop 2: playlist management through the UI."""
import os
import random
import struct
import subprocess
import sys
import tempfile

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def make_wav(freq=440, seconds=2, sample_rate=44100):
    n = seconds * sample_rate
    data = b''.join(
        struct.pack('<h', int(8000 * __import__('math').sin(2 * 3.14159 * freq * i / sample_rate)))
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


def scan_import(path: str, expected: int) -> None:
    out = subprocess.run(
        ['node', '-e',
         "fetch('http://localhost:3799/api/library/scan',{method:'POST',headers:{'Content-Type':'application/json'},"
         "body:JSON.stringify({path:process.argv[1]})}).then(r=>r.json()).then(d=>console.log('ADDED:'+d.added))",
         path],
        capture_output=True, text=True,
    )
    assert f'ADDED:{expected}' in out.stdout, f'scan import failed: {out.stdout} {out.stderr}'


def api(path: str) -> dict:
    out = subprocess.run(
        ['node', '-e', f"fetch('http://localhost:3799{path}').then(r=>r.json()).then(d=>console.log(JSON.stringify(d)))"],
        capture_output=True, text=True,
    )
    import json

    return json.loads(out.stdout.strip().splitlines()[-1])


def main():
    import random

    # import two tracks with unique content
    scan_dir = tempfile.mkdtemp(prefix='playlist-e2e-')
    names = ['PA Artist - P Song One.wav', 'PA Artist - P Song Two.wav']
    for i, name in enumerate(names):
        with open(os.path.join(scan_dir, name), 'wb') as f:
            f.write(make_wav(freq=random.randint(300, 3000)))
    scan_import(scan_dir, len(names))

    pl_name = f'E2E 歌单 {random.randint(1000, 9999)}'

    # clean up leftover test playlists from previous runs so the sidebar
    # stays short (otherwise targets end up behind the fixed player bar)
    cleanup = subprocess.run(
        ['node', '-e',
         "fetch('http://localhost:3799/api/playlists').then(r=>r.json()).then(async d=>{"
         "for (const pl of d.playlists) if (pl.name.startsWith('E2E 歌单') || pl.name.startsWith('E2E 歌单改名'))"
         " await fetch('http://localhost:3799/api/playlists/'+pl.id, {method:'DELETE'});"
         "console.log('CLEANED');})"],
        capture_output=True, text=True,
    )
    assert 'CLEANED' in cleanup.stdout, cleanup.stdout + cleanup.stderr

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(BASE)
        page.wait_for_load_state('networkidle')

        # 1. Create a playlist via sidebar
        page.get_by_role('button', name='创建歌单').click()
        page.locator('[role="dialog"] input').nth(0).fill(pl_name)
        page.get_by_role('button', name='保存').click()
        page.wait_for_timeout(600)
        assert page.locator('.playlist-item', has_text=pl_name).count() == 1, 'playlist not created'
        print('PASS [create]: playlist created')

        # 2. Add song one to the playlist from library view
        row = page.locator('.song-row', has_text='P Song One').first
        row.hover()
        row.get_by_title('添加到歌单').click()
        page.locator('[role="dialog"] button', has_text=pl_name).click()
        page.wait_for_timeout(600)
        pl = [x for x in api('/api/playlists')['playlists'] if x['name'] == pl_name][0]
        detail = api(f"/api/playlists/{pl['id']}")
        assert len(detail['tracks']) == 1 and detail['tracks'][0]['title'] == 'P Song One', 'song not added'
        print('PASS [add]: song added to playlist (server verified)')

        # 3. Add song two, then check playlist view shows both in order
        row = page.locator('.song-row', has_text='P Song Two').first
        row.hover()
        row.get_by_title('添加到歌单').click()
        page.locator('[role="dialog"] button', has_text=pl_name).click()
        page.wait_for_timeout(600)

        page.locator('.playlist-item', has_text=pl_name).click()
        page.wait_for_timeout(400)
        rows = page.locator('.song-row')
        assert rows.count() == 2, f'expected 2 rows in playlist view, got {rows.count()}'
        assert 'P Song One' in rows.nth(0).inner_text(), 'order wrong before drag'
        print('PASS [view]: playlist view shows both songs')

        # 4. Drag song two above song one (HTML5 drag-and-drop)
        source = rows.nth(1)
        target = rows.nth(0)
        source.hover()
        page.mouse.down()
        target.hover(position={'x': 20, 'y': 10})
        page.mouse.move(target.bounding_box()['x'] + 20, target.bounding_box()['y'] + 10)
        page.mouse.up()
        page.wait_for_timeout(800)
        detail = api(f"/api/playlists/{pl['id']}")
        titles = [t['title'] for t in detail['tracks']]
        assert titles == ['P Song Two', 'P Song One'], f'reorder failed on server: {titles}'
        print('PASS [reorder]: drag-and-drop order persisted to server')

        # 5. Remove from playlist
        row = page.locator('.song-row', has_text='P Song One').first
        row.hover()
        row.get_by_title('从当前歌单移除').click()
        page.wait_for_timeout(600)
        detail = api(f"/api/playlists/{pl['id']}")
        assert [t['title'] for t in detail['tracks']] == ['P Song Two'], 'remove failed'
        print('PASS [remove]: song removed from playlist (server verified)')

        # 6. Rename + delete playlist
        item = page.locator('.playlist-item', has_text=pl_name)
        item.hover()
        page.on('dialog', lambda d: (
            d.accept(f'{pl_name} 改名') if d.type == 'prompt' else d.accept()
        ))
        item.get_by_title('重命名').click()
        page.wait_for_timeout(600)
        assert page.locator('.playlist-item', has_text=f'{pl_name} 改名').count() == 1, 'rename failed'
        item = page.locator('.playlist-item', has_text=f'{pl_name} 改名')
        item.hover()
        item.get_by_title('删除歌单').click()
        page.wait_for_timeout(600)
        assert page.locator('.playlist-item', has_text=f'{pl_name} 改名').count() == 0, 'delete failed'
        print('PASS [rename+delete]: playlist renamed and deleted')

        page.screenshot(path='e2e-loop2.png', full_page=True)
        browser.close()
        print('E2E LOOP 2: ALL PASS')


if __name__ == '__main__':
    main()
    sys.exit(0)
