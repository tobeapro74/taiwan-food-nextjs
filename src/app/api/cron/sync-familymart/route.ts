import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { FamilyMartStore } from '@/lib/types';

// 타이베이시 구별 중심 좌표 (검색 기준점)
const TAIPEI_DISTRICTS = [
  { name: '松山區', lat: 25.0608, lng: 121.5576 },
  { name: '信義區', lat: 25.0330, lng: 121.5654 },
  { name: '大安區', lat: 25.0267, lng: 121.5435 },
  { name: '中山區', lat: 25.0685, lng: 121.5264 },
  { name: '中正區', lat: 25.0320, lng: 121.5180 },
  { name: '大同區', lat: 25.0631, lng: 121.5130 },
  { name: '萬華區', lat: 25.0340, lng: 121.4997 },
  { name: '文山區', lat: 24.9897, lng: 121.5703 },
  { name: '南港區', lat: 25.0550, lng: 121.6069 },
  { name: '內湖區', lat: 25.0830, lng: 121.5880 },
  { name: '士林區', lat: 25.0930, lng: 121.5250 },
  { name: '北投區', lat: 25.1320, lng: 121.5020 },
];

// Google Places API로 FamilyMart 검색
async function searchFamilyMartInArea(
  lat: number,
  lng: number,
  apiKey: string,
  pageToken?: string
): Promise<{
  results: Array<{
    place_id: string;
    name: string;
    vicinity: string;
    geometry: { location: { lat: number; lng: number } };
    opening_hours?: { open_now?: boolean };
  }>;
  nextPageToken?: string;
}> {
  let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=convenience_store&keyword=FamilyMart&language=zh-TW&key=${apiKey}`;

  if (pageToken) {
    url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${pageToken}&key=${apiKey}`;
  }

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('Google Places API error:', data.status, data.error_message);
    return { results: [] };
  }

  return {
    results: data.results || [],
    nextPageToken: data.next_page_token,
  };
}

// 주소에서 구 이름 추출
function extractDistrict(address: string): string {
  const districtMatch = address.match(/(松山區|信義區|大安區|中山區|中正區|大同區|萬華區|文山區|南港區|內湖區|士林區|北投區)/);
  return districtMatch ? districtMatch[1] : '';
}

// 메인 동기화 함수
async function syncFamilyMartData() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error('Google Places API 키가 설정되지 않았습니다.');
  }

  const db = await connectToDatabase();
  const collection = db.collection<FamilyMartStore>('familymart_stores');

  const now = new Date().toISOString();
  const results = {
    total: 0,
    added: 0,
    updated: 0,
    deleted: 0,
    districts: [] as { name: string; count: number }[],
  };

  // 현재 DB의 모든 Place ID 가져오기 (삭제 체크용)
  const existingStores = await collection.find({}, { projection: { place_id: 1 } }).toArray();
  const existingPlaceIds = new Set(existingStores.map(s => s.place_id));
  const foundPlaceIds = new Set<string>();

  // 각 구별로 검색
  for (const district of TAIPEI_DISTRICTS) {
    let districtCount = 0;
    let pageToken: string | undefined;

    // 첫 페이지 검색
    let searchResult = await searchFamilyMartInArea(district.lat, district.lng, apiKey);

    do {
      for (const place of searchResult.results) {
        // FamilyMart 또는 全家 이름이 포함된 매장만 처리
        if (!place.name.includes('FamilyMart') && !place.name.includes('全家')) {
          continue;
        }

        foundPlaceIds.add(place.place_id);
        districtCount++;
        results.total++;

        const storeDistrict = extractDistrict(place.vicinity) || district.name;

        const result = await collection.updateOne(
          { place_id: place.place_id },
          {
            $set: {
              place_id: place.place_id,
              name: place.name,
              address: place.vicinity,
              city: '台北市',
              district: storeDistrict,
              coordinates: {
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
              },
              opening_hours: place.opening_hours ? {
                open_now: place.opening_hours.open_now,
              } : undefined,
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

      // 다음 페이지가 있으면 계속 검색
      pageToken = searchResult.nextPageToken;
      if (pageToken) {
        // Google API는 next_page_token을 사용하려면 잠시 대기 필요
        await new Promise(resolve => setTimeout(resolve, 2000));
        searchResult = await searchFamilyMartInArea(district.lat, district.lng, apiKey, pageToken);
      }
    } while (pageToken);

    results.districts.push({
      name: district.name,
      count: districtCount,
    });

    // API 호출 간 딜레이 (과부하 방지)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 더 이상 존재하지 않는 매장 삭제
  for (const existingPlaceId of existingPlaceIds) {
    if (!foundPlaceIds.has(existingPlaceId)) {
      await collection.deleteOne({ place_id: existingPlaceId });
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
    const { searchParams } = new URL(request.url);
    const manualKey = searchParams.get('key');

    // 수동 실행 키 확인 (초기 데이터 적재용)
    const isManualRun = manualKey === 'init-familymart-2026';

    // Cron 시크릿이 설정된 경우 인증 확인
    if (!isManualRun && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // 개발 환경에서는 허용
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('Starting FamilyMart data sync...');
    const startTime = Date.now();

    const results = await syncFamilyMartData();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      message: 'FamilyMart 매장 데이터 동기화 완료',
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
