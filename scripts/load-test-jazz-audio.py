#!/usr/bin/env python3
"""Bounded, paced HTTP Range probes. Run separately from media upload traffic."""
import argparse,concurrent.futures,http.client,json,math,ssl,statistics,threading,time,urllib.parse

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--base-url',default='https://aliouswe.com')
    parser.add_argument('--host-header',default='aliouswe.com')
    parser.add_argument('--levels',default='1,8,32,64,128,256')
    parser.add_argument('--seconds',type=int,default=15)
    parser.add_argument('--bitrate-kbps',type=int,default=320)
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    levels=[int(n) for n in args.levels.split(',')]
    if not levels or max(levels)>512 or min(levels)<1 or not 3<=args.seconds<=30:parser.error('Use 1–512 clients and 3–30 seconds per level')
    # Raise only this benchmark process's descriptor limit so client limits are not mistaken for server capacity.
    try:
        import resource
        soft,hard=resource.getrlimit(resource.RLIMIT_NOFILE)
        target=max(soft,4096) if hard==resource.RLIM_INFINITY else min(hard,max(soft,4096))
        resource.setrlimit(resource.RLIMIT_NOFILE,(target,hard))
        if target<max(levels)+32:parser.error('Client file-descriptor limit is too low for these levels')
    except ImportError:
        pass
    endpoint=urllib.parse.urlsplit(args.base_url)
    context=ssl.create_default_context()
    def connection():
        if endpoint.scheme=='https':return http.client.HTTPSConnection(endpoint.hostname,endpoint.port or 443,timeout=15,context=context)
        return http.client.HTTPConnection(endpoint.hostname,endpoint.port or 80,timeout=15)
    headers={'Host':args.host_header,'User-Agent':'Aliouswe-owned-site-audio-loadtest/1.0'}
    conn=connection();conn.request('GET','/jazz/audio-library.json',headers=headers);response=conn.getresponse()
    if response.status!=200:raise RuntimeError('Published audio catalog unavailable')
    catalog=json.loads(response.read())['tracks'];conn.close()
    chosen=catalog
    def head(track):
        c=connection()
        try:
            c.request('HEAD',track['audio']['src'],headers=headers);r=c.getresponse();r.read()
            if r.status!=200:raise RuntimeError('Audio HEAD failed: '+str(r.status))
            return track['audio']['src'],int(r.getheader('Content-Length'))
        finally:c.close()
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:sources=list(pool.map(head,chosen))
    chunk=max(1,args.bitrate_kbps*1000//8)
    results=[]
    for count in levels:
        barrier=threading.Barrier(count);failures=[];latencies=[];bytes_read=0;startup=[]
        def client(index):
            c=connection();samples=[];total=0;errors=[];path,length=sources[index%len(sources)]
            begin=time.perf_counter()
            try:
                c.request('GET',path,headers={**headers,'Range':'bytes=0-1023'});r=c.getresponse();data=r.read()
                if r.status!=206 or len(data)!=1024:raise RuntimeError('Warm Range response invalid')
                warm=time.perf_counter()-begin
                barrier.wait(timeout=30);start=time.perf_counter()
                for step in range(args.seconds):
                    if time.perf_counter()-start > args.seconds+10:
                        errors.append('Client exceeded bounded test window');break
                    c.timeout=3
                    if c.sock is not None:c.sock.settimeout(3)
                    time.sleep(max(0,start+step-time.perf_counter()))
                    offset=((index+step)*chunk)%max(1,length-chunk);size=min(chunk,length-offset)
                    t=time.perf_counter();c.request('GET',path,headers={**headers,'Range':f'bytes={offset}-{offset+size-1}'})
                    r=c.getresponse();data=r.read();samples.append((time.perf_counter()-t)*1000)
                    if r.status!=206 or len(data)!=size:errors.append(f'Range status={r.status}, bytes={len(data)}/{size}')
                    total+=len(data)
                return samples,total,errors,warm
            except Exception as error:
                try:barrier.abort()
                except threading.BrokenBarrierError:pass
                return samples,total,[type(error).__name__],time.perf_counter()-begin
            finally:c.close()
        started_at=time.time()
        begin=time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=count) as pool:
            for samples,total,errors,warm in pool.map(client,range(count)):
                latencies.extend(samples);bytes_read+=total;failures.extend(errors);startup.append(warm)
        values=sorted(latencies)
        p95=values[min(len(values)-1,math.ceil(.95*len(values))-1)] if values else None
        report={'started_unix':started_at,'finished_unix':time.time(),'clients':count,'distinct_audio_sources':min(count,len(sources)),'seconds_per_client':args.seconds,'target_kbps_per_client':args.bitrate_kbps,'target_Mbps':round(count*args.bitrate_kbps/1000,2),'requests':len(values),'failed_requests_or_clients':len(failures),'p50_ms':round(statistics.median(values),2) if values else None,'p95_ms':round(p95,2) if p95 else None,'max_ms':round(max(values),2) if values else None,'bytes':bytes_read,'startup_p95_s':round(sorted(startup)[math.ceil(.95*len(startup))-1],2),'wall_s':round(time.perf_counter()-begin,2),'errors':failures[:5]}
        results.append(report);print(json.dumps(report),flush=True)
        with open(args.output,'w') as out:json.dump({'base_url':args.base_url,'distinct_audio_sources':len(sources),'results':results},out,indent=2)
        if failures or p95 is None or p95>800:
            print('Stopped at the first error or P95 above 800 ms; this is a tested bound, not an inferred server maximum.',flush=True);break
        time.sleep(2)
if __name__=='__main__':main()
