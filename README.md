# Dashboard คลังยาและเวชภัณฑ์ รพ.กรงปินัง

ยอดยกมา / รับ / จ่าย / คงเหลือ (ปริมาณและมูลค่า) แยกตามหมวดสินค้าและกลุ่มโรค — เว็บสถิตล้วน ใช้ GitHub Pages ได้ทันที ติดตั้งเป็นแอปได้ (PWA)

**ข้อควรระวัง:** repo สาธารณะ ข้อมูลใน `data.js` เปิดดูได้ทุกคน

## วิธีเผยแพร่
1. สร้าง repo ใหม่ (public) ชื่อแนะนำ `drug-stock-dashboard`
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ไว้ที่ราก repo (index.html, app.js, data.js, shim.js, sw.js, d3.min.js, manifest.webmanifest, icon.svg)
3. Settings → Pages → Deploy from a branch → `main` / `(root)`
4. ลิงก์: https://rxanasmyt.github.io/drug-stock-dashboard/

## อัปเดตข้อมูลรายเดือน
สร้าง `data.js` ใหม่จากรายงานคลังทุกเดือน (pipeline_stock.py + build_gh.py) แล้วแทนที่ไฟล์ — แก้เลขเวอร์ชัน `V` ใน sw.js เมื่ออัปเดตเพื่อล้างแคชเก่า
