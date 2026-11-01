"""Independent standard-library validation of the JS writer's real-sample exports."""
import hashlib,json,math,struct,zlib
from pathlib import Path
from datetime import datetime,timezone
root=Path('.verification/native-picture-samples').resolve()
written=root/'written'
expected=json.loads((written/'expected.json').read_text(encoding='utf-8'))
results=[]
def u32(data,offset): return struct.unpack_from('>I',data,offset)[0]
def real(data):
    digits=''.join(f'{value:02x}' for value in data[:9])
    assert all(value in '0123456789' for value in digits)
    if set(digits[3:])=={'0'}: return 0.0
    exponent=int(digits[:3]); sign=-1 if exponent>=500 else 1
    if sign<0: exponent-=500
    return float(('-' if sign<0 else '')+digits[3]+'.'+digits[4:]+'e'+str(exponent-100))
for item in expected['files']:
    path=(written/item['name']).resolve(); assert path.parent==written
    data=path.read_bytes(); source=(root/item['sourceName']).read_bytes()
    assert data[:14]==source[:14]
    assert (u32(data,16)^0xffffffff)==len(data)
    assert data[14]==(((len(data)+0x41)&255)^255)
    assert data[20]==(((len(data)+0xb8)&255)^255)
    assert data[28]==((data[18]+data[19]+0x9b)&255)
    assert data[29]==((data[19]+0x85)&255)
    assert u32(data,0x30)==len(data)-0x20
    assert u32(data,0x3c)==len(data)-200-0xb8
    assert u32(data,0xbc)==len(data)-200-0xcc
    count=struct.unpack_from('>H',data,0xc4)[0]
    assert count==len(item['pixelHashes'])
    offset=0xcc
    for index in range(count):
        length=u32(data,offset); offset+=4
        compressed=bytes(((((value>>3)|(value<<5))&255)^255) for value in data[offset:offset+length])
        pixels=zlib.decompress(compressed)
        assert len(pixels)==384*192*2
        assert hashlib.sha256(pixels).hexdigest()==item['pixelHashes'][index]
        offset+=length
    assert offset==len(data)-200
    footer=data[offset:]; original=source[-200:]
    for key,index in {'xmin':0,'xmax':1,'ymin':4,'ymax':5}.items():
        actual=real(footer[8+12*index:20+12*index])
        assert math.isclose(actual,item['window'][key],rel_tol=1e-14,abs_tol=1e-14),(item['name'],key,actual)
    assert math.isclose(real(footer[160:172]),item['time']['start'],rel_tol=1e-14,abs_tol=1e-14)
    assert math.isclose(real(footer[172:184]),item['time']['step'],rel_tol=1e-14,abs_tol=1e-14)
    allowed=set()
    for start in [8,20,56,68,160,172]: allowed.update(range(start,start+9))
    assert all(footer[index]==original[index] for index in range(200) if index not in allowed)
    if item['kind']=='roundtrip': assert data==source
    results.append({'name':item['name'],'kind':item['kind'],'frames':count,'independentZlibPixels':True,'metadata':True,'unknownFooterBytesPreserved':True,'byteIdentical':data==source})
report={'date':datetime.now(timezone.utc).isoformat(),'source':expected['source'],'zipSha256':expected['zipSha256'],'scope':'24 exports of8 factory-resource samples; independent Python zlib/BCD/header checks, no physical-device transfer','passed':results,'errors':[]}
Path('.verification/cg-g3b-write-original-results.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'passed':len(results),'frames':sum(result['frames'] for result in results),'byteIdenticalOriginals':sum(result['byteIdentical'] for result in results),'errors':[]}))
