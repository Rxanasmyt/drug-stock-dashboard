#!/usr/bin/env python3
"""อัปเดตข้อมูล dashboard คลังยาจากไฟล์รายงานคลัง (.xls) ในโฟลเดอร์ data/
วิธีใช้ในเครื่อง:  pip install xlrd  แล้วรัน  python3 update.py
(ถ้าใช้ GitHub Actions ไม่ต้องรันเอง แค่อัปโหลดไฟล์ .xls เข้าโฟลเดอร์ data/)

ตั้งชื่อไฟล์ให้มีเดือน-ปี พ.ศ. เช่น  รายงานคลัง-11-2569.xls  หรือ  2569-11.xls  หรือ  2026-11.xls
"""
import sys, os, re, json, glob, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'tools'))

def month_of(name):
    b = os.path.splitext(os.path.basename(name))[0]
    m = re.search(r'(?<!\d)(\d{1,2})[-_./](25\d{2})(?!\d)', b)          # 11-2569
    if m: return int(m.group(2)) - 543, int(m.group(1))
    m = re.search(r'(?<!\d)(25\d{2})[-_./](\d{1,2})(?!\d)', b)          # 2569-11
    if m: return int(m.group(1)) - 543, int(m.group(2))
    m = re.search(r'(?<!\d)(20\d{2})[-_./](\d{1,2})(?!\d)', b)          # 2026-11
    if m: return int(m.group(1)), int(m.group(2))
    m = re.search(r'(?<!\d)(\d{1,2})[-_./](20\d{2})(?!\d)', b)          # 11-2026
    if m: return int(m.group(2)), int(m.group(1))
    return None

def main():
    files = sorted(glob.glob(os.path.join(HERE, 'data', '*.xls')) + glob.glob(os.path.join(HERE, 'data', '*.xlsx')))
    if not files:
        sys.exit('ไม่พบไฟล์ .xls ในโฟลเดอร์ data/ — อัปโหลดรายงานคลังรายเดือนเข้าโฟลเดอร์นี้ก่อน')
    specs, seen = [], {}
    for f in files:
        ym = month_of(f)
        if not ym or not 1 <= ym[1] <= 12:
            sys.exit('อ่านเดือน/ปีจากชื่อไฟล์ไม่ได้: %s\nให้ตั้งชื่อเช่น รายงานคลัง-11-2569.xls (เดือน-ปี พ.ศ.)' % os.path.basename(f))
        key = '%04d-%02d' % ym
        if key in seen:
            sys.exit('มีไฟล์ซ้ำเดือนเดียวกัน (%s): %s และ %s' % (key, os.path.basename(seen[key]), os.path.basename(f)))
        seen[key] = f
        specs.append((key, f))
    specs.sort()
    import pipeline_stock as P
    tmp = tempfile.mkdtemp()
    try:
        rows, unmatched = P.build(tmp, specs)
        D = {k: json.load(open(os.path.join(tmp, k + '.json'))) for k in ['items', 'cats', 'months', 'syms', 'pcats']}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    # ตรวจความถูกต้อง: ยกมา + รับ - จ่าย = คงเหลือ
    bad = 0
    for r in rows:
        for i, has in enumerate(m.get('has') for m in D['months']):
            if not has: continue
            if abs(r['oq'][i] + r['rq'][i] - r['dq'][i] - r['bq'][i]) > 0.01 or abs(r['ov'][i] + r['rv'][i] - r['dv'][i] - r['bv'][i]) > 1:
                bad += 1
    data = 'window.DATA=' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';'
    open(os.path.join(HERE, 'data.js'), 'w', encoding='utf-8').write(data)
    # เปลี่ยนเลขเวอร์ชันแคชของ sw.js เพื่อให้เครื่องที่เคยเปิดดึงข้อมูลใหม่
    sw = os.path.join(HERE, 'sw.js')
    if os.path.exists(sw):
        t = open(sw, encoding='utf-8').read()
        t = re.sub(r"stock-dash-[^'\"]*", 'stock-dash-' + ''.join(k.replace('-', '') for k, _ in specs[-1:]) + '-%d' % len(specs), t, count=1)
        open(sw, 'w', encoding='utf-8').write(t)
    print('อัปเดตสำเร็จ: %d เดือน (%s) · %d รายการ' % (len(specs), ', '.join(k for k, _ in specs), len(rows)))
    print('รายการที่จัดกลุ่มโรคไม่ได้ (other):', len(unmatched))
    if bad: print('คำเตือน: พบ %d จุดที่ ยกมา+รับ-จ่าย ไม่เท่ากับคงเหลือ ในรายงานต้นฉบับ' % bad)
    else: print('ตรวจสมการ ยกมา + รับ − จ่าย = คงเหลือ: ลงตัวทุกรายการ')

if __name__ == '__main__':
    main()
