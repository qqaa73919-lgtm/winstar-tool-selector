
'use strict';

let DB = null;
let CATALOG_DB = {meta:{counts:{}},entries:[]};
let SOURCE_BY_ID = new Map();
let PRODUCT_BY_CODE = new Map();
let PROFILE_DONOR_BY_CODE = new Map();
const CATEGORY_LABELS = {
  solid:'整體式銑刀',
  indexable:'捨棄式銑刀',
  hole:'孔加工刀具',
  holemaking:'孔加工刀具',
  turning:'車削刀具',
  threading:'螺紋刀具'
};
const el = id => document.getElementById(id);
const num = id => {
  const v = parseFloat(el(id).value);
  return Number.isFinite(v) ? v : null;
};
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt = (v, digits=2) => Number.isFinite(v) ? Number(v).toLocaleString('zh-TW',{maximumFractionDigits:digits}) : '—';
const unique = arr => [...new Set(arr.filter(v => v !== null && v !== undefined && v !== ''))];

const HARDNESS_RANGES = {
  H60X:{min:35,max:60,label:'HRC 35–60'},
  H65X:{min:40,max:65,label:'HRC 40–65'},
  H68X:{min:50,max:68,label:'HRC 50–68'},
  H70X:{min:50,max:70,label:'HRC 50–70'},
  M50X:{min:0,max:50,label:'最高 HRC 50'},
  G550:{min:0,max:55,label:'最高 HRC 55'},
  G55X:{min:0,max:55,label:'最高 HRC 55'},
  G55C:{min:0,max:55,label:'最高 HRC 55'}
};
const MATERIAL_GRADES = {
  carbon:['S20C','S45C','S50C','FC250','FCD450'],
  alloy:['SCM415','SCM440','SNCM439','SKD11','SKD61','SKH51'],
  prehardened:['NAK80','P20','718H'],
  hardened:['SKD11','SKD61','SKH51','SUJ2'],
  stainless:['SUS303','SUS304','SUS304L','SUS316','SUS316L','SUS420J2','SUS430','SUS630／17-4PH','雙相鋼 2205'],
  castiron:['FC250','FCD450'],
  titanium:['純鈦','Ti-6Al-4V'],
  superalloy:['Inconel 625','Inconel 718','Hastelloy C-276'],
  aluminum:['A2017','A5052','A6061','A7075','ADC12'],
  copper:['C1100','C3604','鈹銅'],
  plastic:['POM','PEEK','PTFE','壓克力'],
  graphite:['一般石墨','高密度石墨'],
  composite:['CFRP','GFRP','Kevlar'],
  ceramic:['氧化鋁陶瓷','氧化鋯陶瓷','玻璃'],
  carbide:['WC-Co 硬質合金']
};
const OFFICIAL_CATALOGS = {
  indexable:'https://www.winstarcutting.com.tw/catalogue/Winstar_2025_A-Indexable%20Milling.pdf',
  holemaking:'https://www.winstarcutting.com.tw/catalogue/Winstar_2025_C-Holemaking.pdf',
  turning:'https://www.winstarcutting.com.tw/catalogue/Winstar_2025_D-Turning.pdf',
  threading:'https://www.winstarcutting.com.tw/catalogue/Winstar_2025_E-Threading.pdf'
};
const CATEGORY_INFO = {
  solid_drill:{name:'整體式鎢鋼鑽',intro:'整體式鎢鋼鑽依官方孔徑、加工深度、材質與冷卻方式篩選；外徑為必填。'},
  step_drill:{name:'整體式鎢鋼階梯鑽',intro:'整體式鎢鋼階梯鑽顯示官方標準刀號與規格；外徑為必填。'},
  indexable:{name:'捨棄式銑刀',intro:'依官方 2025 A 型錄的系列用途、刀具直徑與最大 AP 進行基本篩選。'},
  holemaking:{name:'孔加工刀具',intro:'孔加工只使用孔徑、孔深 AP、材質、刀具類型與冷卻方式；不使用 AE。'},
  turning:{name:'車削刀具',intro:'依官方 2025 D 型錄，先從車刀片形狀、加工位置與粗精加工用途篩選系列。'},
  threading:{name:'螺紋刀具',intro:'依官方 2025 E 型錄，以加工材質、螺紋方式、牙型標準與選填 Pitch／TPI 篩選系列。'}
};
const ALL_WORK_MATERIALS=['carbon','alloy','prehardened','hardened','stainless','castiron','titanium','superalloy','aluminum','copper'];
const CATALOG_FAMILIES = {
  indexable:[
    {code:'CXAN',name:'90° 方肩銑削刀具',op:'shoulder',dia:[25,100],apMax:15,insert:'ANMX15T6',page:'A031'},
    {code:'CXXN',name:'經濟型方肩銑削刀具',op:'shoulder',dia:[17,125],apMax:7,insert:'XNMX',page:'A033'},
    {code:'CAPK',name:'方肩銑削刀具',op:'shoulder',dia:[16,125],apMax:11,insert:'APKT',page:'A036'},
    {code:'CART',name:'斜坡／開槽方肩銑刀',op:'shoulder',dia:[10,26],apMax:7,insert:'WRT',page:'A039'},
    {code:'CASP',name:'經濟型方肩銑削刀具',op:'shoulder',dia:[12,80],apMax:6,insert:'SPMG',page:'A041'},
    {code:'CATP',name:'低切削阻力方肩銑刀',op:'shoulder',dia:[20,80],apMax:11,insert:'TPMX',page:'A045'},
    {code:'CAXD',name:'抗震方肩銑削刀具',op:'shoulder',dia:[16,32],apMax:10,insert:'XDMT',page:'A048'},
    {code:'CAXO',name:'高效率方肩銑削刀具',op:'shoulder',dia:[6,32],apMax:7,insert:'XOMT',page:'A050'},
    {code:'CBAP',name:'泛用方肩銑削刀具',op:'shoulder',dia:[16,80],apMax:11,insert:'APMT',page:'A053'},
    {code:'CR39',name:'高移除率方肩／側銑刀',op:'shoulder',dia:[16,125],apMax:11,insert:'W390',page:'A057'},
    {code:'CR49',name:'重複側銑方肩銑刀',op:'shoulder',dia:[20,80],apMax:9,insert:'W490',page:'A061'},
    {code:'CWEX',name:'高移除率方肩銑刀',op:'shoulder',dia:[16,100],apMax:11,insert:'AXMT',page:'A064'},
    {code:'CWMM',name:'過中心多功能方肩銑刀',op:'shoulder',dia:[10,80],apMax:11,insert:'APMT',page:'A066'},
    {code:'CXBN',name:'高進給銑削刀具',op:'highfeed',dia:[15,63],apMax:1.5,insert:'BNMU',page:'A071'},
    {code:'CXLN',name:'低阻力高進給銑刀',op:'highfeed',dia:[16,50],apMax:.9,insert:'LNMX',page:'A075'},
    {code:'CXLO',name:'高溫合金高進給銑刀',op:'highfeed',dia:[16,50],apMax:.9,insert:'LOGX',page:'A078',mats:['stainless','titanium','superalloy']},
    {code:'CXWN',name:'多功能高進給銑刀',op:'highfeed',dia:[25,160],apMax:1.35,insert:'WNMX',page:'A081'},
    {code:'CALP',name:'小徑高進給銑刀',op:'highfeed',dia:[8,16],apMax:.5,insert:'LPGX',page:'A084'},
    {code:'CAJX',name:'高剛性高進給銑刀',op:'highfeed',dia:[32,100],apMax:2,insert:'JDMT／JDMW',page:'A087'},
    {code:'CF23',name:'高硬材料高進給銑刀',op:'highfeed',dia:[32,160],apMax:2,insert:'WP26',page:'A091',mats:['prehardened','hardened']},
    {code:'CXHN',name:'淺切面銑刀',op:'face',dia:[50,100],apMax:3.5,insert:'HNMX',page:'A093'},
    {code:'CXSN',name:'多用途面銑刀',op:'face',dia:[50,202.9],apMax:6,insert:'SNMX／ONMX',page:'A095'},
    {code:'CAOF',name:'經濟型淺切面銑刀',op:'face',dia:[50,100],apMax:2.8,insert:'OFMT',page:'A098'},
    {code:'CASE',name:'泛用面銑刀',op:'face',dia:[50,100],apMax:5.5,insert:'SEKT／SEKW',page:'A100'},
    {code:'CASX',name:'大徑泛用面銑刀',op:'face',dia:[50,315],apMax:5.5,insert:'SEMT',page:'A102'},
    {code:'CARD',name:'圓刀片仿形銑刀',op:'copy',dia:[10,100],insert:'RDMT／RDMW',page:'A106'},
    {code:'CARP',name:'圓刀片仿形銑刀',op:'copy',dia:[16,80],insert:'RPMT／RPMW',page:'A112'},
    {code:'DTS',name:'雕刻／倒角／定位刀具',op:'chamfer',insert:'DCEX／SCGX／SCMX／SDMX／TCMX',page:'A126'},
    {code:'CAPH',name:'玉米粗銑刀',op:'rough',dia:[20,63],insert:'APKT',page:'A134'},
    {code:'CBAH',name:'玉米粗銑刀',op:'rough',dia:[20,63],insert:'APMT',page:'A136'},
    {code:'CSPT',name:'側溝／T槽三面刃銑刀',op:'disc',dia:[19,40],insert:'SPMG',page:'A141'}
  ],
  holemaking:[
    {code:'DPC3',name:'泛用內冷全鎢鋼鑽頭・3D',kind:'solid',dia:[.65,20],ratio:3,coolant:'internal',tip:'140°',page:'C010'},
    {code:'DPTC3',name:'高進給三刃內冷鑽頭・3D',kind:'solid',dia:[6,16],ratio:3,coolant:'internal',tip:'140°',page:'C012'},
    {code:'DPN3',name:'泛用外冷全鎢鋼鑽頭・3D',kind:'solid',dia:[.1,20],ratio:3,coolant:'external',tip:'130°／140°',page:'C013'},
    {code:'DPC5',name:'泛用內冷全鎢鋼鑽頭・5D',kind:'solid',dia:[.65,20],ratio:5,coolant:'internal',tip:'140°',page:'C017'},
    {code:'DPN5',name:'泛用外冷全鎢鋼鑽頭・5D',kind:'solid',dia:[3,20],ratio:5,coolant:'external',tip:'140°',page:'C019'},
    {code:'DPC7',name:'泛用內冷全鎢鋼鑽頭・7D',kind:'solid',dia:[4,16],ratio:7,coolant:'internal',tip:'140°',page:'C021'},
    {code:'DPC9-10D',name:'泛用內冷深孔鑽・10D',kind:'solid',dia:[1,16],ratio:10,coolant:'internal',tip:'135°',page:'C022'},
    {code:'DPC9-15D',name:'泛用內冷深孔鑽・15D',kind:'solid',dia:[1,12],ratio:15,coolant:'internal',tip:'135°',page:'C022'},
    {code:'DPC9-20D',name:'泛用內冷深孔鑽・20D',kind:'solid',dia:[1,10],ratio:20,coolant:'internal',tip:'135°',page:'C023'},
    {code:'DPC9-30D',name:'泛用內冷深孔鑽・30D',kind:'solid',dia:[3,6],ratio:30,coolant:'internal',tip:'135°',page:'C023'},
    {code:'DPN9',name:'外冷微小徑深孔鑽・10D／30D／50D',kind:'solid',dia:[.1,1.5],ratio:50,coolant:'external',tip:'130°',page:'C025'},
    {code:'DMC3',name:'鈦／不鏽鋼用內冷鑽頭・3D',kind:'solid',dia:[3.9,20],ratio:3,coolant:'internal',tip:'140°',page:'C026',mats:['stainless','titanium','superalloy']},
    {code:'DMN3',name:'鈦／不鏽鋼用外冷鑽頭・3D',kind:'solid',dia:[4,18],ratio:3,coolant:'external',tip:'140°',page:'C027',mats:['stainless','titanium','superalloy']},
    {code:'DMC5',name:'鈦／不鏽鋼用內冷鑽頭・5D',kind:'solid',dia:[3.4,20],ratio:5,coolant:'internal',tip:'140°',page:'C028',mats:['stainless','titanium','superalloy']},
    {code:'DHN3',name:'高硬鋼用外冷鑽頭・3D',kind:'solid',dia:[.9,12],ratio:3,coolant:'external',tip:'140°',page:'C029',mats:['prehardened','hardened']},
    {code:'DGN3',name:'泛用外冷鑽頭・3D',kind:'solid',dia:[3.1,13],ratio:3,coolant:'external',tip:'130°',page:'C030'},
    {code:'DAN',name:'直刃外冷鑽鉸刀・3D／5D',kind:'reamer',dia:[4,16],ratio:5,coolant:'external',tip:'130°',page:'C031'},
    {code:'DFN3',name:'平底外冷鑽頭・3D',kind:'solid',dia:[2.2,20],ratio:3,coolant:'external',tip:'180°',page:'C033'},
    {code:'DTN',name:'定位外冷鑽頭',kind:'spot',dia:[.3,16],coolant:'external',tip:'90°／120°／142°',page:'C035'},
    {code:'DZN',name:'階梯外冷全鎢鋼鑽頭',kind:'step',dia:[3.3,8.5],coolant:'external',tip:'140°',page:'C038',mats:['carbon','alloy','aluminum','plastic']},
    {code:'DMUA',name:'模組化鑽頭・3D～12D',kind:'modular',dia:[12,25.4],ratio:12,coolant:'internal',page:'C043'},
    {code:'DSP',name:'捨棄式鑽頭・2D～5D',kind:'indexable',dia:[12.5,41],ratio:5,coolant:'internal',page:'C049'},
    {code:'DWC',name:'捨棄式鑽頭・2D～5D',kind:'indexable',dia:[14,60],ratio:5,coolant:'internal',page:'C058'},
    {code:'DWD',name:'捨棄式鑽頭・3D～5D',kind:'indexable',dia:[10,25],ratio:5,coolant:'internal',page:'C067'},
    {code:'DTS60',name:'60° 捨棄式定位鑽',kind:'spot',dia:[.2,3],tip:'60°',page:'C072'},
    {code:'DTS90',name:'90° 捨棄式定位鑽',kind:'spot',dia:[1,20],tip:'90°',page:'C073'},
    {code:'DRMN',name:'螺旋機械外冷鉸刀',kind:'reamer',dia:[2.99,12.02],coolant:'external',page:'C077'},
    {code:'DRSC',name:'直刃內冷鉸刀',kind:'reamer',dia:[3,12],coolant:'internal',page:'C078'},
    {code:'DRSN',name:'直刃外冷鉸刀',kind:'reamer',dia:[2.99,20],coolant:'external',page:'C079'},
    {code:'DBP',name:'捨棄式內冷單刃精搪刀',kind:'boring',dia:[20,202],coolant:'internal',page:'C093'},
    {code:'DBR',name:'捨棄式內冷雙刃粗搪刀',kind:'boring',dia:[25,204],coolant:'internal',page:'C094'}
  ],
  turning:[
    {code:'CN□□',name:'C型 80° 車刀片',shape:'C',mode:'both',apps:['finish','medium','rough'],chip:'FP／SM／SP／MP／MK／RP／RK',page:'D027'},
    {code:'DN□□',name:'D型 55° 車刀片',shape:'D',mode:'both',apps:['finish','medium','rough'],chip:'FP／SP／MP／RK',page:'D028'},
    {code:'SN□□',name:'S型 90° 車刀片',shape:'S',mode:'both',apps:['medium','rough'],chip:'SM／MP／RK',page:'D029'},
    {code:'TN□□',name:'T型 60° 車刀片',shape:'T',mode:'both',apps:['finish','medium','rough'],chip:'FP／SM／SP／ME／MP／RK',page:'D030'},
    {code:'VN□□',name:'V型 35° 車刀片',shape:'V',mode:'both',apps:['finish','medium'],chip:'FP／MP／RK',page:'D031'},
    {code:'WN□□',name:'W型 80° 車刀片',shape:'W',mode:'both',apps:['finish','medium','rough'],chip:'FP／SP／MP／RK',page:'D032'},
    {code:'CC□□',name:'正角 C型 80° 車刀片',shape:'C',mode:'both',apps:['finish','medium'],chip:'FA／FB／MP／MK',page:'D033'},
    {code:'DC□□',name:'正角 D型 55° 車刀片',shape:'D',mode:'both',apps:['finish','medium'],chip:'FX／FY／FA／FB／MP／MK',page:'D035'},
    {code:'SC□□',name:'正角 S型 90° 車刀片',shape:'S',mode:'both',apps:['finish','medium'],chip:'FA／FB／SP／MP／MK',page:'D037'},
    {code:'TC□□',name:'正角 T型 60° 車刀片',shape:'T',mode:'both',apps:['finish','medium'],chip:'FA／FB／SP／MP／MK',page:'D039'},
    {code:'VC□□',name:'正角 V型 35° 車刀片',shape:'V',mode:'both',apps:['finish','medium'],chip:'FX／FY／FA／FB／SP',page:'D042'},
    {code:'TGF',name:'立式淺切槽刀具',mode:'both',apps:['groove'],depthMax:2.5,page:'D083'},
    {code:'TGL',name:'臥式淺切槽刀具',mode:'both',apps:['groove'],depthMax:2.5,page:'D087'},
    {code:'MGEH',name:'外徑／內徑切槽刀具',mode:'both',apps:['groove'],depthMax:20,page:'D092'},
    {code:'KGM',name:'外徑切槽刀具',mode:'external',apps:['groove'],depthMax:20,page:'D095'},
    {code:'SGIH',name:'切斷刀具',mode:'external',apps:['parting'],depthMax:40,page:'D098'},
    {code:'DLBSR',name:'迷你鎢鋼內徑搪刀',mode:'internal',apps:['finish','medium'],dia:[1,6.1],page:'D100'},
    {code:'DEBSR',name:'模組化鎢鋼內徑搪刀',mode:'internal',apps:['finish','medium'],dia:[1,6.1],page:'D109'},
    {code:'BTAH',name:'自動車床後掃加工刀具',mode:'external',apps:['back'],page:'D118',conditionKey:'BTAH_AUTO'},
    {code:'CTAH',name:'自動車床切槽／切斷刀具',mode:'external',apps:['groove','parting'],page:'D119',conditionKey:'CTAH_AUTO'},
    {code:'SAKN',aliases:['SAKNR','SAKNL'],name:'多功能切槽／車削刀片',mode:'external',apps:['groove','finish','medium'],page:'D123',insertFamily:true,holder:'SAKG 刀桿',grade:'CP6025'},
    {code:'SAKG',aliases:['SAKGR','SAKGL'],name:'多功能切槽刀片',mode:'external',apps:['groove'],page:'D124',insertFamily:true,holder:'SAKG 刀桿',grade:'CP6025'},
    {code:'SAKB',aliases:['SAKBR','SAKBL'],name:'多功能後掃刀片',mode:'external',apps:['back'],page:'D124',insertFamily:true,holder:'SAKG 刀桿',grade:'CP6025'},
    {code:'SAKC',aliases:['SAKCR','SAKCL'],name:'多功能切斷刀片',mode:'external',apps:['parting'],page:'D125',insertFamily:true,holder:'SAKG 刀桿',grade:'CP6025'},
    {code:'SAKP',aliases:['SAKPR','SAKPL'],name:'多功能仿形刀片',mode:'external',apps:['profiling'],page:'D125',insertFamily:true,holder:'SAKG 刀桿',grade:'CP6025'},
    {code:'SAKT',aliases:['SAKTR','SAKTL'],name:'多功能螺紋刀片',mode:'external',apps:['threading'],page:'D125',insertFamily:true,holder:'SAKG 刀桿',grade:'CP6025'}
  ],
  threading:[
    {code:'ETSN',name:'全鎢鋼單牙螺紋銑刀',kind:'mill',standards:['ISO'],pitch:[.25,1.75],page:'E008',conditionKey:'THREAD_STANDARD'},
    {code:'ETTN',name:'全鎢鋼三牙螺紋銑刀',kind:'mill',standards:['ISO','UN'],pitch:[.35,2.5],tpi:[10,36],page:'E009',conditionKey:'THREAD_STANDARD'},
    {code:'ETTC',name:'內冷三牙螺紋銑刀',kind:'mill',standards:['ISO','UN'],pitch:[.45,2.5],tpi:[10,36],page:'E009',conditionKey:'THREAD_STANDARD'},
    {code:'ETTRN',name:'R刃三牙螺紋銑刀',kind:'mill',standards:['ISO','UN'],pitch:[.35,2.5],tpi:[10,36],page:'E011',conditionKey:'THREAD_STANDARD'},
    {code:'ETLN',name:'多功能螺紋銑刀',kind:'mill',standards:['ISO','UN'],pitch:[.7,2],tpi:[11,40],page:'E013',conditionKey:'THREAD_STANDARD'},
    {code:'ETLC',name:'內冷多功能螺紋銑刀',kind:'mill',standards:['ISO','UN'],pitch:[.5,2],tpi:[13,36],page:'E013',conditionKey:'THREAD_STANDARD'},
    {code:'ETMN',name:'多牙螺紋銑刀',kind:'mill',standards:['ISO','UN'],pitch:[1,2.5],tpi:[8,36],page:'E015',conditionKey:'THREAD_ETM'},
    {code:'ETMC',name:'內冷多牙螺紋銑刀',kind:'mill',standards:['ISO'],pitch:[1,1.5],page:'E016',conditionKey:'THREAD_ETM'},
    {code:'ETMNPT／ETMCPT',name:'BSPT 管用錐形螺紋銑刀',kind:'mill',standards:['BSPT'],tpi:[11,28],page:'E018',conditionKey:'THREAD_ETM'},
    {code:'ETMNNT／ETMCNT',name:'NPT 管用錐形螺紋銑刀',kind:'mill',standards:['NPT'],tpi:[8,27],page:'E019',conditionKey:'THREAD_ETM'},
    {code:'ETDN',name:'鑽孔／倒角／螺紋複合刀',kind:'mill',standards:['ISO'],pitch:[.8,1.5],page:'E020',conditionPage:'E021',conditionKey:'THREAD_ETD',teeth:2,mats:['castiron','aluminum','copper','plastic']},
    {code:'ETMMM',aliases:['ETMWM'],name:'模組化螺紋銑刀',kind:'mill',standards:['ISO'],pitch:[.5,3],page:'E022',conditionPage:'E023',conditionKey:'THREAD_MODULAR'},
    {code:'ICXMT／ILNEX',name:'捨棄式螺紋銑刀',kind:'mill',standards:['ISO','UN'],pitch:[.75,3],tpi:[10,32],page:'E023'},
    {code:'ILNHT',name:'捨棄式管牙螺紋銑刀片',kind:'mill',standards:['BSPT','NPT'],tpi:[11,19],page:'E027'},
    {code:'DLTSR',name:'ISO M 全鎢鋼內徑螺紋車刀',kind:'turn',standards:['ISO'],dia:[3.2,6.1],page:'E028',conditionPage:'E053',conditionKey:'THREAD_TURN'},
    {code:'DLTMR',name:'60° 泛用牙內徑螺紋車刀',kind:'turn',standards:['ISO','UN'],dia:[2.6,10],page:'E029',conditionPage:'E053',conditionKey:'THREAD_TURN'},
    {code:'I11／I16／I22',name:'螺紋車刀片',kind:'turn',standards:['ISO','UN','W'],pitch:[.5,8],tpi:[3.25,48],page:'E032',conditionPage:'E053',conditionKey:'THREAD_TURN'},
    {code:'TKSNM',name:'全鎢鋼螺旋絲攻・通孔',kind:'tap',standards:['ISO'],threadSize:[5,12],page:'E055',conditionKey:'TKS_TAP',mats:['carbon','alloy','castiron','aluminum','copper']},
    {code:'TKSCM',name:'內冷螺旋絲攻・盲孔',kind:'tap',standards:['ISO'],threadSize:[5,12],page:'E056',conditionKey:'TKSC_TAP',mats:['carbon','alloy','castiron','aluminum','copper']},
    {code:'TKTNM',name:'全鎢鋼直刃絲攻・通孔',kind:'tap',standards:['ISO'],threadSize:[3,16],page:'E057',conditionKey:'TKT_TAP',mats:['castiron','aluminum','copper']},
    {code:'TKTCM',name:'內冷直刃絲攻・盲孔',kind:'tap',standards:['ISO'],threadSize:[3,16],page:'E058',conditionKey:'TKTC_TAP',mats:['castiron','aluminum','copper']},
    {code:'THTNM',name:'高硬用全鎢鋼直刃絲攻・通孔',kind:'tap',standards:['ISO'],threadSize:[3,16],page:'E059',conditionKey:'THT_TAP',mats:['hardened']},
    {code:'THTCM',name:'高硬用內冷直刃絲攻・盲孔',kind:'tap',standards:['ISO'],threadSize:[3,16],page:'E060',conditionKey:'THT_TAP',mats:['hardened']},
    {code:'TNFNM',name:'全鎢鋼無屑絲攻',kind:'tap',standards:['ISO'],threadSize:[1,6],page:'E061',conditionKey:'TNF_TAP',mats:['aluminum','copper']}
  ]
};

