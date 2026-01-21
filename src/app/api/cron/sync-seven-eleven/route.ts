import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SevenElevenToilet } from '@/lib/types';

// 타이베이시 구 목록
const TAIPEI_DISTRICTS = [
  { id: 'tp01', name: '松山區', city: '台北市' },
  { id: 'tp02', name: '信義區', city: '台北市' },
  { id: 'tp03', name: '大安區', city: '台北市' },
  { id: 'tp04', name: '中山區', city: '台北市' },
  { id: 'tp05', name: '中正區', city: '台北市' },
  { id: 'tp06', name: '大同區', city: '台北市' },
  { id: 'tp07', name: '萬華區', city: '台北市' },
  { id: 'tp08', name: '文山區', city: '台北市' },
  { id: 'tp09', name: '南港區', city: '台北市' },
  { id: 'tp10', name: '內湖區', city: '台北市' },
  { id: 'tp11', name: '士林區', city: '台北市' },
  { id: 'tp12', name: '北投區', city: '台北市' },
];

// 신베이시 구 목록
const NEW_TAIPEI_DISTRICTS = [
  { id: 'nt01', name: '板橋區', city: '新北市' },
  { id: 'nt02', name: '三重區', city: '新北市' },
  { id: 'nt03', name: '中和區', city: '新北市' },
  { id: 'nt04', name: '永和區', city: '新北市' },
  { id: 'nt05', name: '新莊區', city: '新北市' },
  { id: 'nt06', name: '新店區', city: '新北市' },
  { id: 'nt07', name: '土城區', city: '新北市' },
  { id: 'nt08', name: '蘆洲區', city: '新北市' },
  { id: 'nt09', name: '樹林區', city: '新北市' },
  { id: 'nt10', name: '汐止區', city: '新北市' },
  { id: 'nt11', name: '鶯歌區', city: '新北市' },
  { id: 'nt12', name: '三峽區', city: '新北市' },
  { id: 'nt13', name: '淡水區', city: '新北市' },
  { id: 'nt14', name: '瑞芳區', city: '新北市' },
  { id: 'nt15', name: '五股區', city: '新北市' },
  { id: 'nt16', name: '泰山區', city: '新北市' },
  { id: 'nt17', name: '林口區', city: '新北市' },
  { id: 'nt18', name: '深坑區', city: '新北市' },
  { id: 'nt19', name: '石碇區', city: '新北市' },
  { id: 'nt20', name: '坪林區', city: '新北市' },
  { id: 'nt21', name: '三芝區', city: '新北市' },
  { id: 'nt22', name: '石門區', city: '新北市' },
  { id: 'nt23', name: '八里區', city: '新北市' },
  { id: 'nt24', name: '平溪區', city: '新北市' },
  { id: 'nt25', name: '雙溪區', city: '新北市' },
  { id: 'nt26', name: '貢寮區', city: '新北市' },
  { id: 'nt27', name: '金山區', city: '新北市' },
  { id: 'nt28', name: '萬里區', city: '新北市' },
  { id: 'nt29', name: '烏來區', city: '新北市' },
];

const ALL_DISTRICTS = [...TAIPEI_DISTRICTS, ...NEW_TAIPEI_DISTRICTS];

// 7-ELEVEN API 엔드포인트
const SEVEN_ELEVEN_API = 'https://emap.pcsc.com.tw/EMapSDK.aspx';

// XML 파싱 헬퍼 함수
function parseXmlValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : '';
}

// 매장 정보 파싱
function parseStores(xml: string): Array<{
  poiId: string;
  name: string;
  address: string;
  lng: number;
  lat: number;
  phone: string;
  services: string[];
  openingDays: string;
  openingHours: string;
  hasToilet: boolean;
}> {
  const stores: Array<{
    poiId: string;
    name: string;
    address: string;
    lng: number;
    lat: number;
    phone: string;
    services: string[];
    openingDays: string;
    openingHours: string;
    hasToilet: boolean;
  }> = [];

  const storeMatches = xml.match(/<GeoPosition>[\s\S]*?<\/GeoPosition>/g);
  if (!storeMatches) return stores;

  for (const storeXml of storeMatches) {
    const poiId = parseXmlValue(storeXml, 'POIID').trim();
    const name = parseXmlValue(storeXml, 'POIName');
    const address = parseXmlValue(storeXml, 'Address');
    const x = parseXmlValue(storeXml, 'X'); // 경도
    const y = parseXmlValue(storeXml, 'Y'); // 위도
    const phone = parseXmlValue(storeXml, 'Telno').trim();
    const servicesStr = parseXmlValue(storeXml, 'StoreImageTitle');
    const openingDays = parseXmlValue(storeXml, 'OP_DAY');
    const openingHours = parseXmlValue(storeXml, 'OP_TIME');

    // 서비스 파싱 (예: "02廁所,03ATM,04座位區")
    const services = servicesStr.split(',').map(s => s.trim()).filter(Boolean);
    const hasToilet = services.some(s => s.includes('02廁所'));

    // 좌표 변환 (7-ELEVEN API는 좌표를 특수 형식으로 반환)
    const lng = parseFloat(x) / 1000000 || parseFloat(x);
    const lat = parseFloat(y) / 1000000 || parseFloat(y);

    if (poiId && name && address) {
      stores.push({
        poiId,
        name,
        address,
        lng: lng > 1000 ? lng / 1000000 : lng,
        lat: lat > 1000 ? lat / 1000000 : lat,
        phone,
        services,
        openingDays,
        openingHours,
        hasToilet,
      });
    }
  }

  return stores;
}

