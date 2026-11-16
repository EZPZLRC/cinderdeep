import sys, os, json, subprocess, numpy as np
SR=44100; X=1.5  # crossfade seconds
SRC=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
def dec(p):
    r=subprocess.run(['ffmpeg','-v','error','-nostdin','-i',p,'-map','0:a:0','-ac','2','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True).stdout
    return np.frombuffer(r,dtype=np.float32).reshape(-1,2).astype(np.float64)
def lufs(x):
    m=x.mean(1); b=int(.4*SR); n=len(m)//b
    ms=np.array([np.mean(m[i*b:(i+1)*b]**2) for i in range(n)]); ms=ms[ms>1e-7]
    g=ms[10*np.log10(ms)>10*np.log10(ms.mean())-10]
    return 10*np.log10(g.mean()+1e-12)
H=512; NF=2048
def feats(x):
    m=x.mean(1); n=(len(m)-NF)//H
    idx=np.arange(NF)[None,:]+H*np.arange(n)[:,None]
    sp=np.abs(np.fft.rfft(m[idx]*np.hanning(NF),axis=1))**2
    fr=np.fft.rfftfreq(NF,1/SR); edges=np.geomspace(40,12000,41)
    B=np.stack([sp[:,(fr>=edges[i])&(fr<edges[i+1])].sum(1) for i in range(40)],1)
    F=np.log(B+1e-9); F-=F.mean(1,keepdims=True); F/=np.linalg.norm(F,axis=1,keepdims=True)+1e-9
    return F
def lead(x):  # first sample above -45 dB
    a=np.abs(x).max(1); i=np.argmax(a>10**(-45/20)); return int(i)
def best_end(x,F,s,lo,hi):
    sf=s//H; J=int(3.0*SR/H); best=(-9,lo)
    for k in range(lo//H, hi//H):
        if k+J>=len(F) or sf+J>=len(F): break
        v=float((F[sf:sf+J]*F[k:k+J]).sum(1).mean())
        if v>best[0]: best=(v,k*H)
    e=best[1]; m=x.mean(1); w=int(.05*SR)
    a=m[s:s+w]; c=[np.dot(a,m[e+d:e+d+w]) for d in range(-H,H)]
    return e+int(np.argmax(c))-H, best[0]
def enc(y,name,br='96k'):
    p=os.path.join(OUT,name+'.mp3')
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-c:a','libmp3lame','-b:a',br,p],input=y.astype(np.float32).tobytes(),check=True)
    return p
TARGET=-16.0
def ebu(y):  # integrated loudness (EBU R128) measured by ffmpeg
    r=subprocess.run(['ffmpeg','-nostdin','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-af','ebur128','-f','null','-'],input=y.astype(np.float32).tobytes(),capture_output=True).stderr.decode()
    import re; return float(re.findall(r'I:\s*(-?[0-9.]+) LUFS',r)[-1])
def norm(y):
    for _ in range(3):  # gain to the target loudness; a gentle limiter keeps peaks under 0.97
        y=y*10**((TARGET-ebu(y))/20); a=np.abs(y); k=.9
        if a.max()>k: y=np.where(a>k,np.sign(y)*(k+(.97-k)*np.tanh((a-k)/(.97-k))),y)
    return y
plan=json.load(open(sys.argv[3])); info={}
for name,cfg in plan.items():
    x=dec(os.path.join(SRC,cfg['src']))
    if cfg.get('sting'):
        s=lead(x); y=x[s:s+int(cfg['len']*SR)] if cfg.get('len') else x[s:]
        n=len(y); fo=int(cfg.get('fo',.4)*SR); env=np.ones(n); env[-fo:]=np.linspace(1,0,fo)**2; y=y*env[:,None]
        y=norm(y); enc(y,name); info[name]={'len':round(n/SR,3),'sting':True}; print(name,'sting',round(n/SR,2)); continue
    s=lead(x)+int(cfg.get('skip',0)*SR); Xn=int(X*SR); F=feats(x)
    if cfg.get('whole'):
        lo=len(x)-int(cfg.get('win',14)*SR); hi=len(x)-Xn-int(.05*SR)
    else:
        L=cfg['L']; lo=s+int((L-15)*SR); hi=min(s+int((L+15)*SR), len(x)-Xn-1)
    e,score=best_end(x,F,s,lo,hi); L=e-s
    B=x[s:e].copy(); fi=np.linspace(0,1,Xn); fi=np.sin(fi*np.pi/2)**2
    B[:Xn]=x[s:s+Xn]*fi[:,None]+x[e:e+Xn]*(1-fi)[:,None]
    y=norm(np.concatenate([B,B[:SR]]))
    enc(y,name); info[name]={'loop':L/SR,'n':int(L)}; print(name,'loop',round(L/SR,2),'score',round(score,3),'start',round(s/SR,2))
json.dump(info,open(os.path.join(OUT,'loops.json'),'w'),indent=1)
