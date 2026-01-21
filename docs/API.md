# API 명세서

## 인증 API

### POST /api/auth/register
회원가입

**Request Body**
```json
{
  "name": "사용자명",
  "email": "user@example.com",
  "password": "비밀번호"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "사용자명",
    "email": "user@example.com"
  }
}
```

---

### POST /api/auth/login
로그인

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "비밀번호"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "사용자명",
    "profile_image": null,
    "is_admin": false
  }
}
```

**쿠키**: `auth_token` (JWT, httpOnly)

---

### POST /api/auth/logout
로그아웃

**Response**
```json
{
  "success": true
}
```

---

### GET /api/auth/me
현재 로그인 사용자 정보

**Response (로그인 상태)**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "사용자명",
    "profile_image": null,
    "is_admin": false
  }
}
```

**Response (비로그인)**
```json
{
  "success": false,
  "error": "인증이 필요합니다."
}
```

---

### POST /api/auth/send-verification
이메일 인증 코드 발송 (Resend API)

**Request Body**
```json
{
  "email": "user@example.com"
}
```

**Response**
```json
{
  "success": true,
  "message": "인증 코드가 발송되었습니다."
}
```

---

### POST /api/auth/verify-code
이메일 인증 코드 확인

**Request Body**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response**
```json
{
  "success": true,
  "message": "이메일이 인증되었습니다."
}
```

---

### DELETE /api/auth/delete-account
계정 삭제 (인증 필요)

**Request Body**
```json
{
  "password": "현재비밀번호"
}
```

**Response**
```json
{
  "success": true,
  "message": "계정이 삭제되었습니다."
}
```

---

## 리뷰 API

### GET /api/reviews
리뷰 목록 조회

**Query Parameters**
| 파라미터 | 필수 | 설명 |
|---------|------|------|
| restaurant_id | O | 맛집 ID |

**Response**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "restaurant_id": "맛집ID",
      "user_id": 1,
      "user_name": "사용자명",
      "rating": 5,
      "food_rating": 5,
      "service_rating": 4,
      "atmosphere_rating": 5,
      "content": "리뷰 내용",
      "photos": ["https://..."],
      "meal_type": "점심 식사",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/reviews
리뷰 작성 (인증 필요)

**Request Body**
```json
{
  "restaurant_id": "맛집ID",
  "rating": 5,
  "food_rating": 5,
  "service_rating": 4,
  "atmosphere_rating": 5,
  "content": "리뷰 내용",
  "photos": ["https://cloudinary.com/..."],
  "meal_type": "점심 식사"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "insertedId": "..."
  }
}
```

---

### PUT /api/reviews/[id]
리뷰 수정 (본인 리뷰만)

**Request Body**
```json
{
  "restaurant_id": "맛집ID",
  "rating": 4,
  "food_rating": 4,
  "service_rating": 4,
  "atmosphere_rating": 4,
  "content": "수정된 리뷰 내용",
  "photos": ["https://cloudinary.com/..."],
  "meal_type": "저녁 식사"
}
```

**Response**
```json
{
  "success": true,
  "message": "리뷰가 수정되었습니다."
}
```

---

### DELETE /api/reviews/[id]
리뷰 삭제 (본인 리뷰만)

**Response**
```json
{
  "success": true
}
```

---

## 이미지 API

### POST /api/upload
이미지 업로드 (Cloudinary)

