#!/usr/bin/env python3
"""Bounded Linux/Nginx loopback Range benchmark; never changes the live site."""
import concurrent.futures
import http.client
import json
import os
import pathlib
import shutil
import socket
import statistics
import subprocess
import tempfile
import threading
import time


def memory():
    return {key: int(value.split()[0]) * 1024 for key, value in
            (line.split(':', 1) for line in pathlib.Path('/proc/meminfo').read_text().splitlines())}


def rss(pid):
    try:
        return int(next(line.split()[1] for line in pathlib.Path(f'/proc/{pid}/status').read_text().splitlines()
                        if line.startswith('VmRSS:'))) * 1024
    except (OSError, StopIteration):
        return 0


def main():
    available = memory()['MemAvailable']
    if available < 128 * 1024**2 or os.getloadavg()[0] > (os.cpu_count() or 1) * 2:
        print(json.dumps({'skipped': 'Insufficient idle headroom for even a bounded probe'}))
        return
    with tempfile.TemporaryDirectory(prefix='jazz-range-benchmark-') as temporary:
        root = pathlib.Path(temporary)
        root.chmod(0o755)
        (root / 'sample.m4a').write_bytes(os.urandom(16 * 1024**2))
        with socket.socket() as reservation:
            reservation.bind(('127.0.0.1', 0))
            port = reservation.getsockname()[1]
        configuration = root / 'nginx.conf'
        configuration.write_text(f'''daemon off;
master_process off;
pid {root}/nginx.pid;
error_log {root}/error.log;
events {{ worker_connections 128; }}
http {{
  access_log off;
  sendfile on;
  server {{ listen 127.0.0.1:{port}; root {root}; }}
}}
''')
        with (root / 'process.log').open('w') as log:
            process = subprocess.Popen([shutil.which('nginx') or 'nginx', '-p', str(root), '-c', str(configuration)], stdout=log, stderr=log)
            try:
                for _ in range(40):
                    try:
                        with socket.create_connection(('127.0.0.1', port), timeout=.2):
                            break
                    except OSError:
                        if process.poll() is not None:
                            raise RuntimeError((root / 'process.log').read_text())
                        time.sleep(.05)
                baseline = rss(process.pid)
                peak = [baseline]
                stop = threading.Event()

                def sample():
                    while not stop.wait(.005):
                        peak[0] = max(peak[0], rss(process.pid))

                sampler = threading.Thread(target=sample)
                sampler.start()
                results = []
                try:
                    for concurrency in [1, 8, 32]:
                        barrier = threading.Barrier(concurrency)

                        def client(client_index):
                            connection = http.client.HTTPConnection('127.0.0.1', port, timeout=10)
                            barrier.wait(timeout=10)
                            latencies = []
                            try:
                                for request_index in range(8):
                                    start = ((client_index * 8 + request_index) * 262144) % (16 * 1024**2 - 262144)
                                    begin = time.perf_counter()
                                    connection.request('GET', '/sample.m4a', headers={'Range': f'bytes={start}-{start + 262143}'})
                                    response = connection.getresponse()
                                    payload = response.read()
                                    assert response.status == 206 and len(payload) == 262144
                                    assert response.getheader('Content-Range') == f'bytes {start}-{start + 262143}/16777216'
                                    latencies.append((time.perf_counter() - begin) * 1000)
                            finally:
                                connection.close()
                            return latencies

                        begin = time.perf_counter()
                        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
                            latencies = sorted(value for group in executor.map(client, range(concurrency)) for value in group)
                        elapsed = time.perf_counter() - begin
                        results.append({'clients': concurrency, 'requests': len(latencies), 'all_http_206': True,
                                        'latency_p50_ms': round(statistics.median(latencies), 2),
                                        'latency_p95_ms': round(latencies[min(len(latencies) - 1, int(len(latencies) * .95))], 2),
                                        'loopback_MiB_s': round(concurrency * 8 * .25 / elapsed, 2)})
                    # Hold 32 real keep-alive readers at ~262 kbit/s each for 12s.
                    paced_barrier = threading.Barrier(32)

                    def paced_client(_):
                        connection = http.client.HTTPConnection('127.0.0.1', port, timeout=5)
                        paced_barrier.wait(timeout=10)
                        started = time.perf_counter()
                        timings = []
                        try:
                            for chunk in range(12):
                                time.sleep(max(0, started + chunk - time.perf_counter()))
                                begin = time.perf_counter()
                                offset = chunk * 32768
                                connection.request('GET', '/sample.m4a', headers={'Range': f'bytes={offset}-{offset + 32767}'})
                                response = connection.getresponse()
                                assert response.status == 206 and len(response.read()) == 32768
                                timings.append((time.perf_counter() - begin) * 1000)
                        finally:
                            connection.close()
                        return timings

                    with concurrent.futures.ThreadPoolExecutor(max_workers=32) as executor:
                        paced = sorted(value for group in executor.map(paced_client, range(32)) for value in group)
                    sustained = {'clients': 32, 'chunks_per_client': 12, 'chunk_bytes': 32768,
                                 'target_kbit_s_per_client': 262.144, 'all_http_206': True,
                                 'latency_p95_ms': round(paced[min(len(paced) - 1, int(len(paced) * .95))], 2)}
                finally:
                    stop.set()
                    sampler.join(timeout=2)
                print(json.dumps({'probe': 'isolated_nginx_range', 'sample_MiB': 16,
                                  'nginx_baseline_rss_MiB': round(baseline / 1024**2, 2),
                                  'nginx_peak_rss_MiB': round(peak[0] / 1024**2, 2),
                                  'available_before_MiB': round(available / 1024**2),
                                  'available_after_MiB': round(memory()['MemAvailable'] / 1024**2),
                                  'results': results, 'paced_playback_simulation': sustained}))
            finally:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)


if __name__ == '__main__':
    main()
