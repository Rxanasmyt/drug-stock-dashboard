import re
R=[
('other',['tamoxifen','flutamide','tranexamic','transamin','azathioprine','methotrexate','hydroxychloroquine','gpo-l-one']),
('emerg',['(had) adrenaline','(had) adenosine','(had) dopamine','(had) norepinephrine','atropine','naloxone','antivenin','antivenum','activated charcoal','tenecteplase','aromatic ammonia']),
('cvd',['(had) amiodarone','streptokinase','warfarin','(had) heparin','enoxaparin','bemiparin','aspirin','plavix','ticagrelor','cilostazol','dipyridamole','isosorbide','carvedilol','bisoprolol','metoprolol','digoxin','furosemide','spironolactone','edoxaban','vastarel','daflon','sildenafil','propranolol','lasix']),
('ht',['amlodipine','losartan','enalapril','manidipine','doxaz','hydralazine','hctz','methyldopa','nifedipine','captopril','(had) nicardipine','lercanidipine','fimasartan','valsartan','irbesartan','indapamide','clonidine']),
('lipid',['simvastatin','atorvastatin','gemfibrozil','ezetimibe','pitavastatin','pravastatin','fenofibrate']),
('dm',['metformin','glipizide','mixtard','pioglitazone','insulin','gensulin','empagliflozin','novomix','mixed insulin']),
('copd',['anoro','spiriva','spiolto']),
('asthma',['budesonide  inhaler','fluticasone','montelukast','procaterol','budesonide nb','terbutaline','salbutamol - pl','salbutamol-ventolin']),
('resp_shared',['seretide','symbicort','berodual','salbutamol sulfate nb','salbutamol mdi','theophylline']),
('tb',['rifampicin','ethambu','pyrazinamide','pza-','isoniazid','rifafour','rifapentine','streptomycin','tuberculin']),
('ckd',['kalimate','erythropoietin','alfacalcidol','calcitriol','cinacalcet','sodium  bicarbonate | 300 mg']),
('psych',['risperidone','fluoxetine','lorazepam','sertraline','clorazepate','haloperidol','cpz-','perphenazine','fluphenazine','amitriptyline','diazepam','clonazepam','benzhexol','benztropine','clozapine','quetiapine','lithium','thioridazine','trazodone','venlafaxine','methylphenidate','imipramine','nortriptyline','deanxit','alprazolam','น้ำยาลดบุหรี่','cytisinicline']),
('neuro',['phenytoin','depakine','valprocid','gabapentin','levetiracetam','carbamazepine','topiramate','phenobarbital','levodopa','carbidopa','ropinirole','baclofen','betahistine','flunarizine','cinnarizine','pregabalin','cafergot']),
('thyroid',['methimazole','propylthiouracil','levothyroxine','l-thyrosine']),
('gout',['allopurinol','colchicine','febuxostat','sulfinpyrazone']),
('hiv',['dtg/3tc','lopinavir','zidovudine','lamivudine','efavirenz','gpo-vir','tenofovir']),
('bph',['finasteride','dutasteride','tamsulosin','alfuzosin']),
('steroid',['hydrocortisone','dexamethasone','prednisolone']),
('vaccine',['vaccine','bcg','hpv','mmr','ipv','opv','dtp','menactra','astrazeneca','pfizer','sinopharm','corona','erig','hrig','hbig','tetagam','tdap','anti-d','tetanus anti','immunoglobulin','ap vaccine','verorab']),
('fluid',['nss','d-5-','ors |','acetate ringer','e.kcl','kcl','dextrose','nacl','sterile water','lactate ringer','magnesium sulfate','calcium gluconate','albumin','dextran','dipotassium','sodium bicarbonate 7.5','sodium  bicarbonate','sodium bicarbonate']),
('pain',['paracetamol','ibuprofen','naproxen','diclofenac','tramadol','morphine','pethidine','tolperisone','mefenamic','tenoxicam','orphenadrine','duocetz','zzz']),
('antimicrobial',['cef','augmentin','amoxi','azithro','clindamycin','oseltamivir','acyclovir','aciclovir','ciprofloxacin','levofloxacin','norfloxacin','ofloxacin','metronidazole','doxycycline','dicloxacillin','cloxacillin','ampicillin','penicillin','tazocin','meropenem','ertapenem','vancomycin','amikacin','gentamicin','colistin','tigecycline','sulbactam','bactrim','erythromycin','clarithromycin','roxithromycin','fosfomycin','itraconazole','fluconazole','griseofulvin','amphotericin','ketoconazole | 200','favipiravir','molnupiravir','remdesivir','albendazole','mebendazole','artesunate','chloroquine','primaquine','quinine','eurartesim','benzathine','nystatin','cephalexin','cefalexin','ceftriaxone','ceftriazone','ceftazidime','cefazolin','cefotaxime','cefixime','bacterim','amoxi/clav','zzzz']),
('allergy_cough',['acetylcysteine','guaifenesin','guafenesin','gg ','carbocysteine','bromhexine','cpm','cetirizine','loratadine','desloratadine','fexofenadine','dextromethorphan','m.tussis','pseudoephedrine','hydroxyzine','atarax','mucillin']),
('gi',['omeprazole','pantoprazole','lansoprazole','rabeprazole','vonoprazan','alum milk','lactulose','simethicone','air-x','domperidone','metoclopramide','hyoscine','mom-','ondansetron','bisacodyl','loperamide','dimenhydrinate','enema','m. carminative','swiff','proctosedyl','glycerine rectal','sucralfate','rebamipide','mosapride','drotaverine','bismuth','gastrobismol','peppermint','asafoetida','algycon']),
('ob',['implanon','etonorgestrel','utrogestan','norethist','primolut','oxytocin','methergin','methylergometrine','r den','ethinylestradiol','dmpa','medroxyprogesterone','exluton','lynestrenol','proluton','sulprostone','cytotec','clotrimazole vagin','magesto']),
('vitamin',['ferrous','fer in sol','triferdine','folic','vitamin b','vitamin k','vitamin a','vitamin d','vitamin c','multivit','b-100','b100','pan-enteral','zinc sulphate','calcium carbonate','filgrastim','deferasirox','nataral','vit ']),
('topical',['cream','lotion','ointment','oint','paste','drop','eye','ear ','oph','alcohol','betadine','povidone','hibiscrub','chlorhexidine','calamine','triamcinolone','betamethasone','bet n','benzyl benzoate','whitfield','silver sulfadiazine','urea','hydrogen peroxide','gentian','glycerine borax','olive oil','xylocaine','lidocaine','tetracaine','sofra','analgesic balm','salicylic','mouth','troche','diprosone','mometasone','maxitrol','tobra','lumigan','brimonidine','azarga','lac-oph','terramycin','clotrimazole','ketoconazole']),
('herbal',['ขมิ้น','เถาวัลย์','เพชรสังฆาต','ขิง','สหัสธารา','ยา','น้ำมัน','ฟ้าทะลาย','ตรีผลา','ตราธนัท','ตราธงทอง','จันท','ธาตุ','มะขามแขก','รางจืด','เขียวหอม','หอม','ห้าราก','ศุขไสยาศน์','ชุมเห็ด','แก้ลม','กัญชา','มะแว้ง','ทำลายพระสุเมรุ','มันทธาตุ','ประสะ','ปราบชมพู','ปลูกไฟ','บำรุงโลหิต','เบญจกูล','สารสกัด']),
('other',['methotrexate','azathioprine','hydroxychloroquine','tamoxifen','flutamide','sterile water for']),
]
def cat(name,st):
    s=(name+' | '+st).lower()
    nm=name.strip()
    thai=bool(re.match(r'[\u0e00-\u0e7f]',nm))
    for c,ks in R:
        if c=='herbal':
            if thai: return 'herbal'
            continue
        for k in ks:
            if k in s: return c
    return 'other'