// 只登錄已從官方加工條件表確認的範圍；沒有資料的系列不顯示、不補猜。
const CATALOG_MACHINING = {
  BTAH_AUTO:{
    mode:'turning',conditionPage:'D118',feedUnit:'fr',
    rows:{
      carbon:{vc:[30,180],feed:[.01,.15]},alloy:{vc:[30,180],feed:[.01,.15]},prehardened:{vc:[30,180],feed:[.01,.15]},
      stainless:{vc:[50,120],feed:[.02,.10]},castiron:{vc:[30,180],feed:[.01,.15]},
      aluminum:{vc:[70,230],feed:[.03,.15]},copper:{vc:[70,230],feed:[.03,.15]}
    }
  },
  CTAH_AUTO:{
    mode:'turning',conditionPage:'D119',feedUnit:'fr',
    rows:{
      carbon:{vc:[30,180],feed:[.01,.09]},alloy:{vc:[30,180],feed:[.01,.09]},prehardened:{vc:[30,180],feed:[.01,.09]},
      stainless:{vc:[50,120],feed:[.02,.05]},castiron:{vc:[30,180],feed:[.01,.09]},
      aluminum:{vc:[70,230],feed:[.03,.11]},copper:{vc:[70,230],feed:[.03,.11]}
    }
  },
  CXLN:{
    mode:'milling',
    rows:{
      carbon:{vc:[120,250],feed:[.4,1.6],ap:[.3,.9]},
      alloy:{vc:[120,250],feed:[.4,1.6],ap:[.3,.9]},
      stainless:{vc:[100,180],feed:[.3,1.2],ap:[.3,.7]}
    }
  },
  CXLO:{
    mode:'milling',
    rows:{
      stainless:{vc:[100,180],feed:[.3,1.2],ap:[.3,.7]}
    }
  },
  CXWN:{
    mode:'milling',
    rows:{
      carbon:{vc:[120,250],feed:[.4,1.6],ap:[.3,.9]},
      alloy:{vc:[120,250],feed:[.4,1.6],ap:[.3,.9]},
      stainless:{vc:[100,180],feed:[.3,1.2],ap:[.3,.7]}
    }
  },
  DMC3:{
    mode:'drilling',
    rows:{
      stainless:{vc:[40,90],note:'官方依硬度分列：HRC＜20 為 50～90；HRC≥20 為 40～80 m/min'},
      titanium:{vc:[20,40]},
      superalloy:{vc:[18,30]}
    }
  },
  DMC5:{
    mode:'drilling',
    rows:{
      stainless:{vc:[40,90],note:'官方依硬度分列：HRC＜20 為 50～90；HRC≥20 為 40～80 m/min'},
      titanium:{vc:[20,40]},
      superalloy:{vc:[18,30]}
    }
  },
  THREAD_STANDARD:{
    mode:'thread_milling',conditionPage:'E021',feedUnit:'fz',
    rows:{
      carbon:{vc:[50,70],feed:[.02,.07]},alloy:{vc:[50,70],feed:[.02,.07]},prehardened:{vc:[50,70],feed:[.02,.07]},
      stainless:{vc:[50,70],feed:[.02,.07]},castiron:{vc:[50,100],feed:[.03,.10]},
      aluminum:{vc:[50,70],feed:[.03,.10]},copper:{vc:[50,70],feed:[.03,.10]},
      titanium:{vc:[20,60],feed:[.01,.03]},superalloy:{vc:[20,60],feed:[.01,.03]},hardened:{vc:[25,50],feed:[.01,.05]}
    }
  },
  THREAD_ETM:{
    mode:'thread_milling',conditionPage:'E021',feedUnit:'fz',
    rows:{
      carbon:{vc:[60,90],feed:[.02,.08]},alloy:{vc:[60,90],feed:[.02,.08]},prehardened:{vc:[60,90],feed:[.02,.08]},
      stainless:{vc:[60,90],feed:[.02,.08]},castiron:{vc:[50,100],feed:[.03,.10]},
      aluminum:{vc:[50,100],feed:[.02,.06]},copper:{vc:[50,100],feed:[.02,.06]},
      titanium:{vc:[20,60],feed:[.01,.03]},superalloy:{vc:[20,60],feed:[.01,.03]},hardened:{vc:[30,60],feed:[.01,.03]}
    }
  },
  THREAD_MODULAR:{
    mode:'thread_milling',conditionPage:'E023',feedUnit:'fz',
    rows:{
      carbon:{vc:[100,250],feed:[.10,.20]},alloy:{vc:[100,250],feed:[.10,.20]},prehardened:{vc:[100,250],feed:[.10,.20]},
      stainless:{vc:[130,200],feed:[.10,.18]},castiron:{vc:[100,200],feed:[.12,.20]},
      aluminum:{vc:[110,400],feed:[.15,.24]},copper:{vc:[110,400],feed:[.15,.24]},
      titanium:{vc:[25,100],feed:[.05,.15]},superalloy:{vc:[25,100],feed:[.05,.15]},hardened:{vc:[40,100],feed:[.05,.15]}
    }
  },
  THREAD_ETD:{
    mode:'drill_thread',conditionPage:'E021',
    rows:{
      castiron:{vc:[55,85],drillFeed:{small:[.07,.105],large:[.105,.154]},threadFeed:{small:[.014,.035],large:[.035,.07]}},
      copper:{vc:[70,280],drillFeed:{small:[.07,.210],large:[.042,.070]},threadFeed:{small:[.021,.042],large:[.042,.07]}},
      aluminum:{vc:[70,280],drillFeed:{small:[.07,.175],large:[.175,.210]},threadFeed:{small:[.021,.042],large:[.042,.07]}},
      plastic:{vc:[40,80],drillFeed:{small:[.07,.175],large:[.175,.210]},threadFeed:{small:[.021,.042],large:[.042,.07]}}
    }
  },
  THREAD_TURN:{
    mode:'thread_turning',conditionPage:'E053',feedUnit:'pitch',
    rows:{
      carbon:{vc:[60,140]},alloy:{vc:[60,140]},prehardened:{vc:[60,140]},
      stainless:{vc:[40,120]},castiron:{vc:[60,120]},
      titanium:{vc:[25,65]},superalloy:{vc:[25,65]},hardened:{vc:[20,60]}
    }
  },
  TKS_TAP:{mode:'tapping',conditionPage:'E055',feedUnit:'pitch',rows:{carbon:{vc:[5,15]},alloy:{vc:[5,15]},castiron:{vc:[5,15]},aluminum:{vc:[5,15]},copper:{vc:[5,15]}}},
  TKSC_TAP:{mode:'tapping',conditionPage:'E056',feedUnit:'pitch',rows:{carbon:{vc:[10,50]},alloy:{vc:[10,50]},castiron:{vc:[10,50]},aluminum:{vc:[10,50]},copper:{vc:[10,50]}}},
  TKT_TAP:{mode:'tapping',conditionPage:'E057',feedUnit:'pitch',rows:{castiron:{vc:[5,15]},aluminum:{vc:[5,15]},copper:{vc:[5,15]}}},
  TKTC_TAP:{mode:'tapping',conditionPage:'E058',feedUnit:'pitch',rows:{castiron:{vc:[10,50]},aluminum:{vc:[10,50]},copper:{vc:[10,50]}}},
  THT_TAP:{mode:'tapping',conditionPage:'E059／E060',feedUnit:'pitch',rows:{hardened:{vc:[2,4]}}},
  TNF_TAP:{mode:'tapping',conditionPage:'E061',feedUnit:'pitch',rows:{aluminum:{vc:[15,30]},copper:{vc:[15,30]}}}
};

