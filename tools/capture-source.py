from pathlib import Path
import shutil, json, hashlib, subprocess
source = Path(r'C:\xampp\htdocs\simulador')
root = Path(__file__).resolve().parent.parent
ref = root / 'reference'
ref.mkdir(exist_ok=True)
for folder in ['assets','models','controllers','views','deployment']:
    shutil.copytree(source / folder, ref / folder, dirs_exist_ok=True)
for name in ['index.php','simulador_db.sql','README.md']:
    shutil.copy2(source/name,ref/name)
(root/'private').mkdir(exist_ok=True)
(root/'docs').mkdir(exist_ok=True)
manifest = {str(p.relative_to(source)):hashlib.sha256(p.read_bytes()).hexdigest() for p in source.rglob('*') if p.is_file() and '.git' not in p.parts}
(root/'private'/'source-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
status = subprocess.run(['git','-c','safe.directory=C:/xampp/htdocs/simulador','-C',str(source),'status','--short'],capture_output=True,text=True).stdout
(root/'docs'/'original-git-status.txt').write_text(status,encoding='utf8')
for p in ref.glob('views/*/*.php'):
    if p.parent.name == 'layouts': continue
    html = p.read_text(encoding='utf8')
    html = __import__('re').sub(r'<\?php[\s\S]*?\?>','',html)
    dest=root/'apps'/'web'/'src'/'templates'/f'{p.parent.name}.html'
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(html,encoding='utf8')
dest=root/'apps'/'web'/'src'/'styles'
dest.mkdir(parents=True,exist_ok=True)
shutil.copy2(ref/'assets'/'css'/'app.css',dest/'original.css')
print('Referencia conservada; no se ha modificado el original.')
