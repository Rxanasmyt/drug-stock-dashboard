# pipeline: stock report xls -> JSON datasets for Dashboard คลังยา
# usage: python3 -I pipeline_stock.py OUT_DIR  YYYY-MM:file.xls [YYYY-MM:file2.xls ...]
import sys,os,re,json,xlrd
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import classify_mod as C, symrules_mod as SR
TH_FULL=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
TH_SHORT=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
PCATS=[
 dict(code='nlem',name='ยาในบัญชียาหลักแห่งชาติ',short='ยาในบัญชี',order=1,key='ยาในบัญชียาหลักแห่งชาติ'),
 dict(code='non',name='ยานอกบัญชียาหลักแห่งชาติ',short='ยานอกบัญชี',order=2,key='ยานอกบัญชี'),
 dict(code='mat',name='วัสดุเภสัชกรรม',short='วัสดุเภสัชกรรม',order=3,key='วัสดุเภสัชกรรม'),
 dict(code='sup',name='ยาสนับสนุน',short='ยาสนับสนุน',order=4,key='ยาสนับสนุน'),
 dict(code='nd',name='เวชภัณฑ์มิใช่ยา',short='เวชภัณฑ์มิใช่ยา',order=5,key='เวชภัณฑ์มิใช่ยา')]
def pcat_of(defname):
    for p in PCATS:
        if p['key'] in defname: return p['code']
    return None
SUP=[('sup_inj','เข็ม กระบอกฉีด ชุดให้สารน้ำ','เข็ม/ฉีด/IV',['needle','syring','penfill','infusion','iv catheter','microdrip','extension','injection plug','three way']),
 ('sup_pack','บรรจุภัณฑ์ ฉลาก ซองยา','ซอง/ฉลาก',['ซอง','ขวดพลาสติก','ถ้วยตวง','สติกเกอร์','ตลับยา']),
 ('sup_ortho','อุปกรณ์ดามและพยุง เฝือก ผ้ายืด','ดาม/พยุง',['splint','sling','figure of eight','ls support','soft collar','เฝือก','สำลีรองเฝือก','guide size','elastic','bendage','eye shield','tourniguet']),
 ('sup_wound','ผ้าปิดแผล สำลี ไหมเย็บ ใบมีด','แผล/สำลี/ไหมเย็บ',['gauze','bandage','micropore','transpore','medipore','tensoplast','eye pad','cat gut','nylon','silk','blade','sterile strip','vasline','intrasite','สำลี','ไม้พันสำลี','alcohol swab','top gauze']),
 ('sup_tube','สายสวน ท่อ ทางเดินหายใจ ถุงปัสสาวะ','สายสวน/ท่อ',['air way','endotrachial','foley','n.g tube','suction','red rubber','thoracic','urine','condom','ky jelly']),
 ('sup_ppe','ถุงมือ หน้ากาก อื่น ๆ','ถุงมือ/PPE/อื่นๆ',['glove','mask','cap','electrode','ultrasound','ไม้กดลิ้น'])]
def sup_group(name):
    s=name.lower()
    for code,_,_,ks in SUP:
        if any(k in s for k in ks): return code
    return 'sup_ppe'
EXTRA=[('hiv',['dalavir']),('antimicrobial',['amoxycillin','ampicilin','piperacillin','sulfamethoxazole','polymycin','tazobactam']),
 ('cvd',['clopidogrel','amiodarone','steptokinase','streptokinase']),('ht',['hydrochlorothaizide','nicardipine']),('lipid',['gemfibrosil']),('thyroid',['levothyroxin']),
 ('psych',['chlorpromazine','trihexyphenidyl','cytisine']),('neuro',['keppra','volproate','ergotamine']),('pain',['mst continus']),
 ('ob',['lynesterol','northisterone','etonogestrel']),('vitamin',['calcium cabonate','obimin','eurofer','vitaminb']),
 ('allergy_cough',['chlorpheniramine','guicolate','carbocystein','tussis']),('asthma',['salbutamol 2','salbutamol 2 mg','budesonide mdi']),
 ('resp_shared',['salmeterol','ipratropium','salbutamol 0.1','salbutamol 2.5']),('copd',['tiotropium']),
 ('fluid',['potassium chloride','sodium chloride','lactated ringer','dexatrose','glucose powder']),
 ('gi',['omeplazole','carminative','milk of magnesia','ispaghula','xubil','glycerine suppository']),
 ('topical',['chlohexidine','hydroxypropyl']),('emerg',['adenosine','adrenaline','dopamine','norepinephrine']),('vaccine',['tetanus toxiod'])]
