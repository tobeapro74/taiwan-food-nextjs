import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { FamilyMartStore } from '@/lib/types';

// 타이베이시 구별 중심 좌표 (검색 기준점)
const TAIPEI_DISTRICTS = [
  { id: 'tp01', name: '松山區', city: '台北市', lat: 25.0608, lng: 121.5576 },
  { id: 'tp02', name: '信義區', city: '台北市', lat: 25.0330, lng: 121.5654 },
  { id: 'tp03', name: '大安區', city: '台北市', lat: 25.0267, lng: 121.5435 },
  { id: 'tp04', name: '中山區', city: '台北市', lat: 25.0685, lng: 121.5264 },
  { id: 'tp05', name: '中正區', city: '台北市', lat: 25.0320, lng: 121.5180 },
  { id: 'tp06', name: '大同區', city: '台北市', lat: 25.0631, lng: 121.5130 },
  { id: 'tp07', name: '萬華區', city: '台北市', lat: 25.0340, lng: 121.4997 },
  { id: 'tp08', name: '文山區', city: '台北市', lat: 24.9897, lng: 121.5703 },
  { id: 'tp09', name: '南港區', city: '台北市', lat: 25.0550, lng: 121.6069 },
  { id: 'tp10', name: '內湖區', city: '台北市', lat: 25.0830, lng: 121.5880 },
  { id: 'tp11', name: '士林區', city: '台北市', lat: 25.0930, lng: 121.5250 },
  { id: 'tp12', name: '北投區', city: '台北市', lat: 25.1320, lng: 121.5020 },
];

// 신베이시 구별 중심 좌표
const NEW_TAIPEI_DISTRICTS = [
  { id: 'nt01', name: '板橋區', city: '新北市', lat: 25.0146, lng: 121.4593 },
  { id: 'nt02', name: '三重區', city: '新北市', lat: 25.0615, lng: 121.4879 },
  { id: 'nt03', name: '中和區', city: '新北市', lat: 24.9998, lng: 121.4986 },
  { id: 'nt04', name: '永和區', city: '新北市', lat: 25.0076, lng: 121.5168 },
  { id: 'nt05', name: '新莊區', city: '新北市', lat: 25.0360, lng: 121.4504 },
  { id: 'nt06', name: '新店區', city: '新北市', lat: 24.9677, lng: 121.5419 },
  { id: 'nt07', name: '土城區', city: '新北市', lat: 24.9723, lng: 121.4433 },
  { id: 'nt08', name: '蘆洲區', city: '新北市', lat: 25.0849, lng: 121.4738 },
  { id: 'nt09', name: '樹林區', city: '新北市', lat: 24.9906, lng: 121.4205 },
  { id: 'nt10', name: '汐止區', city: '新北市', lat: 25.0658, lng: 121.6475 },
  { id: 'nt11', name: '鶯歌區', city: '新北市', lat: 24.9553, lng: 121.3545 },
  { id: 'nt12', name: '三峽區', city: '新北市', lat: 24.9340, lng: 121.3686 },
  { id: 'nt13', name: '淡水區', city: '新北市', lat: 25.1694, lng: 121.4408 },
  { id: 'nt14', name: '瑞芳區', city: '新北市', lat: 25.1089, lng: 121.8104 },
  { id: 'nt15', name: '五股區', city: '新北市', lat: 25.0829, lng: 121.4381 },
  { id: 'nt16', name: '泰山區', city: '新北市', lat: 25.0590, lng: 121.4318 },
  { id: 'nt17', name: '林口區', city: '新北市', lat: 25.0775, lng: 121.3916 },
  { id: 'nt18', name: '深坑區', city: '新北市', lat: 25.0022, lng: 121.6153 },
  { id: 'nt19', name: '石碇區', city: '新北市', lat: 24.9917, lng: 121.6586 },
  { id: 'nt20', name: '坪林區', city: '新北市', lat: 24.9375, lng: 121.7111 },
  { id: 'nt21', name: '三芝區', city: '新北市', lat: 25.2583, lng: 121.5000 },
  { id: 'nt22', name: '石門區', city: '新北市', lat: 25.2903, lng: 121.5681 },
  { id: 'nt23', name: '八里區', city: '新北市', lat: 25.1472, lng: 121.4008 },
  { id: 'nt24', name: '平溪區', city: '新北市', lat: 25.0258, lng: 121.7381 },
  { id: 'nt25', name: '雙溪區', city: '新北市', lat: 25.0333, lng: 121.8653 },
  { id: 'nt26', name: '貢寮區', city: '新北市', lat: 25.0222, lng: 121.9083 },
  { id: 'nt27', name: '金山區', city: '新北市', lat: 25.2222, lng: 121.6361 },
  { id: 'nt28', name: '萬里區', city: '新北市', lat: 25.1778, lng: 121.6889 },
  { id: 'nt29', name: '烏來區', city: '新北市', lat: 24.8653, lng: 121.5514 },
];

const ALL_DISTRICTS = [...TAIPEI_DISTRICTS, ...NEW_TAIPEI_DISTRICTS];

// 타이베이시 + 신베이시 구 이름 목록 (주소에서 추출용)
const ALL_DISTRICT_NAMES = ALL_DISTRICTS.map(d => d.name).join('|');

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
  const districtMatch = address.match(new RegExp(`(${ALL_DISTRICT_NAMES})`));
  return districtMatch ? districtMatch[1] : '';
}

// 단일 구 동기화 함수
async function syncDistrictData(district: { id: string; name: string; city: string; lat: number; lng: number }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error('Google Places API 키가 설정되지 않았습니다.');
  }

  const db = await connectToDatabase();
  const collection = db.collection<FamilyMartStore>('familymart_stores');

  const now = new Date().toISOString();
  const results = {
    district: district.name,
    city: district.city,
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
            city: district.city,
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

// 배치 동기화 함수 (Cron용 - 2개 구씩 처리)
async function syncBatchDistricts(batchIndex: number) {
  const batchSize = 2;
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
    await new Promise(resolve => setTimeout(resolve, 500));
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
    const batch = searchParams.get('batch'); // 배치 번호 (0-20)
    const city = searchParams.get('city'); // 도시 필터 (taipei, newtaipei)

    const isManualRun = manualKey === 'init-familymart-2026';

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

      console.log(`Syncing FamilyMart data for ${district.city} ${district.name}...`);
      const results = await syncDistrictData(district);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      return NextResponse.json({
        success: true,
        message: `${district.city} ${district.name} FamilyMart 동기화 완료`,
        timestamp: new Date().toISOString(),
        duration: `${duration}s`,
        results,
      });
    }

    // 도시별 처리
    if (city) {
      const districts = city === 'taipei' ? TAIPEI_DISTRICTS :
                       city === 'newtaipei' ? NEW_TAIPEI_DISTRICTS : [];

      if (districts.length === 0) {
        return NextResponse.json({ error: '유효하지 않은 도시입니다. (taipei, newtaipei)' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `${city === 'taipei' ? '台北市' : '新北市'} 구 목록`,
        districts: districts.map(d => ({ id: d.id, name: d.name })),
        hint: '개별 구를 ?district=ID로 호출하세요.',
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