// 구별 매장 데이터 가져오기
async function fetchDistrictStores(cityName: string, districtName: string): Promise<Array<{
  poiId: string;
  name: string;
  address: string;
  lng: number;
  lat: number;
  phone: string;
  services: string[];
  openingDays: string;
  openingHours: string;
  hasToilet: boolean;
}>> {
  try {
    const response = await fetch(SEVEN_ELEVEN_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: `commandid=SearchStore&city=${encodeURIComponent(cityName)}&town=${encodeURIComponent(districtName)}`,
    });

    const xml = await response.text();
    return parseStores(xml);
  } catch (error) {
    console.error(`Error fetching ${cityName} ${districtName}:`, error);
    return [];
  }
}

// 단일 구 동기화 함수
async function syncDistrictData(district: { id: string; name: string; city: string }) {
  const db = await connectToDatabase();
  const collection = db.collection<SevenElevenToilet>('seven_eleven_toilets');

  const now = new Date().toISOString();
  const results = {
    district: district.name,
    city: district.city,
    total: 0,
    withToilet: 0,
    added: 0,
    updated: 0,
  };

  const stores = await fetchDistrictStores(district.city, district.name);
  const toiletStores = stores.filter(s => s.hasToilet);

  results.total = stores.length;
  results.withToilet = toiletStores.length;

  for (const store of toiletStores) {
    const result = await collection.updateOne(
      { poi_id: store.poiId },
      {
        $set: {
          poi_id: store.poiId,
          name: store.name,
          address: store.address,
          city: district.city,
          district: district.name,
          coordinates: {
            lat: store.lat,
            lng: store.lng,
          },
          phone: store.phone,
          opening_hours: store.openingHours,
          opening_days: store.openingDays,
          services: store.services,
          has_toilet: true,
          updated_at: now,
        },
        $setOnInsert: { created_at: now },
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      results.added++;
    } else if (result.modifiedCount > 0) {
      results.updated++;
    }
  }

  return results;
}

// 배치 동기화 함수 (Cron용 - 5개 구씩 처리)
async function syncBatchDistricts(batchIndex: number) {
  const batchSize = 5;
  const startIdx = batchIndex * batchSize;
  const endIdx = Math.min(startIdx + batchSize, ALL_DISTRICTS.length);

  if (startIdx >= ALL_DISTRICTS.length) {
    return { message: '모든 구 처리 완료', batch: batchIndex, districts: [] };
  }

  const districtsToProcess = ALL_DISTRICTS.slice(startIdx, endIdx);
  const results = [];

  for (const district of districtsToProcess) {
    const result = await syncDistrictData(district);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return {
    batch: batchIndex,
    nextBatch: endIdx < ALL_DISTRICTS.length ? batchIndex + 1 : null,
    totalDistricts: ALL_DISTRICTS.length,
    districts: results,
  };
}

// GET: Cron Job 또는 수동 실행
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const { searchParams } = new URL(request.url);
    const manualKey = searchParams.get('key');
    const districtId = searchParams.get('district'); // 특정 구만 처리
    const batch = searchParams.get('batch'); // 배치 번호 (0-8)
    const city = searchParams.get('city'); // 도시 필터 (taipei, newtaipei)

    const isManualRun = manualKey === 'init-seven-eleven-2026';

    if (!isManualRun && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const startTime = Date.now();

    // 특정 구만 처리
    if (districtId) {
      const district = ALL_DISTRICTS.find(d => d.id === districtId);
      if (!district) {
        return NextResponse.json({
          error: '유효하지 않은 구 ID입니다.',
          validIds: ALL_DISTRICTS.map(d => ({ id: d.id, name: d.name, city: d.city }))
        }, { status: 400 });
      }

      console.log(`Syncing 7-ELEVEN data for ${district.city} ${district.name}...`);
      const results = await syncDistrictData(district);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      return NextResponse.json({
        success: true,
        message: `${district.city} ${district.name} 7-ELEVEN 동기화 완료`,
        timestamp: new Date().toISOString(),
        duration: `${duration}s`,
        results,
      });
    }

    // 도시별 배치 처리
    if (city) {
      const districts = city === 'taipei' ? TAIPEI_DISTRICTS :
                       city === 'newtaipei' ? NEW_TAIPEI_DISTRICTS : [];

      if (districts.length === 0) {
        return NextResponse.json({ error: '유효하지 않은 도시입니다. (taipei, newtaipei)' }, { status: 400 });
      }

      const results = [];
      for (const district of districts) {
        const result = await syncDistrictData(district);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      return NextResponse.json({
        success: true,
        message: `${city === 'taipei' ? '台北市' : '新北市'} 7-ELEVEN 동기화 완료`,
        timestamp: new Date().toISOString(),
        duration: `${duration}s`,
        results,
      });
    }

    // 배치 처리 (Cron용)
    const batchIndex = batch ? parseInt(batch) : 0;
    console.log(`Syncing 7-ELEVEN data batch ${batchIndex}...`);
    const results = await syncBatchDistricts(batchIndex);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      message: '7-ELEVEN 배치 동기화 완료',
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      results,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
