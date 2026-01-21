import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SevenElevenToilet } from '@/lib/types';

// 타이베이시 구 목록
const TAIPEI_DISTRICTS = [
  { id: '01', name: '松山區' },
  { id: '02', name: '信義區' },
  { id: '03', name: '大安區' },
  { id: '04', name: '中山區' },
  { id: '05', name: '中正區' },
  { id: '06', name: '大同區' },
  { id: '07', name: '萬華區' },
  { id: '08', name: '文山區' },
  { id: '09', name: '南港區' },
  { id: '10', name: '內湖區' },
  { id: '11', name: '士林區' },
  { id: '12', name: '北投區' },
];

// 7-ELEVEN API 엔드포인트
const SEVEN_ELEVEN_API = 'https://emap.pcsc.com.tw/EMapSDK.aspx';

// XML 파싱 헬퍼 함수
function parseXmlValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 's'));
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

  const storeMatches = xml.match(/<GeoPosition>(.*?)<\/GeoPosition>/gs);
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
async function fetchDistrictStores(districtName: string): Promise<Array<{
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
      body: `commandid=SearchStore&city=台北市&town=${encodeURIComponent(districtName)}`,
    });

    const xml = await response.text();
    return parseStores(xml);
  } catch (error) {
    console.error(`Error fetching ${districtName}:`, error);
    return [];
  }
}

// 메인 동기화 함수
async function syncSevenElevenData() {
  const db = await connectToDatabase();
  const collection = db.collection<SevenElevenToilet>('seven_eleven_toilets');

  const now = new Date().toISOString();
  const results = {
    total: 0,
    withToilet: 0,
    added: 0,
    updated: 0,
    deleted: 0,
    districts: [] as { name: string; total: number; withToilet: number }[],
  };

  // 현재 DB의 모든 POI ID 가져오기 (삭제 체크용)
  const existingStores = await collection.find({}, { projection: { poi_id: 1 } }).toArray();
  const existingPoiIds = new Set(existingStores.map(s => s.poi_id));
  const foundPoiIds = new Set<string>();

  // 각 구별로 데이터 수집
  for (const district of TAIPEI_DISTRICTS) {
    const stores = await fetchDistrictStores(district.name);
    const toiletStores = stores.filter(s => s.hasToilet);

    results.districts.push({
      name: district.name,
      total: stores.length,
      withToilet: toiletStores.length,
    });

    results.total += stores.length;
    results.withToilet += toiletStores.length;

    // 화장실 있는 매장만 DB에 저장
    for (const store of toiletStores) {
      foundPoiIds.add(store.poiId);

      const storeData: Omit<SevenElevenToilet, '_id'> = {
        poi_id: store.poiId,
        name: store.name,
        address: store.address,
        city: '台北市',
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
        created_at: now,
        updated_at: now,
      };

      const result = await collection.updateOne(
        { poi_id: store.poiId },
        {
          $set: { ...storeData, updated_at: now },
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

    // API 호출 간 딜레이 (과부하 방지)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 더 이상 존재하지 않는 매장 삭제
  for (const existingPoiId of existingPoiIds) {
    if (!foundPoiIds.has(existingPoiId)) {
      await collection.deleteOne({ poi_id: existingPoiId });
      results.deleted++;
    }
  }

  return results;
}

// GET: Cron Job 또는 수동 실행
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron 인증 확인
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Cron 시크릿이 설정된 경우 인증 확인
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // 개발 환경에서는 허용
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('Starting 7-ELEVEN toilet data sync...');
    const startTime = Date.now();

    const results = await syncSevenElevenData();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      message: '7-ELEVEN 화장실 데이터 동기화 완료',
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
