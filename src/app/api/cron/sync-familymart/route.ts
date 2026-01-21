import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { FamilyMartStore } from '@/lib/types';

// 타이베이시 구별 중심 좌표 (검색 기준점)
const TAIPEI_DISTRICTS = [
  { id: '01', name: '松山區', lat: 25.0608, lng: 121.5576 },
  { id: '02', name: '信義區', lat: 25.0330, lng: 121.5654 },
  { id: '03', name: '大安區', lat: 25.0267, lng: 121.5435 },
  { id: '04', name: '中山區', lat: 25.0685, lng: 121.5264 },
  { id: '05', name: '中正區', lat: 25.0320, lng: 121.5180 },
  { id: '06', name: '大同區', lat: 25.0631, lng: 121.5130 },
  { id: '07', name: '萬華區', lat: 25.0340, lng: 121.4997 },
  { id: '08', name: '文山區', lat: 24.9897, lng: 121.5703 },
  { id: '09', name: '南港區', lat: 25.0550, lng: 121.6069 },
  { id: '10', name: '內湖區', lat: 25.0830, lng: 121.5880 },
  { id: '11', name: '士林區', lat: 25.0930, lng: 121.5250 },
  { id: '12', name: '北投區', lat: 25.1320, lng: 121.5020 },
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

// 단일 구 동기화 함수
async function syncDistrictData(district: { id: string; name: string; lat: number; lng: number }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error('Google Places API 키가 설정되지 않았습니다.');
  }

  const db = await connectToDatabase();
  const collection = db.collection<FamilyMartStore>('familymart_stores');

  const now = new Date().toISOString();
  const results = {
    district: district.name,
    total: 0,
    added: 0,
    updated: 0,
  };

  let pageToken: string | undefined;
  let searchResult = await searchFamilyMartInArea(district.lat, district.lng, apiKey);

  do {
    for (const place of searchResult.results) {
      // FamilyMart 또는 全家 이름이 포함된 매장만 처리
      if (!place.name.includes('FamilyMart') && !place.name.includes('全家')) {
        continue;
      }

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
      await new Promise(resolve => setTimeout(resolve, 2000));
      searchResult = await searchFamilyMartInArea(district.lat, district.lng, apiKey, pageToken);
    }
  } while (pageToken);

  return results;
}

// 전체 동기화 함수 (Cron용 - 2개 구씩 처리)
async function syncBatchDistricts(batchIndex: number) {
  const batchSize = 2;
  const startIdx = batchIndex * batchSize;
  const endIdx = Math.min(startIdx + batchSize, TAIPEI_DISTRICTS.length);

  if (startIdx >= TAIPEI_DISTRICTS.length) {
    return { message: '모든 구 처리 완료', batch: batchIndex, districts: [] };
  }

  const districtsToProcess = TAIPEI_DISTRICTS.slice(startIdx, endIdx);
  const results = [];

  for (const district of districtsToProcess) {
    const result = await syncDistrictData(district);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return {
    batch: batchIndex,
    nextBatch: endIdx < TAIPEI_DISTRICTS.length ? batchIndex + 1 : null,
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
    const batch = searchParams.get('batch'); // 배치 번호 (0-5)

    const isManualRun = manualKey === 'init-familymart-2026';

    if (!isManualRun && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const startTime = Date.now();

    // 특정 구만 처리
    if (districtId) {
      const district = TAIPEI_DISTRICTS.find(d => d.id === districtId);
      if (!district) {
        return NextResponse.json({
          error: '유효하지 않은 구 ID입니다.',
          validIds: TAIPEI_DISTRICTS.map(d => ({ id: d.id, name: d.name }))
        }, { status: 400 });
      }

      console.log(`Syncing FamilyMart data for ${district.name}...`);
      const results = await syncDistrictData(district);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      return NextResponse.json({
        success: true,
        message: `${district.name} FamilyMart 동기화 완료`,
        timestamp: new Date().toISOString(),
        duration: `${duration}s`,
        results,
      });
    }

    // 배치 처리 (Cron용)
    const batchIndex = batch ? parseInt(batch) : 0;
    console.log(`Syncing FamilyMart data batch ${batchIndex}...`);
    const results = await syncBatchDistricts(batchIndex);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      message: 'FamilyMart 배치 동기화 완료',
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