// 系列順位只用於「哪個系列更適合這項加工」，不受S/F在型錄中是直接列值或公式換算影響。
const SERIES_PRIORITY = {
  superalloy:{
    any:['V53','V52','V47','M50'], side:['V53','V52','V47','M50'], slot:['V53','V47','V52','M50'],
    rough:['V53','V47','V52','M50'], finish:['V47','V53','V52','M50'], contour:['M50','V53','V47','H65']
  },
  titanium:{any:['V47','V52','V53','M50'],side:['V47','V52','V53','M50'],slot:['V47','V53','M50'],rough:['V47','V53','M50'],finish:['V47','V53','M50'],contour:['V47','M50','V53']},
  stainless:{any:['V47','M50','V53','G55'],side:['V47','M50','V53'],slot:['V47','M50','V53'],rough:['V47','M50','V53'],finish:['V47','M50','V53'],contour:['M50','V47','V53']},
  hardened:{any:['H70','H68','H65','H60','G55'],side:['H70','H68','H65','H60','G55'],slot:['H65','H60','G55'],rough:['H65','H60','G55'],finish:['H70','H68','H65'],contour:['H70','H68','H65']},
  prehardened:{any:['H60','H65','G55','M50'],side:['H60','H65','G55','M50'],slot:['H60','G55','M50'],rough:['H60','G55','M50'],finish:['H65','H60','G55'],contour:['H65','H60','G55']},
  alloy:{any:['G55','H60','M50','H65'],side:['G55','H60','M50'],slot:['G55','H60','M50'],rough:['G55','H60','M50'],finish:['H60','H65','G55'],contour:['H60','G55','M50']},
  carbon:{any:['G55','M50','H60'],side:['G55','M50','H60'],slot:['G55','M50','H60'],rough:['G55','M50','H60'],finish:['G55','H60','M50'],contour:['G55','M50','H60']},
  aluminum:{any:['A100'],side:['A100'],slot:['A100'],rough:['A100'],finish:['A100'],contour:['A100']},
  graphite:{any:['A200'],side:['A200'],slot:['A200'],rough:['A200'],finish:['A200'],contour:['A200']},
  composite:{any:['A300'],side:['A300'],slot:['A300'],rough:['A300'],finish:['A300'],contour:['A300']},
  carbide:{any:['H800','A830'],side:['H800','A830'],slot:['H800','A830'],rough:['H800','A830'],finish:['H800','A830'],contour:['H800','A830']}
};

function seriesSuitabilityRank(p,q) {
  const group=SERIES_PRIORITY[q.material];
  if (!group) return 20;
  const list=group[q.operation]||group.any||[];
  const series=String(p.series||'').toUpperCase();
  for (let i=0;i<list.length;i++) if (series.startsWith(String(list[i]).toUpperCase())) return i;
  return list.length+10;
}


function refreshIndexes() {
  SOURCE_BY_ID = new Map(DB.sources.map(s => [s.id, s]));
  PRODUCT_BY_CODE = new Map(DB.products.map(p => [p.code, p]));
  PROFILE_DONOR_BY_CODE = new Map();
  const meaningfulCount = p => (p?.profileIds || []).map(i => DB.profiles[i]).filter(profileHasMachiningData).length;
  const sameNumber = (a,b) => (a==null&&b==null) || (Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<0.000001);
  const sameGeometry = (a,b) => a && b && a.series===b.series && a.toolType===b.toolType && sameNumber(a.diameter,b.diameter) && sameNumber(a.flutes,b.flutes) && sameNumber(a.fluteLength,b.fluteLength) && sameNumber(a.cornerRadius,b.cornerRadius) && sameNumber(a.ballRadius,b.ballRadius);
  for (const p of DB.products) {
    if (!String(p.code||'').endsWith('S')) continue;
    const donor=PRODUCT_BY_CODE.get(String(p.code).slice(0,-1)+'P');
    if (sameGeometry(p,donor) && meaningfulCount(donor)>meaningfulCount(p)) PROFILE_DONOR_BY_CODE.set(p.code,donor);
  }
}

function populateFilters() {
  const mat = el('material');
  Object.entries(DB.materialNames).forEach(([k,v]) => mat.add(new Option(v,k)));
  unique(DB.products.map(p=>p.toolType)).sort().forEach(v=>el('toolType').add(new Option(v,v)));
  unique(DB.products.map(p=>p.series)).sort((a,b)=>a.localeCompare(b,'en')).forEach(v=>el('series').add(new Option(v,v)));
  unique(DB.products.map(p=>p.flutes).filter(Number.isFinite)).sort((a,b)=>a-b).forEach(v=>el('flutes').add(new Option(`${v} 刃`,String(v))));
  updateMaterialGradeOptions();
}

function wireEvents() {
  el('searchBtn').addEventListener('click', runSearch);
  el('reverseBtn').addEventListener('click', runReverseLookup);
  el('globalReverseBtn').addEventListener('click',runGlobalReverseLookup);
  el('globalReverseCode').addEventListener('keydown',e=>{if(e.key==='Enter')runGlobalReverseLookup();});
  el('resetBtn').addEventListener('click', resetForm);
  document.querySelectorAll('.mode-tab').forEach(button=>{
    button.addEventListener('click',()=>switchMode(button.dataset.mode));
  });
  ['material','materialGradeCustom','operation','toolType','diameter','depth','ap','ae','flutes','series','hardness','maxRpm'].forEach(id=>{
    el(id).addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });
  });
  el('material').addEventListener('change',updateMaterialGradeOptions);
  el('materialGrade').addEventListener('change',toggleCustomGrade);
  el('reverseCode').addEventListener('keydown', e => { if (e.key === 'Enter') runReverseLookup(); });
  document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>switchCategory(button.dataset.category)));
  el('snoozeUpdate').addEventListener('click',snoozeUpdateReminder);
  el('results').addEventListener('click', e => {
    const button=e.target.closest('[data-reverse-code]');
    if (button) renderReverseProduct(PRODUCT_BY_CODE.get(button.dataset.reverseCode));
  });
  el('globalReverseResults').addEventListener('click',e=>{
    const button=e.target.closest('[data-global-detail]');
    if (button) openGlobalReverseDetail(button);
  });
}

function updateMaterialGradeOptions() {
  const material=el('material').value;
  const select=el('materialGrade');
  select.innerHTML='';
  select.add(new Option(material?'不限牌號':'請先選擇加工材質',''));
  (MATERIAL_GRADES[material]||[]).forEach(grade=>select.add(new Option(grade,grade)));
  if (material) select.add(new Option('其他／自訂','__other__'));
  select.disabled=!material;
  el('materialGradeCustom').value='';
  el('materialGradeCustom').hidden=true;
  const showHardness=material==='prehardened'||material==='hardened';
  el('hardnessField').hidden=!showHardness;
  if (!showHardness) el('hardness').value='';
}

function toggleCustomGrade() {
  const custom=el('materialGrade').value==='__other__';
  el('materialGradeCustom').hidden=!custom;
  if (custom) el('materialGradeCustom').focus();
  else el('materialGradeCustom').value='';
}

function switchCategory(category) {
  const solid=category==='solid';
  document.querySelectorAll('[data-category]').forEach(button=>{
    const active=button.dataset.category===category;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
  });
  el('selectorLayout').hidden=!solid;
  el('categoryNotice').hidden=solid;
  if (!solid) renderCatalogForm(category);
}

function materialOptions() {
  return `<option value="">請選擇加工材質</option>${Object.entries(DB.materialNames).map(([k,v])=>`<option value="${esc(k)}">${esc(v)}</option>`).join('')}`;
}

function renderCatalogForm(category) {
  const info=CATEGORY_INFO[category];
  let fields='';
  if (category==='indexable') fields=`
    <div class="field"><label><span class="required-mark">＊</span>加工材質</label><select id="catalogMaterial">${materialOptions()}</select></div>
    <div class="field"><label><span class="required-mark">＊</span>刀具直徑（mm）</label><input id="catalogDiameter" type="number" min="0.1" step="0.1" placeholder="例：50"></div>
    <div class="field"><label>機台最高轉速（rpm） <small>選填</small></label><input id="catalogMaxRpm" type="number" min="1" step="100" placeholder="例：12000"></div>
    <div class="field"><label>加工方式 <small>選填</small></label><select id="catalogOperation"><option value="">不限</option><option value="shoulder">方肩銑削</option><option value="highfeed">高進給銑削</option><option value="face">面銑削</option><option value="copy">仿形銑削</option><option value="rough">玉米粗銑削</option><option value="disc">三面刃／側槽</option><option value="chamfer">雕刻／倒角</option></select></div>
    <div class="field"><label>AP 軸向切深（mm） <small>選填</small></label><input id="catalogAp" type="number" min="0" step="0.1" placeholder="例：2"></div>`;
  if (category==='holemaking' || category==='solid_drill' || category==='step_drill') fields=`
    <div class="field"><label><span class="required-mark">＊</span>加工材質</label><select id="catalogMaterial">${materialOptions()}</select></div>
    <div class="field"><label><span class="required-mark">＊</span>孔徑（mm）</label><input id="catalogDiameter" type="number" min="0.01" step="0.01" placeholder="例：8.5"></div>
    <div class="field"><label>機台最高轉速（rpm） <small>選填</small></label><input id="catalogMaxRpm" type="number" min="1" step="100" placeholder="例：12000"></div>
    <div class="field"><label>孔深 AP（mm） <small>選填</small></label><input id="catalogAp" type="number" min="0" step="0.1" placeholder="例：25"></div>
    <div class="field"><label>刀具類型 <small>選填</small></label><select id="catalogKind"><option value="">不限</option><option value="solid">全鎢鋼鑽頭</option><option value="step">階梯鑽</option><option value="spot">定位鑽</option><option value="modular">模組化鑽頭</option><option value="indexable">捨棄式鑽頭</option><option value="reamer">鉸刀／鑽鉸刀</option><option value="boring">搪孔刀</option></select></div>
    <div class="field"><label>冷卻方式 <small>選填</small></label><select id="catalogCoolant"><option value="">不限</option><option value="internal">內冷</option><option value="external">外冷</option></select></div>
    <p class="advanced-note">孔加工沒有 AE 欄位。AP 代表實際孔深；有倍徑資料的鑽頭會用「孔深 ÷ 孔徑」檢查。</p>`;
  if (category==='turning') fields=`
    <div class="field"><label><span class="required-mark">＊</span>加工材質</label><select id="catalogMaterial">${materialOptions()}</select></div>
    <div class="field"><label><span class="required-mark">＊</span>工件加工直徑（mm）</label><input id="catalogDiameter" type="number" min="0.1" step="0.1" placeholder="計算轉速用，例：50"></div>
    <div class="field"><label>機台最高轉速（rpm） <small>選填</small></label><input id="catalogMaxRpm" type="number" min="1" step="100" placeholder="例：4000"></div>
    <div class="field"><label>加工位置 <small>選填</small></label><select id="catalogMode"><option value="">不限</option><option value="external">外徑</option><option value="internal">內徑</option></select></div>
    <div class="field"><label>加工方式 <small>選填</small></label><select id="catalogOperation"><option value="">不限</option><option value="finish">精加工</option><option value="medium">中加工</option><option value="rough">粗加工</option><option value="groove">切槽</option><option value="parting">切斷</option><option value="back">後掃加工</option><option value="profiling">仿形加工</option><option value="threading">螺紋加工</option></select></div>
    <div class="field"><label>刀片形狀 <small>選填</small></label><select id="catalogShape"><option value="">不限</option><option value="C">C型 80°</option><option value="D">D型 55°</option><option value="S">S型 90°</option><option value="T">T型 60°</option><option value="V">V型 35°</option><option value="W">W型 80°</option></select></div>
    <div class="field"><label>AP 切深（mm） <small>選填</small></label><input id="catalogAp" type="number" min="0" step="0.1" placeholder="例：2"></div>`;
  if (category==='threading') fields=`
    <div class="field"><label><span class="required-mark">＊</span>加工材質</label><select id="catalogMaterial">${materialOptions()}</select></div>
    <div class="field"><label>機台最高轉速（rpm） <small>選填</small></label><input id="catalogMaxRpm" type="number" min="1" step="100" placeholder="例：3000"></div>
    <div class="field"><label>螺紋加工方式 <small>選填</small></label><select id="catalogKind"><option value="">不限</option><option value="mill">螺紋銑削</option><option value="tap">絲攻</option><option value="turn">螺紋車削</option></select></div>
    <div class="field"><label>螺紋標準 <small>選填</small></label><select id="catalogStandard"><option value="">不限</option><option value="ISO">ISO M 公制牙</option><option value="UN">UN 美制牙</option><option value="W">Whitworth 55°</option><option value="BSPT">BSPT 管牙</option><option value="NPT">NPT 管牙</option></select></div>
    <div class="field"><label>螺紋公稱直徑（mm） <small>選填</small></label><input id="catalogThreadSize" type="number" min="0.1" step="0.1" placeholder="例：M10 輸入 10"></div>
    <div class="field"><label>Pitch 螺距（mm） <small>選填</small></label><input id="catalogPitch" type="number" min="0.01" step="0.01" placeholder="例：1.5"></div>
    <div class="field"><label>TPI 每英吋牙數 <small>選填</small></label><input id="catalogTpi" type="number" min="1" step="0.5" placeholder="英制牙可輸入"></div>
    <p class="advanced-note">Pitch 與 TPI 都是選填；輸入其中一個即可。沒有輸入時會列出符合材質與牙型的系列。</p>`;
  el('categoryNotice').innerHTML=`<div class="catalog-layout">
    <aside class="panel catalog-filter">
      <div class="section-title"><div><span class="step">01</span><h2>${esc(info.name)}條件</h2></div></div>
      <div class="field-grid">${fields}</div>
      <button class="btn primary search-btn" id="catalogSearchBtn" style="margin-top:16px">開始篩選</button>
    </aside>
    <section class="catalog-content">
      <div class="panel catalog-intro"><div class="section-title compact"><div><span class="step">02</span><h2>篩選結果</h2></div></div><p>${esc(info.intro)}優先顯示官方型錄實際編碼；官方未提供的欄位不顯示。</p></div>
      <div class="catalog-results" id="catalogResults"><div class="catalog-empty">左側輸入加工條件後按「開始篩選」。</div></div>
    </section>
  </div>`;
  if (category==='solid_drill' || category==='step_drill') el('catalogKind')?.closest('.field')?.setAttribute('hidden','');
  if (category==='holemaking') {
    el('catalogKind')?.querySelector('option[value="solid"]')?.remove();
    el('catalogKind')?.querySelector('option[value="step"]')?.remove();
  }
  el('catalogSearchBtn').addEventListener('click',()=>runCatalogSearch(category));
  el('categoryNotice').querySelectorAll('input,select').forEach(input=>input.addEventListener('keydown',e=>{if(e.key==='Enter')runCatalogSearch(category);}));
}

