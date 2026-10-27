#!/usr/bin/env python3
"""Verify the real web server serves the designed 404, including its assets."""
import argparse
import subprocess
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = set()

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag in ('script', 'img') and values.get('src'):
            self.urls.add(values['src'])
        if tag == 'link' and values.get('rel') == 'stylesheet' and values.get('href'):
            self.urls.add(values['href'])


def fetch(url):
    result = subprocess.run(
        ['curl', '--silent', '--show-error', '--max-time', '20',
         '--write-out', '\n%{http_code}', url],
        capture_output=True, check=True,
    )
    body, _, status = result.stdout.rpartition(b'\n')
    return int(status), body


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin', default='https://aliouswe.com')
    args = parser.parse_args()
    origin = args.origin.rstrip('/')
    status, expected = fetch(origin + '/404.html')
    assert status == 200, f'/404.html returned {status}'
    assert b'data-tv-app' in expected and b'data-coffee-pool' in expected, 'Designed coffee 404 is missing'
    assets = Assets()
    assets.feed(expected.decode('utf-8'))
    checked = set()
    for route in ['/11', '/__404-check__/nested/missing/', '/categories/', '/tags/', '/404-lab/']:
        page_url = origin + route
        status, body = fetch(page_url)
        assert status == 404, f'{route} returned {status}, expected 404'
        assert body == expected, f'{route} does not serve the designed 404 body'
        for asset in assets.urls:
            url = urljoin(page_url, asset)
            if urlsplit(url).netloc != urlsplit(origin).netloc or url in checked:
                continue
            asset_status, _ = fetch(url)
            assert asset_status == 200, f'404 resource {url} returned {asset_status}'
            checked.add(url)
    status, body = fetch(origin + '/api/opencv/__404-check__')
    assert status == 404 and b'data-tv-app' not in body, 'OpenCV API errors must retain their API response'
    print(f'Validated 5 missing routes: HTTP 404 with the designed page; {len(checked)} resources load; API errors preserved.')


if __name__ == '__main__':
    main()
