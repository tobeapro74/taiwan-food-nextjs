/**
 * 타이베이 지역(구) 관련 유틸리티 함수
 */

/**
 * 타이베이 12개 구 + 기타 지역 정보
 */
export const DISTRICT_INFO: Record<string, { name: string; description: string }> = {
  // 타이베이 12구
  "중정구": {
    name: "중정구 (Zhongzheng)",
    description: "중정기념당과 타이베이 메인스테이션이 위치하고 있으며 시먼딩, 중산 상권과 가까이에 있어 교통과 관광의 중심지입니다."
  },
  "다안구": {
    name: "다안구 (Da'an)",
    description: "융캉제가 자리해 있으며 카페와 맛집이 밀집된 지역으로, 젊은 여행자들에게 인기 있는 감성 거리입니다."
  },
  "신이구": {
    name: "신이구 (Xinyi)",
    description: "타이베이 101타워와 대형 쇼핑몰이 모여 있는 금융·상업 중심지로, 야경과 쇼핑을 동시에 즐길 수 있습니다."
  },
  "완화구": {
    name: "완화구 (Wanhua)",
    description: "시먼딩이 위치해 있으며 젊은 층과 관광객이 모이는 패션·문화 거리입니다. 용산사 같은 전통 명소도 함께 있습니다."
  },
  "중산구": {
    name: "중산구 (Zhongshan)",
    description: "중산 카페거리와 세련된 바, 호텔이 밀집해 있어 감성 여행과 나이트라이프를 즐기기에 적합합니다."
  },
  "스린구": {
    name: "스린구 (Shilin)",
    description: "타이베이 최대 규모의 스린 야시장과 국립고궁박물원이 위치해 있어 먹거리와 문화 체험을 동시에 즐길 수 있습니다."
  },
  "베이터우구": {
    name: "베이터우구 (Beitou)",
    description: "온천으로 유명한 지역으로, 온천 호텔과 베이터우 도서관이 있어 힐링 여행에 적합합니다."
  },
  "송산구": {
    name: "송산구 (Songshan)",
    description: "송산공항과 라오허제 야시장이 위치해 있으며, 교통이 편리하고 야시장 먹거리 탐방에 좋은 곳입니다."
  },
  "다퉁구": {
    name: "다퉁구 (Datong)",
    description: "디화제가 자리해 있으며 전통시장과 한약방, 건축물이 많아 대만의 옛 정취를 느낄 수 있습니다."
  },
  "네이후구": {
    name: "네이후구 (Neihu)",
    description: "IT 기업과 주거지역이 밀집해 있으며, 대형 쇼핑몰과 호수 공원이 있어 현지인 생활을 체험할 수 있습니다."
  },
  "난강구": {
    name: "난강구 (Nangang)",
    description: "난강 전시센터와 IT 산업 단지가 위치해 있으며, 대형 콘서트와 박람회가 자주 열리는 지역입니다."
  },
  "원산구": {
    name: "원산구 (Wenshan)",
    description: "마오콩 곤돌라와 동물원이 있어 자연과 함께하는 여행에 적합하며, 가족 단위 관광객에게 인기가 많습니다."
  },
  // 신베이시
  "단수이": {
    name: "단수이 (Tamsui)",
    description: "신베이시에 위치한 해안 도시로, 석양이 아름다운 단수이 올드스트리트와 홍마오청이 유명합니다."
  },
  "싼충구": {
    name: "싼충구 (Sanchong)",
    description: "신베이시에 위치하며 타이베이와 인접해 있어 접근성이 좋고 현지인 맛집이 많습니다."
  },
};

/**
 * 위치 필드에서 지역명 추출
 * 예: "타이베이 시먼딩" → "시먼딩"
 *     "타이베이 중산구 린동팡" → "중산구"
 *     "단수이" → "단수이"
 */
