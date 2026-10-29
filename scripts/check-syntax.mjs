import {spawnSync} from 'node:child_process';
import {readdirSync, statSync} from 'node:fs';
function find(dir){return readdirSync(dir).flatMap(n=>{const p=`${dir}/${n}`;return statSync(p).isDirectory()?find(p):p.endsWith('.js')?[p]:[];});}
for(const file of [...find('src'),...find('tests')]){
 const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
 if(r.status!==0)process.exit(r.status||1);
}
console.log('All JavaScript modules parse.');