function catalogNumber(id) {
  const node=el(id);
  if (!node) return null;
  const value=parseFloat(node.value);
  return Number.isFinite(value)?value:null;
}

function runCatalogSearch(category) {
  const baseCategory=(category==='solid_drill'||category==='step_drill')?'holemaking':category;
  const material=el('catalogMaterial').value;
  if (!material) { alert('請先選擇加工材質。'); el('catalogMaterial').focus(); return; }
  const diameter=catalogNumber('catalogDiameter');
  if ((category==='indexable'||baseCategory==='holemaking'||category==='turning')&&!diameter) {
    const message=baseCategory==='holemaking'?'請輸入孔徑。':category==='turning'?'請輸入工件加工直徑。':'請輸入刀具直徑。';
    alert(message); el('catalogDiameter').focus(); return;
  }
  const ap=catalogNumber('catalogAp');
  const maxRpm=catalogNumber('catalogMaxRpm');
  const operation=el('catalogOperation')?.value||'';
  const selectedKind=el('catalogKind')?.value||'';
  const kind=category==='solid_drill'?'solid':category==='step_drill'?'step':selectedKind;
  const coolant=el('catalogCoolant')?.value||'';
  const mode=el('catalogMode')?.value||'';
  const shape=el('catalogShape')?.value||'';
  const standard=el('catalogStandard')?.value||'';
  const threadSize=catalogNumber('catalogThreadSize');
  const pitch=catalogNumber('catalogPitch');
  const tpi=catalogNumber('catalogTpi');
  const rows=[];
  for (const family of CATALOG_FAMILIES[baseCategory]) {
    const mats=family.mats||ALL_WORK_MATERIALS;
    if (!mats.includes(material)) continue;
    if (operation && family.op!==operation && !(family.apps||[]).includes(operation)) continue;
    if (kind && family.kind!==kind) continue;
    if (category==='holemaking' && !kind && (family.kind==='solid'||family.kind==='step')) continue;
    if (coolant && family.coolant && family.coolant!==coolant) continue;
    if (mode && family.mode!=='both' && family.mode!==mode) continue;
    if (shape && family.shape!==shape) continue;
    if (standard && !(family.standards||[]).includes(standard)) continue;
    if (diameter!==null && family.dia && (diameter<family.dia[0]-1e-9||diameter>family.dia[1]+1e-9)) continue;
    if (category==='turning' && ap!==null && family.depthMax && ap>family.depthMax+1e-9) continue;
    if (ap!==null && category==='indexable' && family.apMax && ap>family.apMax+1e-9) continue;
    if (ap!==null && baseCategory==='holemaking' && family.ratio && diameter && ap/diameter>family.ratio+1e-9) continue;
    if (threadSize!==null && family.threadSize && (threadSize<family.threadSize[0]||threadSize>family.threadSize[1])) continue;
    if (pitch!==null && family.kind==='mill') {
      const convertedTpi=25.4/pitch;
      const pitchFits=family.pitch&&pitch>=family.pitch[0]-1e-9&&pitch<=family.pitch[1]+1e-9;
      const tpiFits=family.tpi&&convertedTpi>=family.tpi[0]-1e-9&&convertedTpi<=family.tpi[1]+1e-9;
      if (!pitchFits&&!tpiFits) continue;
    }
    if (tpi!==null && family.kind!=='tap' && (!family.tpi||tpi<family.tpi[0]-1e-9||tpi>family.tpi[1]+1e-9)) continue;
    let score=0;
    if (!family.mats) score+=2;
    if (diameter!==null&&family.dia) score+=(family.dia[1]-family.dia[0])/100;
    if (ap!==null && baseCategory==='holemaking' && !family.ratio) score+=3;
    if (pitch!==null && !family.pitch) score+=1;
    rows.push({family,score});
  }
  rows.sort((a,b)=>a.score-b.score||a.family.code.localeCompare(b.family.code,'en'));
  const query={material,diameter,ap,pitch,tpi,threadSize,maxRpm};
  renderCatalogResults(baseCategory,expandCatalogRows(baseCategory,rows,query),query);
}

function rangeText(range,prefix='') {
  return range?`${prefix}${fmt(range[0])}～${fmt(range[1])}`:'';
}

function catalogDbCategory(category) {
  return category==='holemaking'?'hole':category;
}

function catalogEntryComplete(entry) {
  return !!(entry && entry.kind==='order' && entry.code && !/[.□…]/.test(entry.code) && normalizedToolCode(entry.code).length>=5);
}

function familyMatchTokens(family) {
  const tokens=[];
  [family.code,...(family.aliases||[])].join('／').toUpperCase().split(/[／/]/).forEach(part=>{
    const beforeDepth=part.replace(/-\d+D.*$/,'');
    const token=normalizedToolCode(beforeDepth.replace(/□/g,''));
    if (token) tokens.push(token);
  });
  return unique(tokens).sort((a,b)=>b.length-a.length);
}

function entryMatchesFamily(entry,family) {
  const code=normalizedToolCode(entry.code);
  const series=normalizedToolCode(entry.series);
  const tokens=familyMatchTokens(family);
  if (tokens.some(token=>series===token||series.startsWith(token)||code.startsWith(token)||code.startsWith('I'+token))) return true;
  if (!family.ratio) return false;
  return tokens.some(token=>{
    const ratio=String(family.ratio);
    const base=token.endsWith(ratio)?token.slice(0,-ratio.length):token;
    return base.length>=3&&(series===base||series.startsWith(base)||code.startsWith(base)||code.startsWith('I'+base));
  });
}

