import json,re,subprocess,os,sys,html
links=json.load(open(os.path.join(os.path.dirname(__file__),'..','source','drive_links.json')))
UA="Mozilla/5.0 (X11; Linux x86_64)"
def slug(t):
    return re.sub(r'[^A-Za-z0-9]+','_',t).strip('_')
for title,fid,url in links:
    name=f"{slug(title)}__{fid}"
    if any(f.startswith(name) for f in os.listdir('.')): continue
    tmp=name+'.part'
    u=f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t"
    r=subprocess.run(['curl','-sL','-A',UA,'-o',tmp,'-w','%{http_code} %{content_type}',u],capture_output=True,text=True)
    kind=subprocess.run(['file','-b',tmp],capture_output=True,text=True).stdout.strip()
    size=os.path.getsize(tmp)
    ext='.pdf' if kind.startswith('PDF') else ('.zip' if 'Zip' in kind else '.html')
    os.rename(tmp,name+ext)
    print(f"{r.stdout:30s} {size:>12,d} {ext} {title} :: {kind[:60]}")