def classify(nm,st):
    c=C.cat(nm,st)
    if c!='other': return c
    s=(nm+' | '+st).lower()
    for k,ks in EXTRA:
        if any(x in s for x in ks): return k
    return 'other'
def build(out,specs):
    os.makedirs(out,exist_ok=True)
    months=[];items={}
    for mi,(ym,path) in enumerate(specs):
        y,m=map(int,ym.split('-'));fy=y+543+(1 if m>=10 else 0);fm=(m-10)%12+1
        sh=xlrd.open_workbook(path).sheet_by_index(0)
        num=lambda v:(float(v) if v not in ('',None) else 0.0)
        for i in range(1,sh.nrows):
            r=sh.row_values(i);code=str(r[0]).strip()
            if not code: continue
            pc=pcat_of(str(r[16]))
            it=items.setdefault(code,dict(code=code,name=None,strength=None,unit=None,form=None,pcat=pc,mpack=None,F={k:[None]*len(specs) for k in ['oq','ov','rq','rv','dq','dv','bq','bv']}))
            nm=str(r[2]).strip();it['name']=nm;it['strength']=str(r[4]).strip();it['unit']=str(r[6]).strip();it['form']=str(r[3]).strip();it['pcat']=pc or it['pcat'];it['mpack']=num(r[5])
            for k,c in zip(['oq','ov','rq','rv','dq','dv','bq','bv'],[7,8,9,10,11,12,13,14]): it['F'][k][mi]=round(num(r[c]),2)
        months.append(dict(m=mi+1,ym=ym,year=y+543,fy=fy,fm=fm,full=TH_FULL[m-1],short=TH_SHORT[m-1],label=TH_SHORT[m-1]+' '+str(y+543)[2:],has=1))
    # pad future months of the FY(s) so the page can show 12 months
    fys=sorted({m['fy'] for m in months})
    allm=[];idx={m['ym']:i for i,m in enumerate(months)}
    for fy in fys:
        for fm in range(1,13):
            mm=(fm+8)%12+1;y=fy-543-(1 if mm>=10 else 0)
            ym='%04d-%02d'%(y,mm)
            if ym in idx: allm.append(dict(months[idx[ym]]))
            else: allm.append(dict(ym=ym,year=y+543,fy=fy,fm=fm,full=TH_FULL[mm-1],short=TH_SHORT[mm-1],label=TH_SHORT[mm-1]+' '+str(y+543)[2:],has=0))
    for i,m in enumerate(allm): m['m']=i+1
    pos={m['ym']:i for i,m in enumerate(allm)}
    rows=[];unm=[]
    for n,(code,it) in enumerate(sorted(items.items()),1):
        nm=it['name']
        if it['pcat']=='nd' or it['pcat']=='mat':
            cat=sup_group(nm);sym=cat
        else:
            nm=re.sub(r'^6\s*','',nm)
            cat=classify(nm,it['strength']);sym=SR.sym_for(nm,it['strength'],cat)
        row=dict(id=n,code=code,name=nm[:1].upper()+nm[1:] if re.match('[a-z]',nm) else nm,strength=it['strength'],unit=it['unit'],form=it['form'],pcat=it['pcat'],cat=cat,sym=sym,mpack=it['mpack'])
        for k in it['F']:
            a=[0.0]*len(allm)
            for mi,(ym,_) in enumerate(specs): a[pos[ym]]=it['F'][k][mi] or 0.0
            row[k]=a
        row['label']=row['name']+(' '+it['strength'] if it['strength'] not in ('','-') and it['strength'].lower() not in row['name'].lower() else '')
        rows.append(row)
        if cat=='other' and it['pcat'] not in ('nd','mat'): unm.append(row['label'])
    cats=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'template__cats.json')))
    syms=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'template__syms.json')))
    for j,(code,nm,sh,_) in enumerate(SUP):
        cats.append(dict(code=code,name='วัสดุ: '+nm,short=sh,chronic=0,order=100+j));syms.append(dict(code=code,name='วัสดุ: '+nm,short=sh,chronic=0,order=100+j))
    json.dump(rows,open(out+'/items.json','w'),ensure_ascii=False,separators=(',',':'))
    json.dump(allm,open(out+'/months.json','w'),ensure_ascii=False)
    json.dump(cats,open(out+'/cats.json','w'),ensure_ascii=False)
    json.dump(syms,open(out+'/syms.json','w'),ensure_ascii=False)
    json.dump(PCATS,open(out+'/pcats.json','w'),ensure_ascii=False)
    return rows,unm
if __name__=='__main__':
    out=sys.argv[1];specs=[a.split(':',1) for a in sys.argv[2:]]
    rows,unm=build(out,specs)
    print(len(rows),'rows; unmatched(other):',len(unm));print('; '.join(unm))