function threadEntryValues(entry) {
  const text=String(entry?.spec||'').replace(/×/g,'x');
  const match=text.match(/\bM\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (!match) {
    const modular=text.match(/≥\s*M\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/i);
    return modular?{size:Number(modular[1]),pitch:Number(modular[3]),toolDiameter:Number(modular[2]),secondaryDiameter:null,minSize:true}:null;
  }
  const tail=text.slice((match.index||0)+match[0].length);
  const values=[...tail.matchAll(/-?\d+(?:\.\d+)?/g)].map(item=>Number(item[0]));
  return {
    size:Number(match[1]),
    pitch:Number(match[2]),
    toolDiameter:Number.isFinite(values[0])?values[0]:null,
    secondaryDiameter:Number.isFinite(values[2])?values[2]:null
  };
}

function familyCatalogEntries(category,family,q) {
  let entries=(CATALOG_DB.entries||[]).filter(entry=>
    entry.category===catalogDbCategory(category) &&
    entry.kind==='order' &&
    entryMatchesFamily(entry,family)
  );
  if (category==='turning'&&family.insertFamily) {
    entries=entries.filter(entry=>!normalizedToolCode(entry.code).startsWith('ISAKG'));
  }
  if (category==='holemaking' && /^DPC9-\d+D/i.test(family.code)) {
    const pageByRatio={10:'C021',15:'C022',20:'C023'};
    const expected=pageByRatio[family.ratio];
    if (expected) entries=entries.filter(entry=>entry.catalogPage===expected);
  }
  if ((category==='indexable'||category==='holemaking')&&Number.isFinite(q.diameter)) {
    entries=entries.filter(entry=>Number.isFinite(entry.diameter)&&Math.abs(entry.diameter-q.diameter)<=.011);
  }
  if (category==='threading'&&family.kind!=='turn'&&(Number.isFinite(q.threadSize)||Number.isFinite(q.pitch))) {
    entries=entries.filter(entry=>{
      const values=threadEntryValues(entry);
      if (!values) return false;
      if (Number.isFinite(q.threadSize)&&(values.minSize?q.threadSize<values.size:Math.abs(values.size-q.threadSize)>.011)) return false;
      if (Number.isFinite(q.pitch)&&Math.abs(values.pitch-q.pitch)>.011) return false;
      return true;
    });
  }
  const seen=new Set();
  return entries.filter(entry=>{
    const key=[normalizedToolCode(entry.code),entry.catalogPage,entry.spec].join('|');
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function expandCatalogRows(category,families,q) {
  const expanded=[];
  for (const row of families) {
    const entries=familyCatalogEntries(category,row.family,{...q,threadSize:q.threadSize});
    if (entries.length) {
      entries.forEach(entry=>expanded.push({...row,entry,complete:catalogEntryComplete(entry)}));
    } else {
      expanded.push({...row,entry:null,complete:false});
    }
  }
  const seen=new Set();
  const uniqueRows=expanded.filter(row=>{
    const key=row.entry?`${catalogDbCategory(category)}|${normalizedToolCode(row.entry.code)}|${row.entry.catalogPage}`:`family|${row.family.code}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  const diameterDistance=row=>(category==='indexable'||category==='holemaking')
    ?Math.abs((row.entry?.diameter??q.diameter??0)-(q.diameter??0))
    :0;
  uniqueRows.sort((a,b)=>
    (a.entry?0:1)-(b.entry?0:1) ||
    (a.complete?0:1)-(b.complete?0:1) ||
    a.score-b.score ||
    diameterDistance(a)-diameterDistance(b) ||
    String(a.entry?.code||a.family.code).localeCompare(String(b.entry?.code||b.family.code),'en')
  );
  return uniqueRows;
}

function familySpecs(family) {
  const specs=[];
  if (family.dia) specs.push(`適用直徑 ${rangeText(family.dia,'Ø')} mm`);
  if (family.apMax) specs.push(`官方最大 AP ${fmt(family.apMax)} mm`);
  if (family.ratio) specs.push(`最長 ${fmt(family.ratio,0)}D`);
  if (family.pitch) specs.push(`Pitch ${rangeText(family.pitch)} mm`);
  if (family.tpi) specs.push(`TPI ${rangeText(family.tpi)}`);
  if (family.threadSize) specs.push(`M${fmt(family.threadSize[0])}～M${fmt(family.threadSize[1])}`);
  if (family.coolant) specs.push(family.coolant==='internal'?'內冷':'外冷');
  if (family.tip) specs.push(`鑽尖 ${family.tip}`);
  if (family.insert) specs.push(`刀片 ${family.insert}`);
  if (family.chip) specs.push(`斷屑槽 ${family.chip}`);
  if (family.depthMax) specs.push(`最大切深 ${fmt(family.depthMax)} mm`);
  if (family.standards) specs.push(`牙型 ${family.standards.join('／')}`);
  return specs;
}

function catalogFamilyForEntry(entry) {
  const category=entry?.category==='hole'?'holemaking':entry?.category;
  return (CATALOG_FAMILIES[category]||[]).find(family=>entryMatchesFamily(entry,family))||null;
}

function catalogEntrySpecs(family,entry) {
  if (!entry) return [];
  const specs=[];
  if (entry.category==='threading') {
    const values=threadEntryValues(entry);
    if (values) {
      specs.push(`螺紋 M${fmt(values.size)} × ${fmt(values.pitch)} mm`);
      if (family?.kind==='mill'&&Number.isFinite(values.toolDiameter)) specs.push(`刀具直徑 Ø${fmt(values.toolDiameter)} mm`);
      if (normalizedToolCode(family?.code)==='ETDN'&&Number.isFinite(values.secondaryDiameter)) specs.push(`螺紋刃徑 Ø${fmt(values.secondaryDiameter)} mm`);
    }
  } else if (entry.category==='turning'&&family?.insertFamily) {
    const holderCode=normalizedToolCode(entry.code).startsWith('ISAKG');
    if (holderCode) {
      specs.push('相容刀片 SAKG 多功能刀片');
    } else {
      const width=Number((String(entry.spec||'').match(/\d+(?:\.\d+)?/)||[])[0]);
      if (Number.isFinite(width)) specs.push(`刃寬 W ${fmt(width)} mm`);
      if (family.holder) specs.push(`相容刀桿 ${family.holder}`);
      if (family.grade) specs.push(`刀片材質 ${family.grade}`);
    }
  } else if (entry.category==='turning'&&['BTAH_AUTO','CTAH_AUTO'].includes(family?.conditionKey)) {
    const tail=String(entry.spec||'').replace(/^\S+\s*/,'');
    const values=[...tail.matchAll(/-?\d+(?:\.\d+)?/g)].map(match=>Number(match[0]));
    if (Number.isFinite(values[0])&&Number.isFinite(values[1])) specs.push(`刀桿尺寸 ${fmt(values[0])} × ${fmt(values[1])} mm`);
    if (Number.isFinite(values[2])) specs.push(`全長 L ${fmt(values[2])} mm`);
  } else if (entry.category!=='turning'&&Number.isFinite(entry.diameter)) {
    specs.push(`刀具直徑 Ø${fmt(entry.diameter)} mm`);
  }
  return specs;
}

function catalogPageForEntry(entry,family) {
  if (entry?.category==='turning'&&family?.insertFamily&&Number.isFinite(entry.pdfPage)) {
    return `D${String(Math.max(1,entry.pdfPage-1)).padStart(3,'0')}`;
  }
  if (entry?.category==='turning'&&['BTAH_AUTO','CTAH_AUTO'].includes(family?.conditionKey)) {
    return family.page;
  }
  return entry?.catalogPage||family?.page||'';
}

function catalogToothCount(entry) {
  const values=[...String(entry?.spec||'').matchAll(/\b\d+(?:\.\d+)?\b/g)].map(match=>Number(match[0]));
  const value=values[values.length-1];
  return Number.isInteger(value)&&value>=1&&value<=30?value:null;
}

function catalogCondition(family) {
  return CATALOG_MACHINING[family?.conditionKey]||CATALOG_MACHINING[family?.code]||null;
}

function catalogToolDiameter(family,entry,q) {
  if (entry?.category==='threading'||family?.kind==='mill'||family?.kind==='tap'||family?.kind==='turn') {
    const values=threadEntryValues(entry);
    if (family?.kind==='tap'||family?.kind==='turn') return values?.size||q.threadSize||null;
    return values?.toolDiameter||null;
  }
  return Number.isFinite(q.diameter)?q.diameter:(Number.isFinite(entry?.diameter)?entry.diameter:null);
}

function rpmForVc(vc,diameter,cap) {
  const raw=vc.map(value=>1000*value/(Math.PI*diameter));
  return {raw,actual:raw.map(value=>cap?Math.min(value,cap):value)};
}

function machiningValue(label,value,unit='') {
  return `<div class="catalog-machining-value"><span>${esc(label)}</span><strong>${esc(value)}</strong>${unit?`<small>${esc(unit)}</small>`:''}</div>`;
}

function etdMachiningHtml(family,entry,q,condition,row) {
  const values=threadEntryValues(entry);
  const drillDiameter=values?.toolDiameter;
  const millDiameter=values?.secondaryDiameter||drillDiameter;
  if (!Number.isFinite(drillDiameter)||!Number.isFinite(millDiameter)) return '';
  const bucket=drillDiameter<=6?'small':'large';
  const drillFeed=row.drillFeed?.[bucket];
  const threadFeed=row.threadFeed?.[bucket];
  if (!drillFeed||!threadFeed) return '';
  const cap=Number.isFinite(q.maxRpm)?q.maxRpm:null;
  const drillRpm=rpmForVc(row.vc,drillDiameter,cap);
  const millRpm=rpmForVc(row.vc,millDiameter,cap);
  const drillF=[drillRpm.actual[0]*drillFeed[0],drillRpm.actual[1]*drillFeed[1]];
  const millF=[millRpm.actual[0]*2*threadFeed[0],millRpm.actual[1]*2*threadFeed[1]];
  const limited=cap&&(drillRpm.raw[1]>cap||millRpm.raw[1]>cap);
  return `<div class="catalog-machining">
    <h4>官方 E021 加工參數與換算</h4>
    <div class="catalog-machining-groups">
      <div class="catalog-machining-group"><h5>① 鑽孔／倒角（Ø${fmt(drillDiameter)}）</h5><div class="catalog-machining-grid">
        ${machiningValue('官方 Vc',`${fmt(row.vc[0])}～${fmt(row.vc[1])}`,'m/min')}
        ${machiningValue('官方 f',`${fmt(drillFeed[0],3)}～${fmt(drillFeed[1],3)}`,'mm/rev')}
        ${machiningValue('主軸轉速 S',`${fmt(drillRpm.actual[0],0)}～${fmt(drillRpm.actual[1],0)}`,'rpm')}
        ${machiningValue('進給速度 F',`${fmt(drillF[0],0)}～${fmt(drillF[1],0)}`,'mm/min')}
      </div></div>
      <div class="catalog-machining-group"><h5>② 螺紋銑削（Ø${fmt(millDiameter)}・2刃）</h5><div class="catalog-machining-grid">
        ${machiningValue('官方 Vc',`${fmt(row.vc[0])}～${fmt(row.vc[1])}`,'m/min')}
        ${machiningValue('官方 fz',`${fmt(threadFeed[0],3)}～${fmt(threadFeed[1],3)}`,'mm/刃')}
        ${machiningValue('主軸轉速 S',`${fmt(millRpm.actual[0],0)}～${fmt(millRpm.actual[1],0)}`,'rpm')}
        ${machiningValue('進給速度 F',`${fmt(millF[0],0)}～${fmt(millF[1],0)}`,'mm/min')}
      </div></div>
    </div>
    <small>官方依刀徑分為 ≤6 mm 與 ≤12 mm。${limited?`已受機台最高轉速 ${fmt(cap,0)} rpm 限制並同步重算進給。`:''}</small>
  </div>`;
}

function catalogMachiningHtml(family,entry,q) {
  const condition=catalogCondition(family);
  const row=condition?.rows?.[q.material];
  if (!row||!row.vc) return '';
  if (condition.mode==='drill_thread') return etdMachiningHtml(family,entry,q,condition,row);
  const diameter=catalogToolDiameter(family,entry,q);
  if (!Number.isFinite(diameter)) return '';
  const cap=Number.isFinite(q.maxRpm)?q.maxRpm:null;
  const result=rpmForVc(row.vc,diameter,cap);
  const rpmRaw=result.raw;
  const rpm=result.actual;
  const fields=[
    machiningValue('官方 Vc',`${fmt(row.vc[0])}～${fmt(row.vc[1])}`,'m/min'),
    machiningValue('主軸轉速 S',`${fmt(rpm[0],0)}～${fmt(rpm[1],0)}`,'rpm')
  ];
  if (row.feed) {
    const feedLabel=condition.feedUnit==='fz'?'官方 fz':'官方進給';
    const feedUnit=condition.feedUnit==='fz'?'mm/刃':'mm/rev';
    fields.splice(1,0,machiningValue(feedLabel,`${fmt(row.feed[0],3)}～${fmt(row.feed[1],3)}`,feedUnit));
    if (condition.feedUnit==='fr') {
      const feed=[rpm[0]*row.feed[0],rpm[1]*row.feed[1]];
      fields.push(machiningValue('進給速度 F',`${fmt(feed[0],0)}～${fmt(feed[1],0)}`,'mm/min'));
    } else {
      const teeth=family.teeth||catalogToothCount(entry);
      if (teeth) {
      const feed=[rpm[0]*teeth*row.feed[0],rpm[1]*teeth*row.feed[1]];
      fields.push(machiningValue(`進給速度 F（${teeth}刃）`,`${fmt(feed[0],0)}～${fmt(feed[1],0)}`,'mm/min'));
      }
    }
  }
  if (condition.feedUnit==='pitch') {
    const values=threadEntryValues(entry);
    const pitch=Number.isFinite(q.pitch)?q.pitch:(values?.pitch||(Number.isFinite(q.tpi)?25.4/q.tpi:null));
    if (Number.isFinite(pitch)) {
      fields.splice(1,0,machiningValue('每轉進給（螺距）',fmt(pitch,3),'mm/rev'));
      fields.push(machiningValue('進給速度 F',`${fmt(rpm[0]*pitch,0)}～${fmt(rpm[1]*pitch,0)}`,'mm/min'));
    }
  }
  if (row.ap) fields.push(`<div class="catalog-machining-value"><span>官方 AP</span><strong>${fmt(row.ap[0])}～${fmt(row.ap[1])} mm</strong></div>`);
  const notes=[];
  if (row.note) notes.push(row.note);
  if (cap&&rpmRaw[1]>cap) notes.push(`已受機台最高轉速 ${fmt(cap,0)} rpm 限制並同步重算進給`);
  if (row.feed&&condition.feedUnit==='fz'&&!(family.teeth||catalogToothCount(entry))) notes.push('官方已提供 fz；此刀號尚未確認刃數，因此不推算 F');
  return `<div class="catalog-machining"><h4>官方 ${esc(condition.conditionPage||family.conditionPage||family.page)} 加工參數與換算</h4><div class="catalog-machining-grid">${fields.join('')}</div>${notes.length?`<small>${esc(notes.join('；'))}</small>`:''}</div>`;
}

function renderCatalogResults(category,rows,q) {
  const target=el('catalogResults');
  if (!rows.length) {
    target.innerHTML='<div class="catalog-empty"><h3>沒有找到符合條件的官方刀號</h3><p>可放寬刀徑、AP、Pitch 或刀具類型再試一次。</p></div>';
    return;
  }
  const shown=rows.slice(0,80);
  target.innerHTML=`<div class="mode-banner">共找到 <strong>${rows.length}</strong> 筆符合結果。依條件符合程度排列${rows.length>shown.length?'，先顯示前 80 筆':''}。</div>`+shown.map(({family,entry,complete},index)=>{
    const specs=unique([...catalogEntrySpecs(family,entry),...familySpecs(family)]);
    const page=catalogPageForEntry(entry,family);
    const pageNumber=entry?.pdfPage||((parseInt(String(page).replace(/\D/g,''),10)||1)+1);
    const url=`${entry?.sourceUrl||OFFICIAL_CATALOGS[category]}#page=${pageNumber}`;
    const condition=catalogCondition(family);
    const conditionPage=family.conditionPage||condition?.conditionPage;
    const conditionPageNumber=(parseInt(String(conditionPage||'').replace(/\D/g,''),10)||0)+1;
    const conditionUrl=conditionPage&&conditionPage!==page?`${entry?.sourceUrl||OFFICIAL_CATALOGS[category]}#page=${conditionPageNumber}`:'';
    const title=entry?.code||family.code;
    return `<article class="catalog-card">
      <div class="catalog-card-head"><div class="catalog-card-title"><div class="rank">${index+1}</div><div><h3>${esc(title)}</h3><p>${esc(family.code)}・${esc(family.name)}</p></div></div><div class="catalog-page-actions"><a class="pdf-btn" href="${url}" target="_blank" rel="noopener">${condition&&conditionPage===page?'規格／參數':'規格'} ${esc(page)}</a>${conditionUrl?`<a class="pdf-btn parameters" href="${conditionUrl}" target="_blank" rel="noopener">參數 ${esc(conditionPage)}</a>`:''}</div></div>
      <div class="catalog-specs">${specs.map(spec=>`<span>${esc(spec)}</span>`).join('')}</div>
      ${catalogMachiningHtml(family,entry,q)}
      <div class="catalog-source"><span>WINSTAR 官方型錄 ${esc(page)}</span><a href="${url}" target="_blank" rel="noopener">查看官方規格頁</a></div>
    </article>`;
  }).join('');
}

function switchMode(mode) {
  const reverse=mode==='reverse';
  el('selectMode').hidden=reverse;
  el('reverseMode').hidden=!reverse;
  el('selectModeTab').classList.toggle('active',!reverse);
  el('reverseModeTab').classList.toggle('active',reverse);
  el('selectModeTab').setAttribute('aria-selected',String(!reverse));
  el('reverseModeTab').setAttribute('aria-selected',String(reverse));
  el('resultHeading').textContent=reverse?'刀號反查結果':'篩選結果';
  el('results').innerHTML='';
  el('summaryText').className='empty-summary';
  el('summaryText').textContent=reverse?'輸入完整或部分刀號後按「反查刀具」。':'左側選擇加工條件後按「開始選刀」。';
  requestAnimationFrame(()=>el(reverse?'reverseCode':'material').focus());
}

function resetForm() {
  document.querySelectorAll('.filters input').forEach(i => {
    i.value = '';
  });
  document.querySelectorAll('.filters select').forEach(s => s.selectedIndex = 0);
  el('operation').value='any'; el('diameterMode').value='exact';
  updateMaterialGradeOptions();
  el('results').innerHTML='';
  el('resultHeading').textContent='篩選結果';
  el('summaryText').className='empty-summary';
  el('summaryText').textContent='左側選擇加工條件後按「開始選刀」。';
}


function profileHasMachiningData(x) {
  return !!(x && (x.ap || x.ae || x.vcRange || Object.keys(x.fzValues||{}).length || Object.keys(x.diameterValues||{}).length));
}

function getProductProfiles(p) {
  const own=(p.profileIds || []).map(i=>DB.profiles[i]).filter(Boolean);
  if (own.some(profileHasMachiningData)) return own;
  const donor=PROFILE_DONOR_BY_CODE.get(p.code);
  if (!donor) return own;
  const inherited=(donor.profileIds || []).map(i=>DB.profiles[i]).filter(Boolean);
  return inherited.length ? inherited : own;
}

function productMaterials(p) {
  return unique([...(p.materials||[]), ...getProductProfiles(p).map(x=>x.material).filter(x=>x && x!=='any')]);
}

function materialSupportInfo(p, material) {
  const profiles=getProductProfiles(p).filter(profileHasMachiningData);
  const exact=profiles.filter(x=>x.material===material || x.material==='any');
  if (exact.length) return {supported:true,exact:true,source:'official_condition'};
  // 若同一刀型已有其他材料的完整速度/進給表，代表官方明確列了材料範圍；沒有選定材料列就不跨材料套用。
  const hasOtherCompleteMaterialTable=profiles.some(x=>x.material && x.material!=='any' && (x.mode==='rpm_feed_table'||x.mode==='vc_fz'));
  if (hasOtherCompleteMaterialTable) return {supported:false,exact:false,source:'missing_material_row'};
  const iconSupport=(p.materials||[]).includes(material);
  return {supported:iconSupport,exact:false,source:iconSupport?'official_icon_only':'none'};
}

function parseHardness(text) {
  if (!text) return null;
  const m=String(text).match(/(?:HRC\s*)?(\d+(?:\.\d+)?)/i);
  return m ? Number(m[1]) : null;
}

function hardnessInfo(p, hardness) {
  if (!Number.isFinite(hardness)) return {known:false, fits:true, rank:1, label:'未指定'};
  const exact=HARDNESS_RANGES[p.series];
  const fallback=Object.entries(HARDNESS_RANGES).find(([k])=>String(p.series||'').startsWith(k))?.[1];
  const range=exact||fallback;
  if (!range) return {known:false, fits:true, rank:2, label:'官方系列硬度範圍未建檔'};
  const fits=hardness>=range.min-0.01 && hardness<=range.max+0.01;
  return {known:true,fits,rank:fits?0:9,label:range.label};
}

function factorContains(f, actualRatio) {
  if (!f || !Number.isFinite(actualRatio)) return false;
  const tolerance = 0.015;
  const min=Number(f.min),max=Number(f.max);
  if (f.kind==='max' || f.kind==='exact') return actualRatio>0 && actualRatio<=max+tolerance;
  return actualRatio >= min-tolerance && actualRatio <= max+tolerance;
}

function factorStatus(f, actualRatio, supplied) {
  if (!supplied) return {state:'not_requested',rank:0};
  if (!f) return {state:'missing',rank:2};
  return factorContains(f,actualRatio) ? {state:'fit',rank:0} : {state:'reject',rank:99};
}

function operationRank(profile,q) {
  if (!profile) return 3;
  if (q.operation==='any') return profile.operation==='any'?1:0;
  if (profile.operation===q.operation) return 0;
  if (profile.operation==='any') return 1;
  return 99;
}

function profileEvaluation(profile,q) {
  if (!profile) return {ok:false,missing:true};
  if (q.material && profile.material!==q.material && profile.material!=='any') return {ok:false};
  const opRank=operationRank(profile,q);
  if (opRank>=99) return {ok:false};
  const ap=factorStatus(profile.ap,q.ap/q.diameterForCondition,q.ap!==null);
  const ae=factorStatus(profile.ae,q.ae/q.diameterForCondition,q.ae!==null);
  if (ap.state==='reject' || ae.state==='reject') return {ok:false,knownMismatch:true};
  const missingCount=[ap,ae].filter(x=>x.state==='missing').length;
  const detailPriority=Number.isFinite(profile.detailPriority)?profile.detailPriority:0;
  return {ok:true,opRank,ap,ae,missingCount,detailPriority};
}

function isSaneEntry(value,d,z) {
  if (!value) return false;
  const rpm=Number(value.rpm),feed=Number(value.feed);
  if (!Number.isFinite(rpm)||!Number.isFinite(feed)||rpm<100||rpm>200000||feed<1||feed>100000) return false;
  const fz=feed/(rpm*Math.max(1,z));
  if (!Number.isFinite(fz)||fz<0.00005||fz>5) return false;
  if (Number.isFinite(value.vc)) {
    const actualVc=Math.PI*d*rpm/1000;
    const ref=Number(value.vc);
    if (ref>0 && (actualVc<ref*0.45 || actualVc>ref*1.65)) return false;
  }
  return true;
}

function validEntries(obj,z) {
  return Object.entries(obj||{}).map(([k,v])=>({diameter:parseFloat(k),value:v}))
    .filter(x=>Number.isFinite(x.diameter)&&isSaneEntry(x.value,x.diameter,z));
}

function nearestValidEntry(obj,diameter,z) {
  const entries=validEntries(obj,z);
  if (!entries.length) return null;
  entries.sort((a,b)=>Math.abs(a.diameter-diameter)-Math.abs(b.diameter-diameter));
  return {...entries[0],exact:Math.abs(entries[0].diameter-diameter)<.011};
}

function capOne(rpm,feed,cap) {
  if (!Number.isFinite(cap)||rpm<=cap) return {rpm,feed,capped:false};
  return {rpm:cap,feed:feed*(cap/rpm),capped:true};
}

function capRange(low,mid,high,cap) {
  if (!Number.isFinite(cap)) return {low,mid,high,capped:false};
  const oldMid=mid;
  low=Math.min(low,cap); mid=Math.min(mid,cap); high=Math.min(high,cap);
  return {low,mid,high,capped:oldMid>cap};
}

function calculateCutting(p,profile,q) {
  if (!profile || !Number.isFinite(p.diameter) || !Number.isFinite(p.flutes)) return null;
  const d=p.diameter,z=p.flutes,cap=q.maxRpm;
  if (profile.mode==='rpm_feed_table') {
    const hit=nearestValidEntry(profile.diameterValues,d,z);
    if (!hit) return null;
    const sourceRpm=Number(hit.value.rpm),sourceFeed=Number(hit.value.feed);
    if (hit.exact) {
      const c=capOne(sourceRpm,sourceFeed,cap);
      const fz=sourceFeed/(sourceRpm*z);
      const vc=Math.PI*hit.diameter*sourceRpm/1000;
      return {kind:'direct',rpmLow:c.rpm,rpmMid:c.rpm,rpmHigh:c.rpm,feedLow:c.feed,feedMid:c.feed,feedHigh:c.feed,vcLow:vc,vcHigh:vc,fz,tableDiameter:hit.diameter,exactDiameter:true,capped:c.capped,qualityRank:0};
    }
    const vc=Math.PI*hit.diameter*sourceRpm/1000;
    const fz=sourceFeed/(sourceRpm*z);
    let rpm=1000*vc/(Math.PI*d),feed=rpm*z*fz;
    const c=capOne(rpm,feed,cap);
    return {kind:'scaled_table',rpmLow:c.rpm,rpmMid:c.rpm,rpmHigh:c.rpm,feedLow:c.feed,feedMid:c.feed,feedHigh:c.feed,vcLow:vc,vcHigh:vc,fz,tableDiameter:hit.diameter,exactDiameter:false,capped:c.capped,qualityRank:1};
  }
  if (profile.mode==='vc_fz' && profile.vcRange) {
    const vcLow=Number(profile.vcRange[0]),vcHigh=Number(profile.vcRange[1]);
    if (!Number.isFinite(vcLow)||!Number.isFinite(vcHigh)||vcLow<=0||vcHigh<=0) return null;
    let rpmLow=1000*vcLow/(Math.PI*d),rpmHigh=1000*vcHigh/(Math.PI*d),rpmMid=(rpmLow+rpmHigh)/2;
    const c=capRange(rpmLow,rpmMid,rpmHigh,cap);rpmLow=c.low;rpmMid=c.mid;rpmHigh=c.high;
    const fzHit=nearestValidFz(profile.fzValues,d);
    const fz=fzHit?Number(fzHit.value):null;
    return {kind:'vc_fz',rpmLow,rpmMid,rpmHigh,feedLow:Number.isFinite(fz)?rpmLow*z*fz:null,feedMid:Number.isFinite(fz)?rpmMid*z*fz:null,feedHigh:Number.isFinite(fz)?rpmHigh*z*fz:null,vcLow,vcHigh,fz,tableDiameter:fzHit?.diameter,exactDiameter:fzHit?.exact,capped:c.capped,qualityRank:fzHit?.exact?1:2};
  }
  return null;
}

function nearestValidFz(obj,diameter) {
  const entries=Object.entries(obj||{}).map(([k,v])=>({diameter:parseFloat(k),value:Number(v)}))
    .filter(x=>Number.isFinite(x.diameter)&&Number.isFinite(x.value)&&x.value>0&&x.value<=5);
  if (!entries.length) return null;
  entries.sort((a,b)=>Math.abs(a.diameter-diameter)-Math.abs(b.diameter-diameter));
  return {...entries[0],exact:Math.abs(entries[0].diameter-diameter)<.011};
}


function hasKnownApAeMismatch(p,q) {
  if (q.ap===null && q.ae===null) return false;
  const samePage=getProductProfiles(p).filter(profile=>operationRank(profile,q)<99);
  const materialMatched=samePage.filter(profile=>!q.material||profile.material===q.material||profile.material==='any');
  const pool=materialMatched.length?materialMatched:samePage;
  let known=0, rejected=0, fitted=0;
  for (const profile of pool) {
    const ap=factorStatus(profile.ap,q.ap/q.diameterForCondition,q.ap!==null);
    const ae=factorStatus(profile.ae,q.ae/q.diameterForCondition,q.ae!==null);
    const hasKnown=(q.ap!==null&&profile.ap)||(q.ae!==null&&profile.ae);
    if (!hasKnown) continue;
    known++;
    if (ap.state==='reject'||ae.state==='reject') rejected++; else if (ap.state==='fit'||ae.state==='fit') fitted++;
  }
  return known>0 && rejected===known && fitted===0;
}

function queryProfiles(p,q) {
  const byOperation=getProductProfiles(p).filter(profile=>operationRank(profile,q)<99);
  const byMaterial=byOperation.filter(profile=>!q.material||profile.material===q.material||profile.material==='any');
  return byMaterial.length?byMaterial:byOperation;
}

function apEligibility(p,q) {
  if (q.ap===null) return {ok:true,kind:'not_requested'};
  const profiles=queryProfiles(p,q);
  if (profiles.some(profile=>profile.ap)) return {ok:true,kind:'official'};
  const normalAxialTool=p.toolType==='平銑刀'||p.toolType==='圓鼻銑刀';
  if (!normalAxialTool || !Number.isFinite(p.fluteLength)) return {ok:false,kind:'unverifiable'};
  return {ok:q.ap>0&&q.ap<=p.fluteLength*0.8+1e-9,kind:'internal_flute_length'};
}

function aeEligibility(p,q) {
  if (q.ae===null) return {ok:true,kind:q.operation==='slot'?'slot_width_equals_diameter':'not_requested'};
  if (!Number.isFinite(p.diameter) || q.ae<=0 || q.ae>p.diameter+1e-9) return {ok:false,kind:'geometry'};
  return {ok:true,kind:queryProfiles(p,q).some(profile=>profile.ae)?'official':'geometry_only'};
}

function chooseProfile(p,q) {
  const candidates=[];
  for (const profile of getProductProfiles(p)) {
    const evaluation=profileEvaluation(profile,q);
    if (!evaluation.ok) continue;
    const calc=calculateCutting(p,profile,q);
    candidates.push({profile,evaluation,calc});
  }
  candidates.sort((a,b)=>
    a.evaluation.opRank-b.evaluation.opRank ||
    a.evaluation.missingCount-b.evaluation.missingCount ||
    a.evaluation.detailPriority-b.evaluation.detailPriority ||
    (a.calc?0:1)-(b.calc?0:1)
  );
  return candidates[0]||null;
}

function queryFromForm() {
  const d=num('diameter');
  const selectedGrade=el('materialGrade').value;
  return {
    material:el('material').value,
    materialGrade:selectedGrade==='__other__'?el('materialGradeCustom').value.trim():selectedGrade,
    hardness:parseHardness(el('hardness').value.trim()),
    operation:el('operation').value,
    toolType:el('toolType').value,
    diameter:d,
    diameterMode:el('diameterMode').value,
    depth:num('depth'),
    ap:num('ap'), ae:num('ae'),
    flutes:num('flutes'), maxRpm:num('maxRpm'),
    series:el('series').value,
    diameterForCondition:d
  };
}


function flutePreferenceRank(p,q) {
  if (q.flutes!==null || !Number.isFinite(p.flutes)) return 0;
  const z=Number(p.flutes);
  if (q.operation==='slot') return Math.abs(z-3);
  if (q.operation==='side' || q.operation==='finish') return Math.abs(z-4);
  if (q.operation==='rough') return Math.abs(z-4)*0.8;
  return 0;
}

function gradeResult(p,q,selected,hardness) {
  const seriesRank=seriesSuitabilityRank(p,q);
  if (!selected) return {grade:'C',rank:2,label:'C級・規格符合',seriesRank,reasons:['官方圖示標示適用，但未提供所選材料的完整加工條件']};
  const {evaluation,calc,profile}=selected;
  const requested=[q.ap!==null,q.ae!==null].filter(Boolean).length;
  const complete=requested===0 || evaluation.missingCount===0;
  const opExact=q.operation==='any'||profile.operation===q.operation;
  const hardnessClear=!Number.isFinite(q.hardness)||hardness.known;
  let grade='B',rank=1,label='B級・官方適用';
  if (complete&&opExact&&hardnessClear) {grade='A';rank=0;label='A級・官方條件完整';}
  const reasons=[];
  if (q.materialGrade) reasons.push(`工件牌號：${q.materialGrade}（依材料大類選刀）`);
  if (seriesRank===0) reasons.push('材料／加工方式優先系列');
  else if (seriesRank<10) reasons.push(`同材料系列順位第 ${seriesRank+1}`);
  else reasons.push('官方標示可加工此材質');
  if (profile.materialDetail) reasons.push(`材質條件：${profile.materialDetail}`);
  reasons.push(opExact?'加工方式完全符合':'官方條件為通用加工');
  if (requested) reasons.push(complete?'官方加工量範圍符合':'加工量已通過安全檢核');
  if (Number.isFinite(q.hardness)) reasons.push(hardness.known?`硬度符合${hardness.label}`:'該系列官方硬度範圍未建檔');
  return {grade,rank,label,seriesRank,reasons};
}

function runSearch() {
  if (!DB) return;
  const q=queryFromForm();
  if (!q.material) { alert('請先選擇加工材質。'); el('material').focus(); return; }
  if (!q.diameter) { alert('請輸入刀徑 D。'); el('diameter').focus(); return; }
  el('resultHeading').textContent='篩選結果';
  const rows=[];
  for (const p of DB.products) {
    if (q.toolType && p.toolType!==q.toolType) continue;
    if (q.series && p.series!==q.series) continue;
    if (q.flutes!==null && Number(p.flutes)!==q.flutes) continue;
    if (q.depth!==null && (!Number.isFinite(p.fluteLength) || p.fluteLength+1e-9<q.depth)) continue;
    if (q.diameter!==null) {
      if (!Number.isFinite(p.diameter)) continue;
      if (q.diameterMode==='exact' && Math.abs(p.diameter-q.diameter)>0.011) continue;
      if (q.diameterMode==='max' && p.diameter-q.diameter>0.001) continue;
      if (q.diameterMode==='min' && q.diameter-p.diameter>0.001) continue;
    }
    const materialSupport=materialSupportInfo(p,q.material);
    if (!materialSupport.supported) continue;
    const hard=hardnessInfo(p,q.hardness);
    if (!hard.fits) continue;
    const q2={...q,diameterForCondition:p.diameter};
    const apCheck=apEligibility(p,q2);
    const aeCheck=aeEligibility(p,q2);
    if (!apCheck.ok||!aeCheck.ok) continue;
    const selected=chooseProfile(p,q2);
    if (hasKnownApAeMismatch(p,q2)) continue;
    const grade=gradeResult(p,q2,selected,hard);
    const depthSurplus=q.depth!==null&&Number.isFinite(p.fluteLength)?Math.max(0,p.fluteLength-q.depth):999;
    const diameterDiff=q.diameter!==null?Math.abs(p.diameter-q.diameter):0;
    const sourceTime=Date.parse(p.sourceDate||'2025-01-01')||0;
    const fluteRank=flutePreferenceRank(p,q2);
    rows.push({p,profile:selected?.profile||null,calc:selected?.calc||null,evaluation:selected?.evaluation||null,grade,hard,materialSupport,depthSurplus,diameterDiff,sourceTime,fluteRank,apCheck,aeCheck});
  }
  rows.sort((a,b)=>
    a.grade.rank-b.grade.rank ||
    a.grade.seriesRank-b.grade.seriesRank ||
    (a.evaluation?.opRank??9)-(b.evaluation?.opRank??9) ||
    (a.evaluation?.missingCount??9)-(b.evaluation?.missingCount??9) ||
    a.fluteRank-b.fluteRank ||
    a.depthSurplus-b.depthSurplus ||
    a.diameterDiff-b.diameterDiff ||
    b.sourceTime-a.sourceTime ||
    a.p.code.localeCompare(b.p.code)
  );
  renderResults(rows.slice(0,50),rows.length,q);
}

function normalizedToolCode(value) {
  return String(value||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
}

function globalSearchRows(query) {
  const rows=[];
  for (const p of DB.products) {
    const code=normalizedToolCode(p.code);
    const series=normalizedToolCode(p.series);
    const codePos=code.indexOf(query);
    const seriesPos=series.indexOf(query);
    if (codePos<0&&seriesPos<0) continue;
    const score=code===query?0:code.startsWith(query)?1:series===query?2:series.startsWith(query)?3:4;
    rows.push({kind:'solid',category:'solid',code:p.code,series:p.series,name:p.productName||p.toolType,score,product:p});
  }
  for (const entry of CATALOG_DB.entries||[]) {
    const code=normalizedToolCode(entry.code);
    const series=normalizedToolCode(entry.series);
    const spec=normalizedToolCode(entry.spec);
    const codePos=code.indexOf(query);
    const seriesPos=series.indexOf(query);
    if (codePos<0&&seriesPos<0&&spec.indexOf(query)<0) continue;
    const score=code===query?0:code.startsWith(query)?1:series===query?2:series.startsWith(query)?3:codePos>=0?4:5;
    rows.push({kind:'catalog',category:entry.categoryV4||entry.category,code:entry.code,series:entry.series,name:entry.spec,score,entry});
  }
  const seen=new Set();
  return rows.sort((a,b)=>a.score-b.score||a.code.length-b.code.length||a.code.localeCompare(b.code,'en'))
    .filter(row=>{
      const key=`${row.category}|${normalizedToolCode(row.code)}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
}

function runGlobalReverseLookup() {
  if (!DB) return;
  const input=el('globalReverseCode');
  const query=normalizedToolCode(input.value);
  if (!query) { alert('請輸入完整刀號、部分刀號或系列。'); input.focus(); return; }
  const rows=globalSearchRows(query);
  renderGlobalReverseResults(rows.slice(0,80),rows.length,input.value.trim());
}

function renderGlobalReverseResults(rows,total,rawQuery) {
  const target=el('globalReverseResults');
  target.hidden=false;
  if (!rows.length) {
    target.innerHTML=`<div class="global-empty"><h3>找不到「${esc(rawQuery)}」</h3><p>可先輸入刀號前半段或系列名稱，例如 DMC5、CNMG、ETM。</p></div>`;
    return;
  }
  target.innerHTML=`<div class="global-result-summary"><strong>全類別反查：</strong>「${esc(rawQuery)}」找到 ${fmt(total,0)} 筆符合編碼${total>rows.length?`，先顯示前 ${rows.length} 筆`:''}。</div>
    <div class="global-result-grid">${rows.map((row,index)=>globalReverseCandidate(row,index)).join('')}</div>`;
  if (rows.length===1) {
    const button=target.querySelector('[data-global-detail]');
    if (button) openGlobalReverseDetail(button);
  }
  target.scrollIntoView({behavior:'smooth',block:'start'});
}

function globalReverseCandidate(row,index) {
  const isSolid=row.kind==='solid';
  const detail=isSolid?solidReverseDetail(row.product):catalogReverseDetail(row.entry);
  const complete=isSolid||catalogEntryComplete(row.entry);
  return `<article class="global-result-card">
    <div class="global-result-head">
      <div><h3>${esc(row.code)}</h3><p>${esc(row.series||CATEGORY_LABELS[row.category])}${row.name?`・${esc(row.name)}`:''}</p>
        <div class="global-result-badges"><span class="badge official">${esc(CATEGORY_LABELS[row.category]||row.category)}</span></div>
      </div>
      <div class="global-result-actions"><button class="btn secondary" data-global-detail="${index}" aria-expanded="false">展開完整資料</button></div>
    </div>
    <div class="global-result-detail" data-global-panel="${index}" hidden>${detail}</div>
  </article>`;
}

function solidReverseDetail(p) {
  const src=SOURCE_BY_ID.get(p.sourceId)||{};
  const page=p.sourcePage||p.pdfPage||1;
  const url=src.url?`${src.url}#page=${page}`:'';
  const materials=productMaterials(p);
  const profiles=dedupeProfiles(getProductProfiles(p).filter(profileHasMachiningData));
  const profileHtml=profiles.length?`<div class="reverse-section-title"><h3>官方加工條件</h3><span>${fmt(profiles.length,0)} 組</span></div><div class="reverse-profile-list">${profiles.slice(0,12).map((profile,index)=>reverseProfileCard(p,profile,index+1)).join('')}</div>${profiles.length>12?`<p class="field-help">條件組較多，先顯示前 12 組；可由官方 PDF 查看完整表格。</p>`:''}`:'';
  return `<div class="spec-grid">
      <div class="spec"><span>刀徑 D</span><strong>${Number.isFinite(p.diameter)?'Ø'+fmt(p.diameter):'—'}</strong></div>
      <div class="spec"><span>刃數</span><strong>${Number.isFinite(p.flutes)?p.flutes+'刃':'—'}</strong></div>
      <div class="spec"><span>刃長 CL</span><strong>${Number.isFinite(p.fluteLength)?fmt(p.fluteLength)+' mm':'—'}</strong></div>
      <div class="spec"><span>全長 OAL</span><strong>${Number.isFinite(p.overallLength)?fmt(p.overallLength)+' mm':'—'}</strong></div>
      <div class="spec"><span>柄徑</span><strong>${Number.isFinite(p.shankDiameter)?'Ø'+fmt(p.shankDiameter):'—'}</strong></div>
      <div class="spec"><span>官方條件組</span><strong>${fmt(profiles.length,0)}</strong></div>
    </div>
    <div class="spec-extra">${p.helixAngle?`<span>螺旋角 ${esc(p.helixAngle)}</span>`:''}${p.form?`<span>刀型 ${esc(p.form)}</span>`:''}${p.coating?`<span>塗層 ${esc(p.coating)}</span>`:''}${materials.map(k=>`<span>${esc(DB.materialNames[k]||k)}</span>`).join('')}</div>
    <div class="condition-row"><span>官方硬度</span><strong>${esc(reverseHardnessLabel(p))}</strong></div>
    ${profileHtml}
    <div class="catalog-source"><span>來源：${esc(src.title||src.file||'WINSTAR 官方資料')} ${p.catalogPage?`・${esc(p.catalogPage)}`:''}</span>${url?`<a class="pdf-btn" href="${url}" target="_blank" rel="noopener">開啟官方 PDF</a>`:''}</div>`;
}

function catalogReverseDetail(entry) {
  const complete=catalogEntryComplete(entry);
  const family=catalogFamilyForEntry(entry);
  const page=catalogPageForEntry(entry,family);
  const pageNumber=entry.officialPdfPage||entry.pdfPage||((parseInt(String(page).replace(/\D/g,''),10)||0)+1);
  const sourceUrl=entry.officialPdfUrl||entry.sourceUrl||'';
  const url=sourceUrl?`${sourceUrl}#page=${pageNumber}`:'';
  const specs=unique([...catalogEntrySpecs(family,entry),...familySpecs(family||{})]);
  const condition=catalogCondition(family);
  const conditionPage=family?.conditionPage||condition?.conditionPage;
  const conditionPageNumber=(parseInt(String(conditionPage||'').replace(/\D/g,''),10)||0)+1;
  const conditionUrl=conditionPage&&sourceUrl?`${sourceUrl}#page=${conditionPageNumber}`:'';
  const officialParameterPage=entry.officialParameterPage||'';
  const officialParameterPdfPage=entry.officialParameterPdfPage||null;
  const officialParameterUrl=officialParameterPdfPage&&sourceUrl?`${sourceUrl}#page=${officialParameterPdfPage}`:'';
  return `<div class="spec-grid">
      <div class="spec"><span>產品類別</span><strong>${esc(entry.categoryV4||CATEGORY_LABELS[entry.category]||entry.category)}</strong></div>
      <div class="spec"><span>所屬系列</span><strong>${esc(entry.series||'—')}</strong></div>
      <div class="spec"><span>型錄頁碼</span><strong>${esc(page||'—')}</strong></div>
    </div>
    ${specs.length?`<div class="spec-extra">${specs.map(spec=>`<span>${esc(spec)}</span>`).join('')}</div>`:''}
    ${entry.officialRowRaw?`<div class="condition-box"><h4>官方 PDF 規格列</h4><div class="condition-row"><span>第 ${esc(pageNumber)} 頁</span><strong>${esc(entry.officialRowRaw)}</strong></div></div>`:''}
    ${entry.parameterStatus?`<div class="condition-box"><h4>加工參數追溯</h4><div class="condition-row"><span>狀態</span><strong>${esc(entry.parameterStatus)}</strong></div>${officialParameterPage?`<div class="condition-row"><span>參數頁</span><strong>${esc(officialParameterPage)}</strong></div>`:''}${entry.calculationRule?`<div class="condition-row"><span>換算規則</span><strong>${esc(entry.calculationRule)}</strong></div>`:''}</div>`:''}
    ${catalogReverseConditions(entry)}
    <div class="catalog-source"><span>來源：WINSTAR 官方型錄 ${esc(page)}</span><div class="catalog-page-actions">${url?`<a class="pdf-btn" href="${url}" target="_blank" rel="noopener">${condition&&conditionPage===page?'規格／參數':'規格'} ${esc(page)}</a>`:''}${conditionUrl&&conditionPage!==page?`<a class="pdf-btn parameters" href="${conditionUrl}" target="_blank" rel="noopener">參數 ${esc(conditionPage)}</a>`:''}${officialParameterUrl&&!conditionUrl?`<a class="pdf-btn parameters" href="${officialParameterUrl}" target="_blank" rel="noopener">參數 ${esc(officialParameterPage)}</a>`:''}</div></div>`;
}

function catalogReverseConditions(entry) {
  const family=catalogFamilyForEntry(entry);
  const condition=catalogCondition(family);
  if (!condition) return '';
  const rows=Object.entries(condition.rows||{}).map(([material,value])=>{
    const parts=[`Vc ${fmt(value.vc[0])}～${fmt(value.vc[1])} m/min`];
    if (value.feed) parts.push(`${condition.feedUnit==='fz'?'fz':'進給'} ${fmt(value.feed[0],3)}～${fmt(value.feed[1],3)} ${condition.feedUnit==='fz'?'mm/刃':'mm/rev'}`);
    if (value.drillFeed) parts.push(`鑽孔 f：≤6 mm ${fmt(value.drillFeed.small[0],3)}～${fmt(value.drillFeed.small[1],3)}；≤12 mm ${fmt(value.drillFeed.large[0],3)}～${fmt(value.drillFeed.large[1],3)} mm/rev`);
    if (value.threadFeed) parts.push(`螺紋銑削 fz：≤6 mm ${fmt(value.threadFeed.small[0],3)}～${fmt(value.threadFeed.small[1],3)}；≤12 mm ${fmt(value.threadFeed.large[0],3)}～${fmt(value.threadFeed.large[1],3)} mm/刃`);
    if (condition.feedUnit==='pitch') parts.push('每轉進給依刀號螺距換算');
    if (value.ap) parts.push(`AP ${fmt(value.ap[0])}～${fmt(value.ap[1])} mm`);
    return `<div class="condition-row"><span>${esc(DB.materialNames[material]||material)}</span><strong>${esc(parts.join('；'))}</strong></div>`;
  }).join('');
  return rows?`<div class="condition-box machining"><h4>官方 ${esc(condition.conditionPage||family?.conditionPage||'')} 加工參數</h4>${rows}</div>`:'';
}

function openGlobalReverseDetail(button) {
  const index=button.dataset.globalDetail;
  const panel=el('globalReverseResults').querySelector(`[data-global-panel="${index}"]`);
  if (!panel) return;
  const open=panel.hidden;
  panel.hidden=!open;
  button.setAttribute('aria-expanded',String(open));
  button.textContent=open?'收起資料':'展開完整資料';
}

function runReverseLookup() {
  if (!DB) return;
  const query=normalizedToolCode(el('reverseCode').value);
  if (!query) { alert('請輸入刀具編碼。'); el('reverseCode').focus(); return; }
  el('resultHeading').textContent='刀號反查結果';
  const exact=PRODUCT_BY_CODE.get(query);
  if (exact) { renderReverseProduct(exact); return; }
  const matches=DB.products.filter(p=>normalizedToolCode(p.code).includes(query))
    .sort((a,b)=>{
      const ap=normalizedToolCode(a.code).startsWith(query)?0:1;
      const bp=normalizedToolCode(b.code).startsWith(query)?0:1;
      return ap-bp || String(a.code).length-String(b.code).length || String(a.code).localeCompare(String(b.code));
    });
  if (matches.length===1) { renderReverseProduct(matches[0]); return; }
  renderReverseCandidates(matches.slice(0,80),matches.length,query);
}

function renderReverseCandidates(matches,total,query) {
  const summary=el('summaryText'); summary.className='';
  summary.innerHTML=`<div class="mode-banner"><strong>刀號反查：</strong>「${esc(query)}」找到 ${fmt(total,0)} 個可能刀號，請選擇完整刀號。</div>`;
  if (!matches.length) {
    el('results').innerHTML='<div class="no-results"><h3>找不到這個刀號</h3><p>請確認英文字母與數字，或先輸入刀號前半段搜尋。</p></div>';
    return;
  }
  el('results').innerHTML=`<div class="reverse-candidates">${matches.map(p=>`
    <div class="reverse-candidate">
      <div><h3>${esc(p.code)}</h3><p>${esc(p.series)}・${esc(p.toolType)}・Ø${fmt(p.diameter)}・${Number.isFinite(p.flutes)?p.flutes+'刃':'刃數未建檔'}</p></div>
      <button class="btn secondary" data-reverse-code="${esc(p.code)}">查看用途</button>
    </div>`).join('')}</div>`;
}

function reverseHardnessLabel(p) {
  const exact=HARDNESS_RANGES[p.series];
  const fallback=Object.entries(HARDNESS_RANGES).find(([k])=>String(p.series||'').startsWith(k))?.[1];
  return (exact||fallback)?.label || '官方系列硬度範圍未建檔';
}

function dedupeProfiles(profiles) {
  const seen=new Set();
  return profiles.filter(profile=>{
    const key=[profile.sourceId,profile.page,profile.title,profile.material,profile.materialDetail,profile.operation,profile.mode,
      profile.ap?.raw,profile.ae?.raw,JSON.stringify(profile.vcRange||[]),JSON.stringify(profile.fzValues||{}),JSON.stringify(profile.diameterValues||{})].join('|');
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function renderReverseProduct(p) {
  if (!p) return;
  el('resultHeading').textContent='刀號反查結果';
  el('reverseCode').value=p.code;
  const src=SOURCE_BY_ID.get(p.sourceId)||{};
  const pdfPage=p.sourcePage||p.pdfPage||1;
  const pdfURL=src.file?`${src.url || '#'}#page=${pdfPage}`:'#';
  const materials=productMaterials(p);
  const profiles=dedupeProfiles(getProductProfiles(p).filter(profileHasMachiningData))
    .sort((a,b)=>String(DB.materialNames[a.material]||a.material).localeCompare(String(DB.materialNames[b.material]||b.material),'zh-Hant') || operationRank(a,{operation:'any'})-operationRank(b,{operation:'any'}) || (a.page||0)-(b.page||0));
  const summary=el('summaryText'); summary.className='';
  summary.innerHTML=`<div class="summary-grid">
    <div class="summary-item"><b>1</b><span>完整刀號</span></div>
    <div class="summary-item"><b>${fmt(materials.length,0)}</b><span>官方適用材料類別</span></div>
    <div class="summary-item"><b>${fmt(profiles.length,0)}</b><span>官方加工條件組</span></div>
    <div class="summary-item"><b>${Number.isFinite(p.flutes)?p.flutes:'—'}</b><span>刃數</span></div>
  </div>`;
  const materialTags=materials.length?materials.map(k=>`<span class="material-tag">${esc(DB.materialNames[k]||k)}</span>`).join(''):'<span class="material-tag">官方材料資料未連結</span>';
  const overview=`<article class="result-card reverse-overview">
    <div class="result-head">
      <div class="result-title-wrap"><div class="rank">刀</div><div class="result-title">
        <h3>${esc(p.code)}</h3><p>${esc(p.productName||`${p.series} ${p.toolType}`)}</p>
        <div class="badges"><span class="badge official">${esc(p.series)}</span><span class="badge">${esc(p.toolType)}</span>${p.form?`<span class="badge">${esc(p.form)}</span>`:''}</div>
      </div></div>
      <div class="result-actions">${src.file?`<a class="pdf-btn" href="${pdfURL}" target="_blank" rel="noopener">開啟官方PDF 第${pdfPage}頁</a>`:''}</div>
    </div>
    <div class="result-body">
      <div class="spec-grid">
        <div class="spec"><span>刀徑 D</span><strong>${Number.isFinite(p.diameter)?'Ø'+fmt(p.diameter):'—'}</strong></div>
        <div class="spec"><span>刃數</span><strong>${Number.isFinite(p.flutes)?p.flutes+'刃':'—'}</strong></div>
        <div class="spec"><span>刃長 CL</span><strong>${Number.isFinite(p.fluteLength)?fmt(p.fluteLength)+' mm':'—'}</strong></div>
        <div class="spec"><span>有效長</span><strong>${Number.isFinite(p.effectiveLength)?fmt(p.effectiveLength)+' mm':'—'}</strong></div>
        <div class="spec"><span>全長 OAL</span><strong>${Number.isFinite(p.overallLength)?fmt(p.overallLength)+' mm':'—'}</strong></div>
        <div class="spec"><span>柄徑</span><strong>${Number.isFinite(p.shankDiameter)?'Ø'+fmt(p.shankDiameter):'—'}</strong></div>
      </div>
      <div class="spec-extra">
        ${p.helixAngle?`<span>螺旋角 ${esc(p.helixAngle)}</span>`:''}
        ${p.form?`<span>刀型 ${esc(p.form)}</span>`:''}
        ${Number.isFinite(p.cornerRadius)?`<span>圓角 R${fmt(p.cornerRadius)}</span>`:''}
        ${Number.isFinite(p.ballRadius)?`<span>球半徑 R${fmt(p.ballRadius)}</span>`:''}
        ${p.coating?`<span>塗層 ${esc(p.coating)}</span>`:''}
        ${p.catalogPage?`<span>總型錄頁 ${esc(p.catalogPage)}</span>`:''}
      </div>
      <div class="condition-row"><span>官方硬度</span><strong>${esc(reverseHardnessLabel(p))}</strong></div>
      <div class="condition-row"><span>資料來源</span><strong>${esc(src.title||src.file||p.sourceType)} 第${esc(pdfPage)}頁</strong></div>
      <div class="reverse-materials">${materialTags}</div>
    </div>
  </article>`;
  const profileHTML=profiles.length?profiles.map((profile,i)=>reverseProfileCard(p,profile,i+1)).join(''):
    '<div class="no-results"><h3>這支刀的基本規格已找到</h3><p>目前資料庫尚未連結到可換算的官方加工條件表，因此只顯示官方適用材料與規格。</p></div>';
  el('results').innerHTML=overview+`<div class="reverse-section-title"><h3>這支刀能加工什麼、怎麼加工</h3><span>依官方目錄逐組顯示；直接S/F與Vc、fz換算同樣視為官方條件</span></div><div class="reverse-profile-list">${profileHTML}</div>`;
  window.scrollTo({top:0,behavior:'smooth'});
}

function reverseProfileCard(p,profile,index) {
  const src=SOURCE_BY_ID.get(profile.sourceId)||{};
  const page=profile.page||1;
  const url=src.file?`${src.url || '#'}#page=${page}`:'#';
  const calc=calculateCutting(p,profile,{maxRpm:null});
  const materialName=profile.materialDetail||DB.materialNames[profile.material]||profile.material||'官方材料';
  return `<article class="reverse-profile">
    <div class="reverse-profile-head">
      <div><h4>${index}. ${esc(materialName)}｜${esc(operationName(profile.operation))}</h4><p>${esc(profile.title||p.productName||p.series)}</p></div>
      ${src.file?`<a class="btn secondary" href="${url}" target="_blank" rel="noopener">官方條件 第${page}頁</a>`:''}
    </div>
    <div class="reverse-profile-body">
      <div class="condition-grid">
        <div class="condition-box">
          <h4>官方加工範圍</h4>
          <div class="condition-row"><span>材料</span><strong>${esc(materialName)}</strong></div>
          <div class="condition-row"><span>加工方式</span><strong>${esc(operationName(profile.operation))}</strong></div>
          ${officialFactorRows(profile,p)}
        </div>
        ${cuttingHTML(calc,profile)}
      </div>
    </div>
  </article>`;
}

function officialFactorRows(profile,p) {
  if (!profile) return '';
  return [
    profile.ap?`<div class="condition-row"><span>AP（Ap×D）</span><strong>${factorToText(profile.ap,p.diameter)}</strong></div>`:'',
    profile.ae?`<div class="condition-row"><span>AE（Ae×D）</span><strong>${factorToText(profile.ae,p.diameter)}</strong></div>`:''
  ].join('');
}

function factorToText(f,d) {
  if (!f) return '';
  const low=Number(f.min)*d,high=Number(f.max)*d;
  const prefix=(f.kind==='max'||f.kind==='exact')?'最大建議 ':'推薦範圍 ';
  const mm=(f.kind==='max'||f.kind==='exact')?`≤ ${fmt(high)} mm`:(Math.abs(low-high)<.0001?`${fmt(low)} mm`:`${fmt(low)}～${fmt(high)} mm`);
  return `${prefix}${esc(f.raw||'')}（換算 ${mm}）`;
}

function operationName(k) {return ({any:'不限／通用',side:'側銑',slot:'開槽',rough:'粗加工',finish:'精加工',contour:'曲面／輪廓'})[k]||k;}

function cuttingHTML(calc,profile) {
  if (!calc) return '';
  const range=calc.kind==='vc_fz';
  const rpmText=range?`${fmt(calc.rpmLow,0)}～${fmt(calc.rpmHigh,0)}`:fmt(calc.rpmMid,0);
  const feedOk=Number.isFinite(calc.feedMid);
  const feedText=range?`${fmt(calc.feedLow,0)}～${fmt(calc.feedHigh,0)}`:fmt(calc.feedMid,0);
  const vcText=Number.isFinite(calc.vcLow)?(Math.abs(calc.vcLow-calc.vcHigh)<.001?fmt(calc.vcLow):`${fmt(calc.vcLow)}～${fmt(calc.vcHigh)}`):'—';
  return `<div class="condition-box machining">
    <h4>建議轉速與進給</h4>
    <div class="hero-values">
      <div class="hero-value"><span>主軸轉速 S</span><strong>${rpmText}</strong><small> rpm${range?`；標準 ${fmt(calc.rpmMid,0)}`:''}</small></div>
      ${feedOk?`<div class="hero-value"><span>進給速度 F</span><strong>${feedText}</strong><small> mm/min${range?`；標準 ${fmt(calc.feedMid,0)}`:''}</small></div>`:''}
    </div>
    <div class="condition-row"><span>官方 Vc</span><strong>${vcText} m/min</strong></div>
    ${Number.isFinite(calc.fz)?`<div class="condition-row"><span>官方 fz</span><strong>${fmt(calc.fz,4)} mm/刃</strong></div>`:''}
  </div>`;
}

function renderResults(rows,total,q) {
  const summary=el('summaryText'); summary.className='';
  summary.innerHTML=`<div class="summary-grid">
    <div class="summary-item"><b>${fmt(total,0)}</b><span>符合刀號總數</span></div>
    <div class="summary-item"><b>${fmt(rows.length,0)}</b><span>本頁顯示刀號</span></div>
    <div class="summary-item"><b>${esc(DB.materialNames[q.material]||q.material)}</b><span>加工材質</span></div>
    <div class="summary-item"><b>Ø${fmt(q.diameter)}</b><span>指定刀徑</span></div>
  </div>`;
  if (!rows.length) {
    el('results').innerHTML='<div class="no-results"><h3>沒有找到符合條件的官方刀具</h3><p>已知AP／AE不符與硬度超出系列範圍會直接排除。可檢查加工量、刀徑或改選其他系列。</p></div>';
    return;
  }
  el('results').innerHTML=rows.map((r,i)=>resultCard(r,i+1)).join('');
}

function resultCard({p,profile,calc,grade,hard},rank) {
  const src=SOURCE_BY_ID.get(p.sourceId)||{};
  const pdfPage=p.sourcePage||p.pdfPage||1;
  const pdfURL=src.file?`${src.url || '#'}#page=${pdfPage}`:'#';
  const mats=productMaterials(p).map(k=>DB.materialNames[k]||k).join('、');
  const newBadge=(p.sourceType==='新產品單行本'||String(p.sourceDate||'')>='2026-01-01')?'<span class="badge new">新產品資料</span>':'';
  const reasonText=grade.reasons.map(x=>`<span>${esc(x)}</span>`).join('');
  return `<article class="result-card">
    <div class="result-head">
      <div class="result-title-wrap"><div class="rank">${rank}</div><div class="result-title">
        <h3>${esc(p.code)}</h3><p>${esc(p.productName||`${p.series} ${p.toolType}`)}</p>
        <div class="badges"><span class="badge official">${esc(p.series)}</span><span class="badge">${esc(p.toolType)}</span>${p.form?`<span class="badge">${esc(p.form)}</span>`:''}${newBadge}</div>
      </div></div>
      <div class="result-actions">${src.file?`<a class="pdf-btn" href="${pdfURL}" target="_blank" rel="noopener">開啟官方PDF 第${pdfPage}頁</a>`:''}</div>
    </div>
    <div class="result-body">
      <div class="reason-strip"><b>排名依據</b>${reasonText}</div>
      <div class="spec-grid">
        <div class="spec"><span>刀徑 D</span><strong>Ø${fmt(p.diameter)}</strong></div>
        <div class="spec"><span>刃數</span><strong>${Number.isFinite(p.flutes)?p.flutes+'刃':'—'}</strong></div>
        <div class="spec"><span>刃長 CL</span><strong>${Number.isFinite(p.fluteLength)?fmt(p.fluteLength)+' mm':'—'}</strong></div>
        <div class="spec"><span>全長 OAL</span><strong>${Number.isFinite(p.overallLength)?fmt(p.overallLength)+' mm':'—'}</strong></div>
        <div class="spec"><span>柄徑</span><strong>${Number.isFinite(p.shankDiameter)?'Ø'+fmt(p.shankDiameter):'—'}</strong></div>
        <div class="spec"><span>官方硬度</span><strong>${hard.known?esc(hard.label):'未建檔'}</strong></div>
      </div>
      <div class="condition-grid">
        <div class="condition-box">
          <h4>官方加工範圍</h4>
          <div class="condition-row"><span>適用材質</span><strong>${esc(profile?.materialDetail||mats||'依官方系列資料')}</strong></div>
          ${profile?`<div class="condition-row"><span>加工方式</span><strong>${operationName(profile.operation)}</strong></div>`:''}
          ${officialFactorRows(profile,p)}
        </div>
        ${cuttingHTML(calc,profile)}
      </div>
    </div>
  </article>`;
}



async function loadPublishedDB() {
  const [dataResponse, versionResponse, catalogResponse] = await Promise.all([
    fetch('./data/winstar-data.json', { cache: 'no-cache' }),
    fetch('./data/version.json', { cache: 'no-cache' }),
    fetch('./data/catalog-search.json', { cache: 'no-cache' })
  ]);
  if (!dataResponse.ok) throw new Error('無法讀取公開資料庫（' + dataResponse.status + '）');
  const data = await dataResponse.json();
  if (!validPublishedDB(data)) throw new Error('公開資料庫格式不正確');
  if (versionResponse.ok) data.publishedVersion = await versionResponse.json();
  if (catalogResponse.ok) {
    const catalog=await catalogResponse.json();
    if (catalog&&Array.isArray(catalog.entries)) CATALOG_DB=catalog;
  }
  return data;
}

function validPublishedDB(value) {
  return value && typeof value === 'object' && Array.isArray(value.products) &&
    Array.isArray(value.sources) && Array.isArray(value.profiles) && value.materialNames;
}

function updateStatusLabel() {
  const m = DB.meta || {};
  const v = DB.publishedVersion || {};
  const published = v.publishedAt ? String(v.publishedAt).replace('T', ' ').slice(0, 16) : '—';
  const nextCheck=nextUpdateCheckDate(v);
  const otherCount=(CATALOG_DB.entries||[]).length;
  const total=(Number(m.productCount)||DB.products.length)+otherCount;
  el('dataStatus').innerHTML = '<strong>' + fmt(total,0) + '</strong> 筆五大類官方刀號／編碼索引<br><small>V' + esc(v.appVersion || m.appVersion || '—') + '・發布 ' + esc(published) + (nextCheck?'・下次檢查 '+esc(nextCheck):'') + '</small>';
  const counts=CATALOG_DB.meta?.counts||{};
  el('globalSearchMeta').textContent=`目前可搜尋 ${fmt(total,0)} 筆：整體式 ${fmt(DB.products.length,0)}、孔加工 ${fmt(counts.hole||0,0)}、車削 ${fmt(counts.turning||0,0)}、螺紋 ${fmt(counts.threading||0,0)}、捨棄式 ${fmt(counts.indexable||0,0)}`;
}

function lastCheckedDate(version) {
  const raw=version.lastCheckedAt||version.publishedAt||DB.meta?.builtAt;
  const date=raw?new Date(raw):null;
  return date&&!Number.isNaN(date.getTime())?date:null;
}

function nextUpdateCheckDate(version) {
  const checked=lastCheckedDate(version);
  if (!checked) return '';
  const next=new Date(checked);
  next.setDate(next.getDate()+(Number(version.remindAfterDays)||30));
  return next.toLocaleDateString('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit'});
}

function showUpdateReminder() {
  const version=DB.publishedVersion||{};
  const checked=lastCheckedDate(version);
  if (!checked) return;
  const interval=Number(version.remindAfterDays)||30;
  const dueAt=new Date(checked);
  dueAt.setDate(dueAt.getDate()+interval);
  const snoozeUntil=Number(localStorage.getItem('winstarUpdateSnoozeUntil')||0);
  const forced=new URLSearchParams(location.search).get('remind')==='1';
  if (!forced&&(Date.now()<dueAt.getTime()||Date.now()<snoozeUntil)) return;
  const days=Math.max(interval,Math.floor((Date.now()-checked.getTime())/86400000));
  el('updateReminderText').textContent=`距離上次官方資料檢查已 ${days} 天。請用電腦查看 WINSTAR 是否發布新型錄或新產品資料，再更新 GitHub。`;
  el('updateReminder').hidden=false;
}

function snoozeUpdateReminder() {
  localStorage.setItem('winstarUpdateSnoozeUntil',String(Date.now()+7*86400000));
  el('updateReminder').hidden=true;
}

function wireBackToTop() {
  const button=el('backToTop');
  if (!button) return;
  const refresh=()=>button.classList.toggle('visible',window.scrollY>500);
  window.addEventListener('scroll',refresh,{passive:true});
  button.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  refresh();
}

async function init() {
  try {
    DB = await loadPublishedDB();
    refreshIndexes();
    populateFilters();
    updateStatusLabel();
    wireEvents();
    wireBackToTop();
    showUpdateReminder();
  } catch (err) {
    el('dataStatus').textContent = err.message;
    el('dataStatus').style.color = '#ad2e2e';
    el('summaryText').innerHTML = '<div class="no-results">' + esc(err.message) + '</div>';
  }
}

document.addEventListener('DOMContentLoaded',init);
