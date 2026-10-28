#!/usr/bin/env python3
"""Check the published catalog, distinct audio URLs, Range responses and image headers."""
import argparse,concurrent.futures,gzip,json,re,time,urllib.request

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--base-url',default='https://aliouswe.com');parser.add_argument('--output',required=True);args=parser.parse_args()
    base=args.base_url.rstrip('/');headers={'User-Agent':'Aliouswe-owned-site-verification/1.0'}
    start=time.perf_counter()
    with urllib.request.urlopen(urllib.request.Request(base+'/jazz/audio-library.json',headers={**headers,'Accept-Encoding':'gzip'}),timeout=20) as r:
        encoding=r.headers.get('Content-Encoding');wire=r.read();payload=gzip.decompress(wire) if encoding=='gzip' else wire;catalog=json.loads(payload)['tracks']
    catalog_result={'tracks':len(catalog),'wire_bytes':len(wire),'json_bytes':len(payload),'encoding':encoding,'seconds':round(time.perf_counter()-start,3)}
    def inspect(track):
        request=urllib.request.Request(base+track['audio']['src'],method='HEAD',headers=headers);start=time.perf_counter()
        try:
            with urllib.request.urlopen(request,timeout=20) as r:
                if r.status!=200 or not r.headers.get('Content-Type','').startswith('audio/'):raise RuntimeError('Expected audio response')
                return {'id':track['id'],'bytes':int(r.headers['Content-Length']),'mime':r.headers.get('Content-Type'),'cache':r.headers.get('Cache-Control'),'seconds':round(time.perf_counter()-start,3)}
        except Exception as error:return {'id':track['id'],'error':str(error)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:audio=list(pool.map(inspect,catalog))
    ranges=[]
    for track in [next(t for t in catalog if t['audio']['src'].endswith('.m4a')),next(t for t in catalog if t['audio']['src'].endswith('.mp3'))]:
        with urllib.request.urlopen(urllib.request.Request(base+track['audio']['src'],headers={**headers,'Range':'bytes=16384-81919'}),timeout=20) as r:
            body=r.read();valid=r.status==206 and len(body)==65536 and bool(re.match(r'bytes 16384-81919/\d+',r.headers.get('Content-Range','')))
            ranges.append({'id':track['id'],'status':r.status,'bytes':len(body),'content_range':r.headers.get('Content-Range'),'valid':valid})
    images=[]
    for src in list(dict.fromkeys(t.get('thumbnail') or t['cover'] for t in catalog))[::20]:
        with urllib.request.urlopen(urllib.request.Request(base+src,headers=headers),timeout=20) as r:
            body=r.read();images.append({'src':src,'status':r.status,'bytes':len(body),'mime':r.headers.get('Content-Type'),'cache':r.headers.get('Cache-Control')})
    report={'catalog':catalog_result,'audio_count':len(audio),'audio_errors':[item for item in audio if 'error' in item],'ranges':ranges,'images':images}
    with open(args.output,'w') as out:json.dump(report,out,indent=2,ensure_ascii=False)
    print(json.dumps(report,ensure_ascii=False))
    if report['audio_errors'] or any(not item['valid'] for item in ranges):raise SystemExit(1)
if __name__=='__main__':main()
