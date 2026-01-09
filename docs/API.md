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