export function extractRegion(location: string): string {
  if (!location) return "기타";

  let region = location.trim();

  // "OO역"으로 끝나는 경우 먼저 처리 (도시명 제거 전에)
  if (region.endsWith("역") && region.length > 1) {
    return region;
  }

  // 도시명 목록 (제거 대상)
  const cities = ["타이베이", "신베이시"];

  // 도시명 제거
  for (const city of cities) {
    if (region.startsWith(city)) {
      region = region.slice(city.length).trim();
      break;
    }
  }

  // 영어 주소 처리 (예: "Jihe Rd, Shilin District")
  const districtMatch = region.match(/([\w']+)\s*District/i);
  if (districtMatch) {
    const districtName = districtMatch[1].replace(/'/g, "");
    const districtMap: Record<string, string> = {
      "Shilin": "스린",
      "Datong": "다퉁",
      "Zhongshan": "중산",
      "Xinyi": "신이",
      "Daan": "다안",
      "Da": "다안",
      "Wanhua": "완화",
      "Zhongzheng": "중정",
      "Beitou": "베이터우",
      "Songshan": "송산",
      "Neihu": "네이후",
      "Nangang": "난강",
      "Wenshan": "원산",
    };
    return districtMap[districtName] || districtMatch[1];
  }

  // 첫 번째 지역 단어 추출
  const parts = region.split(/[\s,]/);
  if (parts.length > 0 && parts[0]) {
    if (parts.length >= 2 && parts[1] === "야시장") {
      return `${parts[0]} 야시장`;
    }
    return parts[0];
  }

  return region || "기타";
}

/**
 * 지역명을 구(區) 단위로 정규화
 */
export function normalizeRegion(region: string): string {
  const lowerRegion = region.toLowerCase();

  const districtMap: Record<string, string> = {
    // 완화구
    "시먼딩": "완화구",
    "시먼": "완화구",
    "완화": "완화구",
    "완화구": "완화구",
    "룽산": "완화구",
    "wanhua": "완화구",
    "ximending": "완화구",

    // 다안구
    "융캉제": "다안구",
    "융캉": "다안구",
    "다안": "다안구",
    "다안구": "다안구",
    "동문": "다안구",
    "da'an": "다안구",
    "daan": "다안구",
    "an": "다안구",

    // 중산구
    "중산": "중산구",
    "중산구": "중산구",
    "린동팡": "중산구",
    "민성": "중산구",
    "zhongshan": "중산구",

    // 중정구
    "중정구": "중정구",
    "중정": "중정구",
    "타이베이역": "중정구",
    "역": "중정구",
    "중정기념당": "중정구",
    "난지창": "중정구",
    "난지창 야시장": "중정구",
    "zhongzheng": "중정구",

    // 신이구
    "신이": "신이구",
    "신이구": "신이구",
    "101": "신이구",
    "xinyi": "신이구",

    // 다퉁구
    "닝샤": "다퉁구",
    "닝샤 야시장": "다퉁구",
    "다퉁": "다퉁구",
    "다퉁구": "다퉁구",
    "디화제": "다퉁구",
    "츠펑가": "다퉁구",
    "datong": "다퉁구",

    // 스린구
    "스린": "스린구",
    "스린구": "스린구",
    "스린야시장": "스린구",
    "shilin": "스린구",

    // 베이터우구
    "베이터우": "베이터우구",
    "베이터우구": "베이터우구",
    "beitou": "베이터우구",

    // 송산구
    "송산": "송산구",
    "송산구": "송산구",
    "라오허제": "송산구",
    "라오허제 야시장": "송산구",
    "songshan": "송산구",

    // 네이후구
    "네이후": "네이후구",
    "네이후구": "네이후구",
    "neihu": "네이후구",

    // 난강구
    "난강": "난강구",
    "난강구": "난강구",
    "nangang": "난강구",

    // 원산구
    "원산": "원산구",
    "원산구": "원산구",
    "마오콩": "원산구",
    "wenshan": "원산구",

    // 신베이시
    "단수이": "단수이",
    "tamsui": "단수이",
    "danshui": "단수이",
    "싼충구": "싼충구",
    "싼충": "싼충구",
    "sanchong": "싼충구",
    "sanchon": "싼충구",
  };

  // Plus Code 패턴 감지
  if (/^[A-Z0-9]{4,}\+[A-Z0-9]+$/i.test(region)) {
    return "기타";
  }

  return districtMap[lowerRegion] || districtMap[region] || region;
}

/**
 * 맛집의 구(지역)를 가져오기
 */
export function getRestaurantDistrict(location: string): string {
  const rawRegion = extractRegion(location);
  return normalizeRegion(rawRegion);
}

/**
 * 유효한 구(지역)인지 확인
 */
export function isValidDistrict(district: string): boolean {
  return district !== "기타" && DISTRICT_INFO[district] !== undefined;
}
