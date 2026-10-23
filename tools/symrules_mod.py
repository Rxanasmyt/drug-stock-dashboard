import re
S=[('pain','ปวด ไข้ อักเสบ ปวดกล้ามเนื้อ','ปวด/ไข้/อักเสบ',0),
('cough','ไอ เสมหะ หวัด ภูมิแพ้ คัน','ไอ/เสมหะ/ภูมิแพ้',0),
('breath','หอบ หายใจลำบาก (COPD/หืด)','หอบ/หายใจลำบาก',1),
('bact','ติดเชื้อแบคทีเรีย (ปฏิชีวนะ)','ติดเชื้อแบคทีเรีย',0),
('virus','ติดเชื้อไวรัส รา พยาธิ มาลาเรีย','ไวรัส/รา/พยาธิ',0),
('acid','กรดไหลย้อน แผลในกระเพาะอาหาร','กรดไหลย้อน/กระเพาะ',0),
('bowel','ท้องอืด ปวดท้อง ท้องผูก ท้องเสีย','ท้องอืด/ท้องผูก/ปวดท้อง',0),
('nausea','คลื่นไส้ อาเจียน เวียนศีรษะ','คลื่นไส้/เวียนศีรษะ',0),
('ht','ความดันโลหิตสูง','ความดันสูง',1),
('dm','เบาหวาน','เบาหวาน',1),
('lipid','ไขมันในเลือดสูง','ไขมันสูง',1),
('heart','หัวใจ หลอดเลือด ลิ่มเลือด บวมน้ำ','หัวใจ/ลิ่มเลือด',1),
('kidney','ไตเรื้อรัง ภาวะเกลือแร่ผิดปกติ','ไตเรื้อรัง',1),
('fluid','สารน้ำ ขาดน้ำ เกลือแร่','สารน้ำ/เกลือแร่',0),
('neuro','ชัก ปวดเส้นประสาท พาร์กินสัน','ชัก/เส้นประสาท',1),
('psych','จิตเวช วิตกกังวล ซึมเศร้า นอนไม่หลับ','จิตเวช/วิตกกังวล',1),
('hormone','ต่อมไทรอยด์และฮอร์โมน','ไทรอยด์/ฮอร์โมน',1),
('joint','ข้อ เก๊าท์','ข้อ/เก๊าท์',1),
('steroid','อักเสบรุนแรง ภูมิแพ้รุนแรง (สเตียรอยด์)','สเตียรอยด์',0),
('tb','วัณโรค','วัณโรค',0),
('hiv','เอชไอวี (ยาโครงการ)','HIV',0),
('anemia','โลหิตจาง วิตามิน แร่ธาตุ โภชนาการ','โลหิตจาง/วิตามิน',0),
('ob','สูตินรีเวช คุมกำเนิด ตกเลือดหลังคลอด','สูติ-นรี/คุมกำเนิด',0),
('skin','ผิวหนัง แผล คัน ยาฆ่าเชื้อภายนอก','ผิวหนัง/แผล',0),
('eent','ตา หู ช่องปาก','ตา/หู/ช่องปาก',0),
('vaccine','วัคซีน ภูมิคุ้มกัน เซรุ่มแก้พิษ','วัคซีน/เซรุ่ม',0),
('herbal','สมุนไพร','สมุนไพร',0),
('emerg','ฉุกเฉิน ช่วยชีวิต ยาชา','ฉุกเฉิน/ยาชา',0),
('other','อื่นๆ/เฉพาะทาง','อื่นๆ',0)]
dm={'ht':'ht','dm':'dm','lipid':'lipid','cvd':'heart','ckd':'kidney','copd':'breath','asthma':'breath','resp_shared':'breath','tb':'tb','hiv':'hiv','psych':'psych','neuro':'neuro','thyroid':'hormone','gout':'joint','antimicrobial':'bact','fluid':'fluid','vaccine':'vaccine','pain':'pain','gi':'bowel','allergy_cough':'cough','steroid':'steroid','vitamin':'anemia','ob':'ob','topical':'skin','herbal':'herbal','emerg':'emerg','other':'other'}
virus=['oseltamivir','acyclovir','favipiravir','molnupiravir','remdesivir','itraconazole','fluconazole','ketoconazole | 200','nystatin','griseofulvin','amphotericin','albendazole','mebendazole','artesunate','chloroquine','primaquine','quinine','eurartesim']
acid=['omeprazole','pantoprazole','lansoprazole','rabeprazole','vonoprazan','alum milk','sucralfate','rebamipide','bismuth','gastrobismol']
nau=['domperidone','metoclopramide','ondansetron','dimenhydrinate','betahistine','cinnarizine','flunarizine']
eent=['eye','ear drop','oph','mouth','troche','tetracaine','xylocaine','chlorhexidine','lac-oph','poly-oph','azarga','lumigan','brimonidine','maxitrol','glycerine borax','ครีมพญายอ']
anest=['lidocaine','xylocaine']

def sym_for(raw,strength,cat):
    s=(raw+' | '+strength).lower(); k=dm[cat]
    if cat=='antimicrobial' and any(x in s for x in virus): k='virus'
    elif cat=='gi':
        if any(x in s for x in acid): k='acid'
        elif any(x in s for x in nau): k='nausea'
        elif 'pan-enteral' in s: k='anemia'
    elif cat=='neuro':
        if any(x in s for x in nau): k='nausea'
        elif 'cafergot' in s: k='pain'
    elif cat=='topical':
        if any(x in s for x in anest) and 'viscous' not in s and 'tetracaine' not in s: k='emerg'
        elif any(x in s for x in eent): k='eent'
    elif cat=='herbal' and ('น้ำมันไพล' in s or 'พญายอ' in s or 'ลูกประคบ' in s): k='skin' if 'พญายอ' in s else 'pain'
    elif cat=='herbal' and ('ไอ' in s or 'มะแว้ง' in s): k='cough'
    elif cat=='pain' and 'ธรณี' in s: k='herbal'
    return k
