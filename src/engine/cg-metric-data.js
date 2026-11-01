// fx-CG50 Software 3.00, 2-64–2-67. This is independently authored data,
// not code extracted from CASIO's Metric Conversion add-in.
// The manual cites NIST SP811 (2008): retain that edition's AU/u/eV values.
export const CG_METRIC_SOURCES=Object.freeze({
  manual:'https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-CG50_Soft_v300_EN.pdf',
  nist2008:'https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication811e2008.pdf',
  factors:'https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8',
  hardware:'https://education.casio.co.uk/app/uploads/2022/08/fx-CG50-Hardware-User-Guide.pdf',
});
const coefficient=value=>Array.isArray(value)?Object.freeze([...value]):value;
const unit=(id,display,name,scale,extra={})=>Object.freeze({id,display,name,command:'['+display+']',source:'NIST SP811 (2008), B.8/B.9',basis:'definition',...extra,scale:coefficient(scale),offset:coefficient(extra.offset??'0'),aliases:Object.freeze([...(extra.aliases||[])])});
const approximate=(id,display,name,scale,extra={})=>unit(id,display,name,scale,{basis:'tabulated approximation',...extra});
const category=(id,display,name,base,units)=>Object.freeze({id,display,name,base,manualPage:['length','area','volume','time'].includes(id)?'2-66':'2-67',units:Object.freeze(units)});
const survey='NIST2008 uses the U.S. survey foot (1200/3937 m) for this entry. CASIO table omits that qualifier; native constant not independently measured.';
const liquid='U.S. liquid measure. The CASIO table leaves the region unspecified for this entry; NIST B.8 is the selected convention.';
const thermal='International Table Btu. CASIO names Btu without a subscript; native choice/extra internal digits are not independently measured.';
const force='Standard gravity = 9.80665 m/s²; international avoirdupois pound = 0.45359237 kg.';
export const CG_METRIC_CATEGORIES=Object.freeze([
  category('length','LENGTH','Length','m',[
    unit('fm','fm','fermi','1e-15'),unit('angstrom','Å','angstrom','1e-10',{aliases:['angstrom','ångström','Å']}),unit('um','μm','micrometer','1e-6',{aliases:['µm','micrometre','micrometer']}),unit('mm','mm','millimeter','0.001'),unit('cm','cm','centimeter','0.01'),unit('m','m','meter','1',{aliases:['meter','metre']}),unit('km','km','kilometer','1000'),
    approximate('AU','AU','astronomical unit','149597870691',{source:'NIST SP811 (2008), Table7(b); IERS2003/DE403',note:'2008 value, not the IAU2012 exact redefinition.'}),
    unit('ly','l.y.','light year','9460730472580800',{source:'NIST SP811 (2008), B.8 note18: Julian year × c',note:'Light year uses 365.25 days; the separate yr command uses 365 days.',aliases:['ly','light-year']}),
    approximate('pc','pc','parsec','3.085678e16'),unit('mil','Mil','1/1000 inch','0.0000254'),unit('in','in','inch','0.0254',{aliases:['inch','inches']}),unit('ft','ft','foot','0.3048',{aliases:['foot','feet']}),unit('yd','yd','yard','0.9144'),
    unit('fath','fath','fathom',['7200','3937'],{note:survey,source:'NIST SP811 (2008), B.8 fathom (survey foot) and B.6'}),unit('rd','rd','rod',['19800','3937'],{note:survey,source:'NIST SP811 (2008), B.6: 16.5 survey feet'}),unit('mile','mile','mile','1609.344',{aliases:['mi']}),unit('n_mile','n mile','nautical mile','1852',{aliases:['nmi','nautical mile']}),
  ]),
  category('area','AREA','Area','m2',[
    unit('cm2','cm²','square centimeter','0.0001',{aliases:['cm2','cm^2']}),unit('m2','m²','square meter','1',{aliases:['m2','m^2']}),unit('ha','ha','hectare','10000'),unit('km2','km²','square kilometer','1000000',{aliases:['km2','km^2']}),unit('in2','in²','square inch','0.00064516',{aliases:['in2','in^2']}),unit('ft2','ft²','square foot','0.09290304',{aliases:['ft2','ft^2']}),unit('yd2','yd²','square yard','0.83612736',{aliases:['yd2','yd^2']}),unit('acre','acre','acre',['62726400000','15499969'],{note:survey,source:'NIST SP811 (2008), B.6: 43560 survey ft²'}),unit('mile2','mile²','square mile','2589988.110336',{aliases:['mile2','mile^2','mi2','mi²','mi^2']}),
  ]),
  category('volume','VOLUME','Volume','m3',[
    unit('cm3','cm³','cubic centimeter','0.000001',{aliases:['cm3','cm^3']}),unit('mL','mL','milliliter','0.000001',{aliases:['ml']}),unit('L','L','liter','0.001',{aliases:['liter','litre']}),unit('m3','m³','cubic meter','1',{aliases:['m3','m^3']}),unit('in3','in³','cubic inch','0.000016387064',{aliases:['in3','in^3']}),unit('ft3','ft³','cubic foot','0.028316846592',{aliases:['ft3','ft^3']}),
    unit('fl_oz_UK','fl_oz(UK)','ounce (UK fluid)','0.0000284130625',{note:'Imperial gallon/160.',aliases:['fl oz(UK)','UK fl oz']}),unit('fl_oz_US','fl_oz(US)','fluid ounce (U.S.)','0.0000295735295625',{note:'U.S. gallon/128.',aliases:['fl oz(US)','US fl oz']}),unit('gal_US','gal(US)','gallon (U.S.)','0.003785411784',{note:'231 international cubic inches.',aliases:['US gal']}),unit('gal_UK','gal(UK)','UK gallon','0.00454609',{aliases:['UK gal']}),
    unit('pt','pt','pint','0.000473176473',{note:liquid}),unit('qt','qt','quart','0.000946352946',{note:liquid}),unit('tsp','tsp','teaspoon','0.00000492892159375',{note:liquid}),unit('tbsp','tbsp','tablespoon','0.00001478676478125',{note:liquid}),unit('cup','cup','cup','0.0002365882365',{note:liquid}),
  ]),
  category('time','TIME','Time','s',[
    unit('ns','ns','nanosecond','1e-9'),unit('us','μs','microsecond','1e-6',{aliases:['µs']}),unit('ms','ms','millisecond','0.001'),unit('s','s','second','1'),unit('min','min','minute','60'),unit('h','h','hour','3600'),unit('day','day','day','86400'),unit('week','week','week','604800'),unit('yr','yr','year','31536000',{note:'365 days, NIST2008 B.8; not the Julian year.',aliases:['year']}),approximate('s_yr','s-yr','sidereal year','31558150'),approximate('t_yr','t-yr','tropical year','31556930'),
  ]),
  category('temperature','TMPR','Temperature','K',[
    unit('degC','°C','degrees Celsius','1',{offset:'273.15',source:'NIST SP811 (2008), 4.2.1.1 and B.8',aliases:['degC','Celsius']}),unit('K','K','Kelvin','1',{aliases:['kelvin']}),unit('degF','°F','degrees Fahrenheit',['5','9'],{offset:['45967','180'],source:'NIST SP811 (2008), B.8: tC=(tF−32)/1.8',aliases:['degF','Fahrenheit']}),unit('degR','°R','degrees Rankine',['5','9'],{source:'NIST SP811 (2008), B.8: T=TR/1.8',aliases:['degR','Rankine']}),
  ]),
  category('velocity','VELOCITY','Velocity','m_s',[
    unit('m_s','m/s','meter per second','1'),unit('km_h','km/h','kilometer per hour',['5','18']),unit('knot','knot','knot',['463','900']),unit('ft_s','ft/s','foot per second','0.3048'),unit('mile_h','mile/h','mile per hour','0.44704',{aliases:['mph','mi/h']}),
  ]),
  category('mass','MASS','Mass','kg',[
    approximate('u','u','atomic mass unit','1.660538782e-27',{source:'NIST SP811 (2008), Table7(c), CODATA2006',note:'Retains the edition cited by the CASIO manual.',aliases:['amu']}),unit('mg','mg','milligram','0.000001'),unit('g','g','gram','0.001'),unit('kg','kg','kilogram','1'),unit('mton','mton','metric ton','1000',{aliases:['tonne']}),unit('oz','oz','avoirdupois ounce','0.028349523125'),unit('lb','lb','pound mass','0.45359237',{aliases:['lbm']}),unit('slug','slug','slug',['44482216152605','3048000000000'],{note:force+' 1 slug = 1 lbf·s²/ft.'}),unit('ton_short','ton(short)','ton, short (2000 lbm)','907.18474'),unit('ton_long','ton(long)','ton, long (2240 lbm)','1016.0469088'),
  ]),
  category('force','FORCE','Force/Weight','N',[
    unit('N','N','newton','1'),unit('lbf','lbf','pound of force','4.4482216152605',{note:force,source:'NIST SP811 (2008), B.8 note23'}),unit('tonf','tonf','ton of force','8896.443230521',{note:force+' Short ton-force = 2000 lbf; CASIO omits the qualifier.'}),unit('dyne','dyne','dyne','0.00001',{aliases:['dyn']}),unit('kgf','kgf','kilogram of force','9.80665'),
  ]),
  category('pressure','PRESSURE','Pressure','Pa',[
    unit('Pa','Pa','Pascal','1'),unit('kPa','kPa','Kilo Pascal','1000'),unit('mmH2O','mmH₂O','millimeter of water','9.80665',{note:'Conventional water column, not the temperature-specific 4°C value.',aliases:['mmH2O','mm H2O']}),approximate('mmHg','mmHg','millimeter of Mercury','133.3224',{note:'Conventional mercury column; NIST2008 B.8 tabulated factor.'}),unit('atm','atm','atmosphere','101325'),approximate('inH2O','inH₂O','inch of water','249.0889',{note:'Conventional water column; NIST2008 B.8 tabulated factor.',aliases:['inH2O','in H2O']}),approximate('inHg','inHg','inch of Mercury','3386.389',{note:'Conventional mercury column; NIST2008 B.8 tabulated factor.'}),unit('psi','lbf/in²','pound per square inch',['44482216152605','6451600000'],{note:force,aliases:['lbf/in2','lbf/in^2','psi']}),unit('bar','bar','bar','100000'),unit('kgf_cm2','kgf/cm²','kilogram force per square centimeter','98066.5',{aliases:['kgf/cm2','kgf/cm^2']}),
  ]),
  category('energy','ENERGY','Energy/Work','J',[
    approximate('eV','eV','electron Volt','1.602176487e-19',{source:'NIST SP811 (2008), Table7(a), CODATA2006',note:'Retains the 2008 value, not the 2019 SI exact redefinition.'}),unit('J','J','Joule','1'),unit('cal_th','calₜₕ','calorie th','4.184',{aliases:['cal_th','cal(th)']}),approximate('cal15','cal₁₅','calorie (15°C)','4.18580',{aliases:['cal15','cal_15','cal(15)']}),unit('cal_IT','cal_IT','calorie IT','4.1868',{nativeLatex:'\\mathrm{cal}_{IT}',aliases:['calIT','cal(IT)']}),unit('kcal_th','kcalₜₕ','kilocalorie th','4184',{aliases:['kcal_th','kcal(th)']}),approximate('kcal15','kcal₁₅','kilocalorie (15°C)','4185.80',{aliases:['kcal15','kcal_15','kcal(15)']}),unit('kcal_IT','kcal_IT','kilocalorie IT','4186.8',{nativeLatex:'\\mathrm{kcal}_{IT}',aliases:['kcalIT','kcal(IT)']}),unit('l_atm','l-atm','liter atmosphere','101.325',{aliases:['L-atm']}),unit('kWh','kW·h','kilowatt hour','3600000',{aliases:['kW*h','kW h','kWh']}),unit('ft_lbf','ft·lbf','foot-pound','1.3558179483314004',{note:force,aliases:['ft*lbf','ft lbf']}),approximate('Btu','Btu','British thermal unit','1055.056',{note:thermal}),unit('erg','erg','erg','1e-7'),unit('kgf_m','kgf·m','kilogram force meter','9.80665',{aliases:['kgf*m','kgf m']}),
  ]),
  category('power','POWER','Power','W',[
    unit('W','W','watt','1'),unit('cal_th_s','calₜₕ/s','calorie per second','4.184',{aliases:['cal_th/s','cal(th)/s']}),unit('hp','hp','horsepower','745.69987158227022',{note:force+' Mechanical horsepower = 550 ft·lbf/s.'}),unit('ft_lbf_s','ft·lbf/s','foot-pound per second','1.3558179483314004',{note:force,aliases:['ft*lbf/s','ft lbf/s']}),approximate('Btu_min','Btu/min','British thermal unit per minute',['131882','7500'],{note:thermal}),
  ]),
]);
export const CG_METRIC_UNITS=Object.freeze(CG_METRIC_CATEGORIES.flatMap(category=>category.units.map(unit=>Object.freeze({...unit,category:category.id}))));
export const CG_METRIC_REQUIREMENT=Object.freeze({deviceRequiresAddIn:'Metric Conversion',simulatorImplementation:'independent JavaScript implementation',deviceManualPage:'2-64',requiresVendorFirmware:false});
export const CG_METRIC_LIMITS=Object.freeze({minimumNonzero:1e-99,maximum:9.999999999e99,listLength:999,source:'fx-CG50 Hardware User Guide, EN-9; Software3.00 chapter3'});
export const CG_METRIC_NATIVE_LIMITS=Object.freeze([
  'The CASIO manual lists units, not every internal coefficient or BCD rounding step. NIST2008 constants are independently implemented; no real add-in comparison has been performed.',
  'Region/temperature qualifiers omitted by CASIO are recorded in each affected unit note. Historical survey units are retained from the cited NIST2008 source.',
  'Values outside the documented calculator range are rejected; exact native underflow recovery/rounding has not been measured.',
]);