**Request Body**
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/...",
  "public_id": "taiwan-food-reviews/..."
}
```

**에러 응답**
```json
{
  "success": false,
  "error": "이미지 업로드 실패: 상세 에러 메시지"
}
```

---

### GET /api/place-photo
Google Places 이미지 프록시

**Query Parameters**
| 파라미터 | 필수 | 설명 |
|---------|------|------|
| reference | O | Google Places photo_reference |
| maxwidth | X | 최대 너비 (기본: 400) |

**Response**: 이미지 바이너리 (Content-Type: image/jpeg)

---

## 사용자 등록 맛집 API

### GET /api/custom-restaurants
사용자 등록 맛집 목록 조회

**Query Parameters**
| 파라미터 | 필수 | 설명 |
|---------|------|------|
| category | X | 카테고리 필터 |

**Response**
```json
{
  "success": true,
  "data": [
    {
      "place_id": "ChIJ...",
      "name": "맛집명",
      "address": "주소",
      "category": "면류",
      "feature": "특징",
      "google_rating": 4.5,
      "google_reviews_count": 100,
      "coordinates": { "lat": 25.0, "lng": 121.5 },
      "price_level": 2,
      "phone_number": "+886...",
      "registered_by": 1,
      "registered_by_name": "사용자명",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/custom-restaurants
맛집 등록 (인증 필요, 관리자만)

**Request Body**
```json
{
  "place_id": "ChIJ...",
  "name": "맛집명",
  "address": "주소",
  "category": "면류",
  "feature": "특징 메모",
  "coordinates": { "lat": 25.0, "lng": 121.5 },
  "google_rating": 4.5,
  "google_reviews_count": 100,
  "price_level": 2,
  "phone_number": "+886...",
  "opening_hours": ["월-금 10:00-22:00"],
  "photos": ["https://..."],
  "website": "https://...",
  "google_map_url": "https://maps.google.com/..."
}
```

**Response**
```json
{
  "success": true,
  "message": "맛집이 등록되었습니다.",
  "data": { "insertedId": "..." }
}
```

**에러 응답 (중복 등록)**
```json
{
  "success": false,
  "error": "이미 등록된 맛집입니다."
}
```

---

### PATCH /api/custom-restaurants
카테고리 수정 (등록자 또는 관리자만)

**Request Body**
```json
{
  "place_id": "ChIJ...",
  "category": "카페"
}
```

**Response**
```json
{
  "success": true,
  "message": "카테고리가 수정되었습니다.",
  "data": { "place_id": "...", "category": "카페" }
}
```

---

### PUT /api/custom-restaurants
맛집 정보 수정 (등록자 또는 관리자만)

**Request Body**
```json
{
  "old_place_id": "ChIJ...",
  "address": "새 주소",
  "feature": "새 특징/메모",
  "coordinates": { "lat": 25.0, "lng": 121.5 },
  "phone_number": "+886...",
  "opening_hours": ["월-금 10:00-22:00"]
}
```

**Response**
```json
{
  "success": true,
  "message": "맛집 정보가 수정되었습니다.",
  "data": { "old_place_id": "...", "address": "..." }
}
```

**히스토리 자동 기록**
- 변경된 필드가 있으면 자동으로 `restaurant_history`에 기록
- memo: "정보 수정: 주소, 좌표" 형식으로 변경 내용 기록

---

### DELETE /api/custom-restaurants
맛집 삭제 (등록자 본인만)

**Query Parameters**
| 파라미터 | 필수 | 설명 |
|---------|------|------|
| place_id | O | 삭제할 맛집의 place_id |

**Response**
```json
{
  "success": true
}
```

---

## 실시간 평점 API

### POST /api/ratings
여러 맛집의 실시간 평점 조회 (Google Places API)

**Request Body**
```json
{
  "names": ["맛집1", "맛집2", "맛집3"]
}
```

**Response**
```json
{
  "ratings": {
    "맛집1": { "rating": 4.5, "userRatingsTotal": 150 },
    "맛집2": { "rating": 4.2, "userRatingsTotal": 80 },
    "맛집3": { "rating": null, "userRatingsTotal": null }
  }
}
```

---

## 맛집 등록 히스토리 API

### GET /api/restaurant-history
히스토리 목록 조회

**Query Parameters**
| 파라미터 | 필수 | 설명 |
|---------|------|------|
| page | X | 페이지 번호 (기본: 1) |
| limit | X | 페이지당 항목 수 (기본: 20) |
| action | X | 액션 필터 (register/delete/update) |

**Response**
```json
{
  "success": true,
  "data": [
    {
      "seq": 8,
      "place_id": "ChIJ...",
      "name": "LA VILLA DANSHUI",
      "short_address": "Zhongzheng District",
      "category": "카페",
      "registered_by": 2,
      "registered_by_name": "박병철",
      "registered_at": "2024-01-15T10:30:00.000Z",
      "action": "register"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

---

### POST /api/restaurant-history
히스토리 수동 추가 (인증 필요)

**Request Body**
```json
{
  "place_id": "ChIJ...",
  "name": "맛집명",
  "short_address": "지역명",
  "category": "면류",
  "action": "register",
  "memo": "메모 (선택)"
}
```

**Response**
```json
{
  "success": true,
  "message": "히스토리가 추가되었습니다.",
  "data": {
    "seq": 9,
    "place_id": "ChIJ...",
    "name": "맛집명",
    "short_address": "지역명",
    "category": "면류",
    "registered_by": 2,
    "registered_by_name": "박병철",
    "registered_at": "2024-01-15T11:00:00.000Z",
    "action": "register"
  }
}
```

---

## 에러 응답 형식

모든 API는 에러 발생 시 다음 형식으로 응답합니다:

```json
{
  "success": false,
  "error": "에러 메시지"
}
```

**HTTP 상태 코드**
| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 (필수 파라미터 누락 등) |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 오류 |

---

## 역지오코딩 API

### POST /api/reverse-geocode
좌표를 주소로 변환 (Google Geocoding API)

**Request Body**
```json
{
  "lat": 25.055701,
  "lng": 121.519953
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "address": "3F4M+5G6 大安區 臺北市 대만",
    "formatted_address": "No. 123, Section 4, Zhongxiao East Road, Da'an District, Taipei City, Taiwan 106",
    "plus_code": "3F4M+5G6 大安區 臺北市 대만",
    "global_code": "7QQ23F4M+5G6",
    "coordinates": { "lat": 25.055701, "lng": 121.519953 },
    "place_id": "ChIJ..."
  }
}
```

**특징**
- **Plus Code 우선 반환**: `compound_code`를 기본 주소로 사용
- Plus Code는 Google Maps에서 직접 검색 가능한 형식
- Plus Code가 없으면 `formatted_address` 사용

**에러 응답**
```json
{
  "success": false,
  "error": "API 권한이 거부되었습니다. Geocoding API가 활성화되어 있는지 확인해주세요.",
  "details": "REQUEST_DENIED"
}
```

**유효성 검사**
- 위도: -90 ~ 90
- 경도: -180 ~ 180

---

## Google Place Details API

### POST /api/google-place-details
장소 상세 정보 조회

**Request Body**
```json
{
  "placeId": "ChIJ..."
}
```
또는
```json
{
  "query": "장소 검색어"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "place_id": "ChIJ...",
    "name": "장소명",
    "address": "주소",
    "coordinates": { "lat": 25.0, "lng": 121.5 },
    "rating": 4.5,
    "reviews_count": 100,
    "price_level": 2,
    "price_level_text": "보통 (NT$100~300)",
    "phone_number": "+886...",
    "opening_hours": ["월: 10:00-22:00", ...],
    "photos": ["https://..."],
    "website": "https://...",
    "google_map_url": "https://maps.google.com/...",
    "suggested_category": "밥류",
    "types": ["restaurant", "food"]
  }
}
```

---

### GET /api/google-place-details
장소 검색 (자동완성)

**Query Parameters**
| 파라미터 | 필수 | 설명 |
|---------|------|------|
| q | O | 검색어 |
| mode | X | "textsearch" - 리뷰 수 포함 검색 |

**Response (기본 - Autocomplete)**
```json
{
  "results": [
    {
      "place_id": "ChIJ...",
      "description": "장소명, 주소",
      "name": "장소명",
      "secondary_text": "주소"
    }
  ]
}
```

**Response (mode=textsearch)**
```json
{
  "results": [
    {
      "place_id": "ChIJ...",
      "name": "장소명",
      "address": "주소",
      "coordinates": { "lat": 25.0, "lng": 121.5 },
      "rating": 4.5,
      "reviews_count": 100
    }
  ]
}
```

---

## 화장실 찾기 API

### GET /api/seven-eleven-toilet
7-ELEVEN 화장실 매장 검색 (MongoDB 기반)

**Query Parameters**
| 파라미터 | 필수 | 설명 |
|---------|------|------|
| lat | O | 위도 |
| lng | O | 경도 |
| limit | X | 최대 결과 수 (기본: 5) |
| maxDistance | X | 최대 거리 km (기본: 2) |

**Response**
```json
{
  "success": true,
  "data": [
    {
      "poi_id": "123456",
      "name": "古亭門市",
      "address": "台北市中正區羅斯福路二段33號",
      "city": "台北市",
      "district": "中正區",
      "coordinates": { "lat": 25.0267, "lng": 121.5224 },
      "phone": "02-23921234",
      "opening_hours": "00:00-24:00",
      "services": ["02廁所", "03ATM"],
      "has_toilet": true,
      "distance": 0.35,
      "distance_text": "350m",
      "google_maps_directions_url": "https://www.google.com/maps/dir/..."
    }
  ],
  "total": 5,
  "user_location": { "lat": 25.0267, "lng": 121.5224 }
}
```

---

### GET /api/familymart-toilet
FamilyMart 매장 검색 (MongoDB 기반)

**Query Parameters**
| 파라미터 | 필수 | 설명 |
|---------|------|------|
| lat | O | 위도 |
| lng | O | 경도 |
| limit | X | 최대 결과 수 (기본: 5) |
| maxDistance | X | 최대 거리 km (기본: 2) |

**Response**
```json
{
  "success": true,
  "data": [
    {
      "place_id": "ChIJ...",
      "name": "全家便利商店 古亭店",
      "address": "106台北市大安區羅斯福路二段33號",
      "city": "台北市",
      "district": "大安區",
      "coordinates": { "lat": 25.0267, "lng": 121.5224 },
      "opening_hours": { "open_now": true },
      "distance": 0.25,
      "distance_text": "250m",
      "google_maps_directions_url": "https://www.google.com/maps/dir/..."
    }
  ],
  "total": 5,
  "user_location": { "lat": 25.0267, "lng": 121.5224 }
}
```

---

## Cron Jobs API

### GET /api/cron/refresh-reviews
사용자 등록 맛집의 Google 리뷰 정보 갱신

**인증**: `Authorization: Bearer {CRON_SECRET}` 또는 `?key=init-reviews-2026`

**Response**
```json
{
  "success": true,
  "message": "리뷰 갱신 완료",
  "timestamp": "2025-01-21T06:00:00.000Z",
  "duration": "12.5s",
  "results": {
    "total": 50,
    "updated": 48,
    "failed": 2
  }
}
```

---

### GET /api/cron/sync-seven-eleven
7-ELEVEN 매장 동기화 (공식 API)

**인증**: `Authorization: Bearer {CRON_SECRET}` 또는 `?key=init-seven-eleven-2026`

**Query Parameters**
| 파라미터 | 필수 | 설명 |
|---------|------|------|
| district | X | 특정 구 ID (예: tp01, nt15) |
| batch | X | 배치 번호 (0-8, 5개 구씩 처리) |
| city | X | 도시 필터 (taipei, newtaipei) |

**Response**
```json
{
  "success": true,
  "message": "7-ELEVEN 배치 동기화 완료",
  "timestamp": "2025-01-21T22:00:00.000Z",
  "duration": "45.2s",
  "results": {
    "batch": 0,
    "nextBatch": 1,
    "totalDistricts": 41,
    "districts": [
      {
        "district": "松山區",
        "city": "台北市",
        "total": 120,
        "withToilet": 45,
        "added": 3,
        "updated": 42
      }
    ]
  }
}
```

---

### GET /api/cron/sync-familymart
FamilyMart 매장 동기화 (Google Places API)

**인증**: `Authorization: Bearer {CRON_SECRET}` 또는 `?key=init-familymart-2026`

**Query Parameters**
| 파라미터 | 필수 | 설명 |
|---------|------|------|
| district | X | 특정 구 ID (예: tp01, nt15) |
| batch | X | 배치 번호 (0-20, 2개 구씩 처리) |
| city | X | 도시 필터 (taipei, newtaipei) |

**Response**
```json
{
  "success": true,
  "message": "FamilyMart 배치 동기화 완료",
  "timestamp": "2025-01-21T23:00:00.000Z",
  "duration": "30.5s",
  "results": {
    "batch": 0,
    "nextBatch": 1,
    "totalDistricts": 41,
    "districts": [
      {
        "district": "松山區",
        "city": "台北市",
        "total": 25,
        "added": 5,
        "updated": 20
      }
    ]
  }
}
```
