// 대만 맛집 데이터
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Restaurant {
  이름: string;
  위치: string;
  특징: string;
  야시장?: string;
  평점?: number;
  리뷰수?: number;
  빌딩?: string;
  전화번호?: string;
  가격대?: string;
  coordinates?: Coordinates;
  // 영문 필드 (다국어 지원)
  name_en?: string;
  location_en?: string;
  feature_en?: string;
  building_en?: string;
  // 사용자 등록 맛집용 확장 필드
  place_id?: string;
  category?: string;
  registered_by?: number;
  feature?: string;
  phone_number?: string;
  opening_hours?: string[];
  google_map_url?: string;
  address?: string;
  google_rating?: number;
  google_reviews_count?: number;
}

export interface TaiwanFoodData {
  면류: Restaurant[];
  만두: Restaurant[];
  밥류: Restaurant[];
  탕류: Restaurant[];
  디저트: Restaurant[];
  길거리음식: Restaurant[];
  카페: Restaurant[];
  까르푸: Restaurant[];
  "갈만한 곳": Restaurant[];
  야시장별: Record<string, string[]>;
  도심투어: Record<string, Restaurant[]>;
}

export const taiwanFoodMap: TaiwanFoodData = {
  "면류": [
    {"이름": "아종면선", "name_en": "Ay-Chung Flour Rice Noodles", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "걸쭉한 국물의 면선으로 유명한 맛집", "feature_en": "Famous for thick vermicelli soup with intestines", "평점": 4.5, "리뷰수": 12500, "coordinates": {"lat": 25.0425, "lng": 121.5079}},
    {"이름": "융캉우육면", "name_en": "Yong Kang Beef Noodle", "위치": "타이베이 융캉제", "location_en": "Taipei, Yongkang Street", "특징": "50년 전통의 대만 우육면 대명사, 홍샤오(빨간국물)와 칭뚠(맑은국물) 선택 가능", "feature_en": "50-year legacy beef noodle icon; choose braised red or clear broth", "평점": 4.6, "리뷰수": 28000, "전화번호": "+886 2 2351 1051", "가격대": "NT$200~400", "coordinates": {"lat": 25.0330, "lng": 121.5290}},
    {"이름": "금춘발우육면", "name_en": "Jin Chun Fa Beef Noodle", "위치": "타이베이 중산구", "location_en": "Taipei, Zhongshan", "특징": "100년 넘은 노포, 맑은 우육탕(칭뚠) 전문, 갈비탕과 비슷한 깊은 맛", "feature_en": "100+ year old shop specializing in clear beef broth, deep rib-like flavor", "평점": 4.5, "리뷰수": 15000, "coordinates": {"lat": 25.0527, "lng": 121.5207}},
    {"이름": "오가우육면", "name_en": "Oga Beef Noodle", "위치": "타이베이 베이터우", "location_en": "Taipei, Beitou", "특징": "백종원 추천, 내장우육면(牛三寶麵)이 시그니처, 온천 후 방문 추천", "feature_en": "Recommended by Baek Jong-won; signature triple beef noodle, great after hot springs", "평점": 4.4, "리뷰수": 8500, "coordinates": {"lat": 25.1365, "lng": 121.5068}},
    {"이름": "린동방우육면", "name_en": "Lin Dong Fang Beef Noodle", "위치": "타이베이 중산구 린동팡", "location_en": "Taipei, Zhongshan, Lindongfang", "특징": "현지인 줄서는 맛집, 얇게 썬 우육과 진한 홍샤오 국물", "feature_en": "Locals queue up; thinly sliced beef in rich braised broth", "평점": 4.5, "리뷰수": 12000, "coordinates": {"lat": 25.0485, "lng": 121.5330}},
    {"이름": "우육탕 로컬맛집", "name_en": "Local Beef Soup Shop", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "24시간 운영, 구글 4.2점 리뷰 1.7만개, 저렴하고 푸짐한 양", "feature_en": "Open 24 hours, affordable and generous portions with 17K+ reviews", "평점": 4.2, "리뷰수": 17000, "coordinates": {"lat": 25.0418, "lng": 121.5068}}
  ],
  "만두": [
    {"이름": "딩타이펑", "name_en": "Din Tai Fung", "위치": "타이베이 신이", "location_en": "Taipei, Xinyi", "특징": "세계적으로 유명한 샤오롱바오 전문점", "feature_en": "World-famous xiao long bao (soup dumpling) restaurant", "평점": 4.7, "리뷰수": 45000, "전화번호": "+886 2 2321 8928", "가격대": "NT$300~600", "빌딩": "신이 본점", "building_en": "Xinyi Main Branch", "coordinates": {"lat": 25.0339, "lng": 121.5645}},
    {"이름": "융캉제 딩타이펑", "name_en": "Din Tai Fung Yongkang", "위치": "타이베이 융캉제", "location_en": "Taipei, Yongkang Street", "특징": "융캉제에 위치한 딩타이펑 지점", "feature_en": "Din Tai Fung branch on Yongkang Street", "평점": 4.6, "리뷰수": 18000, "coordinates": {"lat": 25.0330, "lng": 121.5295}}
  ],
  "밥류": [
    {"이름": "진삼십 루로우판", "name_en": "Jin San Shi Lu Rou Fan", "위치": "타이베이 중산", "location_en": "Taipei, Zhongshan", "특징": "루로우판 전문점, 진하고 달콤한 간장 돼지고기 덮밥", "feature_en": "Braised pork rice specialist with rich sweet soy sauce", "평점": 4.4, "리뷰수": 6200, "coordinates": {"lat": 25.0527, "lng": 121.5207}},
    {"이름": "금봉 루로우판", "name_en": "Jin Feng Lu Rou Fan", "위치": "타이베이 중산구", "location_en": "Taipei, Zhongshan", "특징": "미슐랭 빕구르망 선정, 현지인이 사랑하는 루로우판", "feature_en": "Michelin Bib Gourmand; beloved braised pork rice by locals", "평점": 4.5, "리뷰수": 9800, "coordinates": {"lat": 25.0485, "lng": 121.5220}},
    {"이름": "후지산 루로우판", "name_en": "Fuji Mountain Lu Rou Fan", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "시먼딩 대표 루로우판 맛집, 짭조름하고 고소한 맛", "feature_en": "Ximending's signature braised pork rice, savory and nutty", "평점": 4.3, "리뷰수": 5400, "coordinates": {"lat": 25.0430, "lng": 121.5072}},
    {"이름": "마이 루로우판", "name_en": "My Lu Rou Fan", "위치": "타이베이 융캉제", "location_en": "Taipei, Yongkang Street", "특징": "융캉제 인기 루로우판, 부드러운 삼겹살 조림", "feature_en": "Popular braised pork rice on Yongkang Street, tender pork belly", "평점": 4.2, "리뷰수": 3200, "coordinates": {"lat": 25.0325, "lng": 121.5285}},
    {"이름": "자이 지로우판", "name_en": "Jia Yi Ji Rou Fan", "위치": "타이베이 중정구", "location_en": "Taipei, Zhongzheng", "특징": "자이 스타일 닭고기덮밥, 담백하고 고소한 닭기름 소스", "feature_en": "Chiayi-style chicken rice with light and savory chicken oil sauce", "평점": 4.1, "리뷰수": 2800, "coordinates": {"lat": 25.0325, "lng": 121.5180}},
    {"이름": "류지아 지로우판", "name_en": "Liu Jia Ji Rou Fan", "위치": "타이베이 중산구", "location_en": "Taipei, Zhongshan", "특징": "현지인 추천 지로우판, 잘게 찢은 닭고기와 특제 소스", "feature_en": "Local favorite chicken rice with shredded chicken and special sauce", "평점": 4.3, "리뷰수": 4100, "coordinates": {"lat": 25.0530, "lng": 121.5215}},
    {"이름": "민성 지로우판", "name_en": "Min Sheng Ji Rou Fan", "위치": "타이베이 민성", "location_en": "Taipei, Minsheng", "특징": "50년 전통 지로우판 맛집, 부드러운 닭고기", "feature_en": "50-year old chicken rice restaurant with tender chicken", "평점": 4.4, "리뷰수": 5600, "coordinates": {"lat": 25.0580, "lng": 121.5350}},
    {"이름": "콩로우판 전문점", "name_en": "Kong Rou Fan", "위치": "타이베이 닝샤", "location_en": "Taipei, Ningxia", "특징": "큼직한 오겹살 찜 덮밥, 든든한 한 끼", "feature_en": "Hearty braised pork belly rice bowl", "평점": 4.0, "리뷰수": 1800, "coordinates": {"lat": 25.0558, "lng": 121.5155}},
    {"이름": "타이베이역 비엔당", "name_en": "Taipei Station Biandang", "위치": "타이베이역", "location_en": "Taipei Main Station", "특징": "대만 철도 도시락, 파이구판(돼지갈비 덮밥) 유명", "feature_en": "Taiwan railway lunchbox, famous for pork chop rice", "평점": 4.2, "리뷰수": 7500, "coordinates": {"lat": 25.0478, "lng": 121.5170}},
    {"이름": "푸항 또우장", "name_en": "Fu Hang Dou Jiang", "위치": "타이베이 다안구", "location_en": "Taipei, Da'an", "특징": "퐌투안(대만식 주먹밥)과 또우장 아침 전문점", "feature_en": "Iconic breakfast spot for fan tuan (rice roll) and soy milk", "평점": 4.5, "리뷰수": 11000, "coordinates": {"lat": 25.0330, "lng": 121.5430}},
    {"이름": "아랑 기름밥", "name_en": "A-Lang You Fan", "위치": "타이베이 중산구", "location_en": "Taipei, Zhongshan", "특징": "여우판(기름밥) 전문, 찹쌀에 표고버섯과 돼지고기", "feature_en": "Oil rice specialist with sticky rice, shiitake mushrooms, and pork", "평점": 4.1, "리뷰수": 2400, "coordinates": {"lat": 25.0520, "lng": 121.5210}},
    {"이름": "닝샤 미까오", "name_en": "Ningxia Mi Gao", "위치": "타이베이 닝샤 야시장", "location_en": "Taipei, Ningxia Night Market", "특징": "찹쌀을 원통형으로 쪄낸 미까오, 찰진 식감", "feature_en": "Cylindrical steamed sticky rice cake with chewy texture", "야시장": "닝샤 야시장", "평점": 4.0, "리뷰수": 1500, "coordinates": {"lat": 25.0558, "lng": 121.5155}},
    {"이름": "스린 퐌투안", "name_en": "Shilin Fan Tuan", "위치": "타이베이 스린", "location_en": "Taipei, Shilin", "특징": "대만식 주먹밥, 요우티아오와 러우쑹이 들어간 든든한 아침", "feature_en": "Taiwanese rice roll with fried dough stick and pork floss for breakfast", "평점": 4.2, "리뷰수": 3800, "coordinates": {"lat": 25.0875, "lng": 121.5245}},
    {"이름": "영강 파이구판", "name_en": "Yongkang Pai Gu Fan", "위치": "타이베이 융캉제", "location_en": "Taipei, Yongkang Street", "특징": "바삭한 돼지갈비 덮밥, 특제 양념이 일품", "feature_en": "Crispy pork chop rice with special seasoning", "평점": 4.3, "리뷰수": 4500, "coordinates": {"lat": 25.0328, "lng": 121.5292}},
    {"이름": "철판볶음밥 전문", "name_en": "Teppanyaki Fried Rice", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "대만식 철판볶음밥, 다양한 토핑 선택 가능", "feature_en": "Taiwanese teppanyaki fried rice with various toppings", "평점": 4.0, "리뷰수": 2100, "coordinates": {"lat": 25.0420, "lng": 121.5078}},
    {"이름": "진다 루러우판", "name_en": "Jin Da Lu Rou Fan", "위치": "신베이시 싼충구 다런스트리트 40호", "location_en": "New Taipei, Sanchong, Daren St. 40", "특징": "현지인 사랑받는 루러우판 맛집", "feature_en": "Beloved braised pork rice restaurant among locals", "coordinates": {"lat": 25.0620, "lng": 121.4880}}
  ],
  "탕류": [
    {"이름": "잔지 마라훠궈", "name_en": "Zhan Ji Mala Hot Pot", "위치": "타이베이 다안구", "location_en": "Taipei, Da'an", "특징": "현지인 No.1 마라훠궈, 레트로 인테리어, 오리선지와 두부가 시그니처 (예약 필수)", "feature_en": "Locals' #1 mala hot pot; retro interior, duck blood & tofu signature (reservation required)", "평점": 4.7, "리뷰수": 25000, "coordinates": {"lat": 25.0280, "lng": 121.5430}},
    {"이름": "하이디라오 신이점", "name_en": "Haidilao Xinyi", "위치": "타이베이 101 근처 신이구", "location_en": "Taipei, Xinyi (near Taipei 101)", "특징": "4가지 육수 선택, 면 뽑기 퍼포먼스와 변검쇼, 하겐다즈 무한리필", "feature_en": "4 broth options, noodle pulling show & face-changing performance, unlimited Häagen-Dazs", "평점": 4.5, "리뷰수": 32000, "전화번호": "+886 2 8780 1107", "가격대": "NT$600~1,000", "빌딩": "ATT 4 FUN", "building_en": "ATT 4 FUN", "coordinates": {"lat": 25.0350, "lng": 121.5670}},
    {"이름": "우라오 훠궈", "name_en": "Wulao Hot Pot", "위치": "타이베이 중정구", "location_en": "Taipei, Zhongzheng", "특징": "고급 훠궈 레스토랑, 한국어 메뉴판, 두부 아이스크림이 시그니처", "feature_en": "Premium hot pot with Korean menu, signature tofu ice cream", "평점": 4.6, "리뷰수": 18000, "coordinates": {"lat": 25.0380, "lng": 121.5295}},
    {"이름": "딩왕 마라훠궈", "name_en": "Ding Wang Mala Hot Pot", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "야시장에서 시작된 유명 체인, 신배추 백탕과 오리선지 홍탕, 무제한 리필", "feature_en": "Famous chain from night markets; cabbage white broth & duck blood red broth, unlimited refills", "평점": 4.4, "리뷰수": 14000, "coordinates": {"lat": 25.0425, "lng": 121.5075}},
    {"이름": "원딩 마라훠궈", "name_en": "Yuan Ding Mala Hot Pot", "위치": "타이베이 시먼딩 Xining Rd 157호", "location_en": "Taipei, Ximending, Xining Rd 157", "특징": "퀄리티 높은 고기, 하겐다즈 무제한, 오전 11:30~자정 운영", "feature_en": "High-quality meat, unlimited Häagen-Dazs, open 11:30AM to midnight", "평점": 4.3, "리뷰수": 8500, "coordinates": {"lat": 25.0420, "lng": 121.5065}},
    {"이름": "우유훠궈", "name_en": "Milk Hot Pot", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "대만에서만 맛볼 수 있는 특별한 우유 육수 훠궈, 고소하고 담백한 맛", "feature_en": "Unique milk broth hot pot only in Taiwan, creamy and light", "평점": 4.4, "리뷰수": 9200, "coordinates": {"lat": 25.0418, "lng": 121.5070}},
    {"이름": "청화자오 광푸남점 (青花驕)", "name_en": "Qing Hua Jiao Guangfu South", "위치": "타이베이 다안구 광푸남로 100호", "location_en": "Taipei, Da'an, Guangfu S. Rd 100", "특징": "왕품그룹 마라훠궈, 청화초 마라탕과 산채백육과 유명, 국부기념관역 근처", "feature_en": "Wangpin Group mala hot pot; famous for Sichuan pepper broth, near Sun Yat-sen Memorial", "전화번호": "+886 2 8772 0659", "가격대": "NT$500~1,000", "빌딩": "광푸남로 100호", "building_en": "Guangfu S. Rd 100", "coordinates": {"lat": 25.0440, "lng": 121.5576}}
  ],
  "디저트": [
    {"이름": "스무시 하우스", "name_en": "Smoothie House", "위치": "타이베이 스린", "location_en": "Taipei, Shilin", "특징": "유명한 망고빙수 전문점", "feature_en": "Famous mango shaved ice shop", "평점": 4.4, "리뷰수": 8200, "전화번호": "+886 2 2881 5555", "가격대": "NT$150~300", "빌딩": "스린역 인근", "building_en": "Near Shilin Station", "coordinates": {"lat": 25.0875, "lng": 121.5245}},
    {"이름": "아이메이 홍두빙", "name_en": "A-Mei Red Bean Shaved Ice", "위치": "단수이", "location_en": "Tamsui", "특징": "유명한 팥빙수 전문점", "feature_en": "Famous red bean shaved ice shop", "야시장": "단수이 야시장", "평점": 4.3, "리뷰수": 5600, "전화번호": "+886 2 2621 3386", "가격대": "NT$50~120", "빌딩": "단수이 라오제", "building_en": "Tamsui Old Street", "coordinates": {"lat": 25.1690, "lng": 121.4400}},
    {"이름": "싸우더우화", "name_en": "Sao Dou Hua", "위치": "타이베이 다안구", "location_en": "Taipei, Da'an", "특징": "대만식 두부 디저트 전문점", "feature_en": "Taiwanese tofu pudding dessert shop", "평점": 4.2, "리뷰수": 3400, "가격대": "NT$40~80", "coordinates": {"lat": 25.0440, "lng": 121.5530}},
    {"이름": "우유튀김", "name_en": "Fried Milk", "위치": "No. 7-1號, Jihe Rd, Shilin District, Taipei", "location_en": "Jihe Rd, Shilin District, Taipei", "특징": "튀긴 우유", "feature_en": "Deep-fried milk dessert", "야시장": "스린 야시장", "평점": 4.1, "리뷰수": 2800, "가격대": "NT$50~100", "빌딩": "스린 야시장 지하", "building_en": "Shilin Night Market Underground", "coordinates": {"lat": 25.0878, "lng": 121.5242}},
    {"이름": "샤오황 따빠처우", "name_en": "Xiao Huang Sweet Potato Balls", "위치": "스린야시장 내", "location_en": "Inside Shilin Night Market", "특징": "고구마볼", "feature_en": "Sweet potato balls", "야시장": "스린 야시장", "평점": 4.0, "리뷰수": 1900, "가격대": "NT$50~80", "빌딩": "스린 야시장 노점", "building_en": "Shilin Night Market Stall", "coordinates": {"lat": 25.0876, "lng": 121.5248}},
    {"이름": "류유지 타로볼 튀김", "name_en": "Liu Yu Zi Fried Taro Balls", "위치": "타이베이 닝샤 야시장 91번 노점", "location_en": "Taipei, Ningxia Night Market Stall 91", "특징": "미슐랭 추천, 바삭하고 고소한 타로볼 튀김", "feature_en": "Michelin recommended; crispy and nutty fried taro balls", "야시장": "닝샤 야시장", "평점": 4.5, "리뷰수": 7800, "가격대": "NT$50~100", "빌딩": "닝샤 야시장 91번", "building_en": "Ningxia Night Market Stall 91", "coordinates": {"lat": 25.0560, "lng": 121.5152}},
    {"이름": "고구마볼", "name_en": "Sweet Potato Balls", "위치": "타이베이 닝샤 야시장 초입 2번 노점", "location_en": "Taipei, Ningxia Night Market Stall 2", "특징": "오리지널, 치즈, 초콜릿 등 다양한 맛의 고구마볼", "feature_en": "Sweet potato balls in original, cheese, chocolate and more flavors", "야시장": "닝샤 야시장", "평점": 4.2, "리뷰수": 4100, "가격대": "NT$50~80", "빌딩": "닝샤 야시장 2번", "building_en": "Ningxia Night Market Stall 2", "coordinates": {"lat": 25.0555, "lng": 121.5158}}
  ],
  "길거리음식": [
    {"이름": "하오따따 지파이", "name_en": "Hot Star Large Fried Chicken", "위치": "Jihe Rd, Shilin District", "location_en": "Shilin Night Market, Taipei", "특징": "대왕 지파이 (닭가슴살 튀김)", "feature_en": "Giant fried chicken cutlet", "야시장": "스린 야시장", "평점": 4.4, "리뷰수": 15000, "가격대": "NT$70~100", "빌딩": "스린 야시장 지하", "building_en": "Shilin Night Market Underground", "coordinates": {"lat": 25.0882, "lng": 121.5243}},
    {"이름": "왕자 치즈감자", "name_en": "Prince Cheese Potato", "위치": "No. 1, Jihe Rd, Shilin District", "location_en": "Shilin Night Market, Taipei", "특징": "치즈감자", "feature_en": "Baked potato loaded with cheese", "야시장": "스린 야시장", "평점": 4.2, "리뷰수": 6800, "가격대": "NT$80~150", "빌딩": "스린 야시장 지하", "building_en": "Shilin Night Market Underground", "coordinates": {"lat": 25.0879, "lng": 121.5245}},
    {"이름": "충성호 굴전", "name_en": "Zhong Cheng Hao Oyster Omelette", "위치": "Dadong Rd, Shilin District", "location_en": "Shilin Night Market, Taipei", "특징": "굴전, 오아첸", "feature_en": "Oyster omelette (o-a-jian)", "야시장": "스린 야시장", "평점": 4.3, "리뷰수": 8500, "가격대": "NT$60~100", "빌딩": "스린 야시장 다동로", "building_en": "Shilin Night Market, Dadong Rd", "coordinates": {"lat": 25.0873, "lng": 121.5250}},
    {"이름": "아훼이 면선", "name_en": "A-Hui Mian Xian", "위치": "스린야시장 내", "location_en": "Inside Shilin Night Market", "특징": "대만식 면선 (곱창국수)", "feature_en": "Taiwanese vermicelli with intestines", "야시장": "스린 야시장", "평점": 4.1, "리뷰수": 4200, "가격대": "NT$50~80", "빌딩": "스린 야시장 노점", "building_en": "Shilin Night Market Stall", "coordinates": {"lat": 25.0877, "lng": 121.5247}},
    {"이름": "위엔화볜 굴전", "name_en": "Yuan Hua Bian Oyster Omelette", "위치": "타이베이 닝샤 야시장 59번 부근", "location_en": "Taipei, Ningxia Night Market Stall 59", "특징": "현지인 강추, 굴이 풍부하고 촉촉한 굴 오믈렛", "feature_en": "Local favorite; rich oyster omelette with moist texture", "야시장": "닝샤 야시장", "평점": 4.4, "리뷰수": 6200, "가격대": "NT$60~100", "빌딩": "닝샤 야시장 59번", "building_en": "Ningxia Night Market Stall 59", "coordinates": {"lat": 25.0558, "lng": 121.5155}},
    {"이름": "지파이", "name_en": "Ji Pai (Fried Chicken)", "위치": "타이베이 닝샤 야시장 78번 노점", "location_en": "Taipei, Ningxia Night Market Stall 78", "특징": "대왕 지파이 (닭가슴살 튀김), 바삭한 튀김과 촉촉한 속살", "feature_en": "Giant fried chicken cutlet, crispy outside and juicy inside", "야시장": "닝샤 야시장", "평점": 4.2, "리뷰수": 3500, "가격대": "NT$70~100", "빌딩": "닝샤 야시장 78번", "building_en": "Ningxia Night Market Stall 78", "coordinates": {"lat": 25.0562, "lng": 121.5153}},
    {"이름": "샹창 찹쌀 소세지", "name_en": "Xiang Chang Sticky Rice Sausage", "위치": "타이베이 닝샤 야시장 59-2번 노점", "location_en": "Taipei, Ningxia Night Market Stall 59-2", "특징": "찹쌀과 소세지의 조화, 든든한 간식", "feature_en": "Sticky rice stuffed sausage, a hearty snack", "야시장": "닝샤 야시장", "평점": 4.0, "리뷰수": 2100, "가격대": "NT$50~80", "빌딩": "닝샤 야시장 59-2번", "building_en": "Ningxia Night Market Stall 59-2", "coordinates": {"lat": 25.0556, "lng": 121.5157}},
    {"이름": "오징어튀김", "name_en": "Fried Squid", "위치": "타이베이 닝샤 야시장 89번 노점", "location_en": "Taipei, Ningxia Night Market Stall 89", "특징": "바다향 가득, 바삭한 식감", "feature_en": "Crispy fried squid with ocean flavor", "야시장": "닝샤 야시장", "평점": 4.1, "리뷰수": 2800, "가격대": "NT$100~200", "빌딩": "닝샤 야시장 89번", "building_en": "Ningxia Night Market Stall 89", "coordinates": {"lat": 25.0565, "lng": 121.5150}},
    // 라오허제 야시장
    {"이름": "푸저우스주 후쟈오빙", "name_en": "Fuzhou Shizu Pepper Bun", "위치": "라오허제 야시장 입구 송산역 쪽", "location_en": "Raohe Night Market entrance, Songshan", "특징": "미쉐린 빕 구르망 선정, 화덕에 구운 후추빵, 겉은 바삭 속은 육즙 가득", "feature_en": "Michelin Bib Gourmand; oven-baked pepper bun, crispy outside with juicy filling", "야시장": "라오허제 야시장", "평점": 4.6, "리뷰수": 18000, "가격대": "NT$55~60", "빌딩": "라오허제 야시장 송산역 입구", "building_en": "Raohe Night Market Entrance, Songshan Station", "coordinates": {"lat": 25.0505, "lng": 121.5774}},
    {"이름": "라오허제 취두부", "name_en": "Raohe Stinky Tofu", "위치": "라오허제 야시장 내", "location_en": "Inside Raohe Night Market", "특징": "바삭하게 튀긴 취두부, 특제 소스와 절임채소 곁들임", "feature_en": "Crispy fried stinky tofu with special sauce and pickled vegetables", "야시장": "라오허제 야시장", "평점": 4.3, "리뷰수": 5200, "가격대": "NT$50~80", "빌딩": "라오허제 야시장 노점", "building_en": "Raohe Night Market Stall", "coordinates": {"lat": 25.0508, "lng": 121.5770}},
    {"이름": "약재갈비탕", "name_en": "Herbal Pork Rib Soup", "위치": "라오허제 야시장 내", "location_en": "Inside Raohe Night Market", "특징": "다양한 한약재를 넣고 푹 끓인 보양 갈비탕", "feature_en": "Slow-simmered pork rib soup with Chinese herbal medicine", "야시장": "라오허제 야시장", "평점": 4.4, "리뷰수": 6800, "가격대": "NT$100~180", "빌딩": "라오허제 야시장 노점", "building_en": "Raohe Night Market Stall", "coordinates": {"lat": 25.0510, "lng": 121.5768}},
    {"이름": "굴미선", "name_en": "Oyster Vermicelli", "위치": "라오허제 야시장 내", "location_en": "Inside Raohe Night Market", "특징": "굴과 곱창을 넣은 걸쭉한 국수, 굴 국수 동파호 인기", "feature_en": "Thick vermicelli with oysters and intestines", "야시장": "라오허제 야시장", "평점": 4.3, "리뷰수": 4500, "가격대": "NT$70~120", "빌딩": "라오허제 야시장 노점", "building_en": "Raohe Night Market Stall", "coordinates": {"lat": 25.0512, "lng": 121.5766}},
    {"이름": "라오허제 대왕오징어", "name_en": "Raohe Giant Squid", "위치": "라오허제 야시장 내", "location_en": "Inside Raohe Night Market", "특징": "큰 오징어 통튀김, 바삭한 식감", "feature_en": "Whole fried giant squid, crispy texture", "야시장": "라오허제 야시장", "평점": 4.2, "리뷰수": 3800, "가격대": "NT$150~250", "빌딩": "라오허제 야시장 노점", "building_en": "Raohe Night Market Stall", "coordinates": {"lat": 25.0515, "lng": 121.5763}},
    // 난지창 야시장
    {"이름": "산네이지러우", "name_en": "Shan Nei Ji Rou (Chicken Rice)", "위치": "난지창 야시장 내", "location_en": "Inside Nanjichang Night Market", "특징": "미쉐린 빕 구르망, 부드러운 닭고기밥(지러우판) 전문", "feature_en": "Michelin Bib Gourmand; tender chicken rice specialist", "야시장": "난지창 야시장", "평점": 4.5, "리뷰수": 8500, "가격대": "NT$60~100", "빌딩": "난지창 야시장 노점", "building_en": "Nanjichang Night Market Stall", "coordinates": {"lat": 25.0325, "lng": 121.5085}},
    {"이름": "린자오 루로우판", "name_en": "Lin Zhao Lu Rou Fan", "위치": "난지창 야시장 내", "location_en": "Inside Nanjichang Night Market", "특징": "야시장 최고 인기, 잘게 썬 돼지고기 덮밥, 느끼하지 않은 간장 맛", "feature_en": "Night market's most popular braised pork rice, light soy flavor", "야시장": "난지창 야시장", "평점": 4.6, "리뷰수": 12000, "가격대": "NT$40~70", "빌딩": "난지창 야시장 노점", "building_en": "Nanjichang Night Market Stall", "coordinates": {"lat": 25.0327, "lng": 121.5083}},
    {"이름": "퉁즈미가오", "name_en": "Tong Zi Mi Gao (Sticky Rice Cake)", "위치": "난지창 야시장 내", "location_en": "Inside Nanjichang Night Market", "특징": "찹쌀 케이크, 현지인 인기 TOP 3, 버섯과 샬롯 향", "feature_en": "Sticky rice cake, local top 3 favorite with mushroom and shallot aroma", "야시장": "난지창 야시장", "평점": 4.4, "리뷰수": 5600, "가격대": "NT$40~60", "빌딩": "난지창 야시장 노점", "building_en": "Nanjichang Night Market Stall", "coordinates": {"lat": 25.0323, "lng": 121.5087}},
    {"이름": "난지창 물만두", "name_en": "Nanjichang Boiled Dumplings", "위치": "난지창 야시장 물만두 골목", "location_en": "Nanjichang Night Market Dumpling Alley", "특징": "아량 만두집, 라이라이 물만두 등 물만두 전문 골목", "feature_en": "Dumpling alley with multiple boiled dumpling shops", "야시장": "난지창 야시장", "평점": 4.3, "리뷰수": 4200, "가격대": "NT$80~150", "빌딩": "난지창 야시장 물만두 골목", "building_en": "Nanjichang Night Market Dumpling Alley", "coordinates": {"lat": 25.0320, "lng": 121.5090}},
    {"이름": "주시에까오", "name_en": "Zhu Xie Gao (Pig Blood Cake)", "위치": "난지창 야시장 내", "location_en": "Inside Nanjichang Night Market", "특징": "55년 전통, 선지 찹쌀떡에 땅콩가루와 특제 양념", "feature_en": "55-year tradition; pig blood rice cake with peanut powder and special sauce", "야시장": "난지창 야시장", "평점": 4.4, "리뷰수": 3800, "가격대": "NT$40~60", "빌딩": "난지창 야시장 노점", "building_en": "Nanjichang Night Market Stall", "coordinates": {"lat": 25.0322, "lng": 121.5088}},
    {"이름": "난지창 룬빙", "name_en": "Nanjichang Run Bing (Veggie Roll)", "위치": "난지창 야시장 내", "location_en": "Inside Nanjichang Night Market", "특징": "2022 미쉐린 빕 구르망, 땅콩가루와 채소 가득한 채소롤", "feature_en": "2022 Michelin Bib Gourmand; vegetable roll with peanut powder", "야시장": "난지창 야시장", "평점": 4.5, "리뷰수": 6200, "가격대": "NT$50~80", "빌딩": "난지창 야시장 노점", "building_en": "Nanjichang Night Market Stall", "coordinates": {"lat": 25.0328, "lng": 121.5082}}
  ],
  "카페": [
    // 중산(Zhongshan) & 다퉁 구역 - 트렌디한 카페 거리
    {"이름": "미스 V 베이커리", "name_en": "Miss V Bakery", "위치": "타이베이 중산구 츠펑가", "location_en": "Taipei, Zhongshan, Chifeng St.", "특징": "시나몬 롤과 브런치로 유명, 현지 MZ세대의 성지", "feature_en": "Famous for cinnamon rolls and brunch, a Gen MZ hotspot", "평점": 4.5, "리뷰수": 8500, "전화번호": "+886 2 2521 5792", "가격대": "NT$150~350", "빌딩": "츠펑가 거리", "building_en": "Chifeng Street", "coordinates": {"lat": 25.0540, "lng": 121.5220}},
    {"이름": "멜로우 커피", "name_en": "Mellow Coffee", "위치": "타이베이 중산구", "location_en": "Taipei, Zhongshan", "특징": "복고풍 분위기에서 정성스러운 커피를 맛볼 수 있는 카페", "feature_en": "Retro-vibe cafe with carefully crafted coffee", "평점": 4.4, "리뷰수": 2100, "전화번호": "+886 2 2562 3388", "가격대": "NT$100~200", "빌딩": "중산구 골목", "building_en": "Zhongshan Alley", "coordinates": {"lat": 25.0535, "lng": 121.5215}},
    {"이름": "Monodon Coffee", "name_en": "Monodon Coffee", "위치": "타이베이 다퉁구 츠펑가", "location_en": "Taipei, Datong, Chifeng St.", "특징": "중산 카페거리의 인기 스페셜티 커피숍, 감성적인 인테리어", "feature_en": "Popular specialty coffee on Zhongshan cafe street, aesthetic interior", "평점": 4.5, "리뷰수": 1500, "가격대": "NT$120~200", "빌딩": "츠펑가 49항 10호", "building_en": "No.10, Lane 49, Chifeng St.", "coordinates": {"lat": 25.0545, "lng": 121.5195}},
    {"이름": "유지 차방", "name_en": "You Ji Tea House", "위치": "타이베이 다퉁구", "location_en": "Taipei, Datong", "특징": "100년 넘은 전통 찻집, 대만 우롱차의 역사를 느낄 수 있으며 선물용 차 구매 추천", "feature_en": "100+ year traditional tea house; experience oolong tea history, great for souvenir tea", "평점": 4.7, "리뷰수": 4800, "전화번호": "+886 2 2557 9591", "가격대": "NT$200~500", "빌딩": "유지 차업 본점", "building_en": "You Ji Tea Main Branch", "coordinates": {"lat": 25.0560, "lng": 121.5100}},

    // 다안(Da'an) & 융캉제 구역 - 깊이 있는 차 문화
    {"이름": "카페 리베로", "name_en": "Cafe Libero", "위치": "타이베이 융캉제", "location_en": "Taipei, Yongkang Street", "특징": "융캉제의 터줏대감, 고택을 개조한 곳으로 밤에는 바로 변신. 카푸치노 유명", "feature_en": "Yongkang Street veteran; renovated old house, transforms into bar at night. Famous cappuccino", "평점": 4.5, "리뷰수": 6200, "전화번호": "+886 2 2363 6092", "가격대": "NT$120~280", "빌딩": "융캉제 고택", "building_en": "Yongkang Street Heritage House", "coordinates": {"lat": 25.0330, "lng": 121.5292}},
    {"이름": "샤오미죠", "name_en": "Xiao Mi Jiu", "위치": "타이베이 다안구", "location_en": "Taipei, Da'an", "특징": "조용한 분위기의 라떼 아트 맛집, 독서하거나 작업하기 좋은 카페", "feature_en": "Quiet latte art cafe, perfect for reading or working", "평점": 4.3, "리뷰수": 1800, "전화번호": "+886 2 2707 5535", "가격대": "NT$100~200", "빌딩": "다안구 주택가", "building_en": "Da'an Residential Area", "coordinates": {"lat": 25.0280, "lng": 121.5350}},
    {"이름": "청전차관", "name_en": "Qing Tian Tea House", "위치": "타이베이 다안구 청전가", "location_en": "Taipei, Da'an, Qingtian St.", "특징": "일본식 목조 가옥에서 즐기는 품격 있는 다도 체험, 정원이 아름다운 찻집", "feature_en": "Elegant tea ceremony in a Japanese wooden house with beautiful garden", "평점": 4.8, "리뷰수": 5600, "전화번호": "+886 2 2391 1368", "가격대": "NT$300~600", "빌딩": "청전가 일본식 가옥", "building_en": "Qingtian St. Japanese House", "coordinates": {"lat": 25.0295, "lng": 121.5310}},
    {"이름": "소다재", "name_en": "Soda Zai", "위치": "타이베이 다안구", "location_en": "Taipei, Da'an", "특징": "현대적인 감각으로 대만차를 해석, 젊은 층에게 인기 있는 모던 찻집", "feature_en": "Modern take on Taiwanese tea, popular among young people", "평점": 4.4, "리뷰수": 2900, "전화번호": "+886 2 2700 5505", "가격대": "NT$150~350", "빌딩": "다안구 모던 빌딩", "building_en": "Da'an Modern Building", "coordinates": {"lat": 25.0270, "lng": 121.5380}},

    // 신이(Xinyi) 구역 - 화려한 전망과 프리미엄 커피
    {"이름": "심플 카파 솔라", "name_en": "Simple Kaffa Sola", "위치": "타이베이 101 빌딩 88층", "location_en": "Taipei 101, 88th Floor", "특징": "월드 바리스타 챔피언의 커피를 구름 위에서 즐기는 프리미엄 카페 (예약 필수)", "feature_en": "World Barista Champion's coffee above the clouds; premium cafe (reservation required)", "평점": 4.9, "리뷰수": 12000, "전화번호": "+886 2 8101 8898", "가격대": "NT$250~500", "빌딩": "타이베이 101", "building_en": "Taipei 101", "coordinates": {"lat": 25.0339, "lng": 121.5645}},
    {"이름": "% 아라비카", "name_en": "% Arabica", "위치": "타이베이 신이구 샹산", "location_en": "Taipei, Xinyi, Xiangshan", "특징": "심플한 디자인과 고소한 라떼로 유명, 항상 대기 줄이 있는 인기 카페", "feature_en": "Minimalist design with signature lattes, always a queue", "평점": 4.5, "리뷰수": 9800, "전화번호": "+886 2 2722 2085", "가격대": "NT$130~220", "빌딩": "샹산 입구", "building_en": "Xiangshan Entrance", "coordinates": {"lat": 25.0280, "lng": 121.5700}},
    {"이름": "트로포 커피", "name_en": "Tropo Coffee", "위치": "타이베이 신이구", "location_en": "Taipei, Xinyi", "특징": "세련된 인테리어와 함께 스페셜티 커피의 진수를 보여주는 카페", "feature_en": "Stylish interior showcasing the best of specialty coffee", "평점": 4.6, "리뷰수": 3400, "전화번호": "+886 2 2758 8683", "가격대": "NT$150~280", "빌딩": "신이구 상가", "building_en": "Xinyi Shopping Area", "coordinates": {"lat": 25.0350, "lng": 121.5620}},

    // 중정(Zhongzheng) 구역 - 월드 챔피언의 본진
    {"이름": "심플 카파 플래그십", "name_en": "Simple Kaffa Flagship", "위치": "타이베이 중정구 화산 1914", "location_en": "Taipei, Zhongzheng, Huashan 1914", "특징": "세계 최고의 카페로 선정된 곳, 다크 브라운 슈가 라떼가 시그니처 메뉴", "feature_en": "Named world's best cafe; signature dark brown sugar latte", "평점": 4.8, "리뷰수": 15000, "전화번호": "+886 2 2358 1829", "가격대": "NT$150~300", "빌딩": "화산 1914 창의문화원구", "building_en": "Huashan 1914 Creative Park", "coordinates": {"lat": 25.0445, "lng": 121.5295}},
    {"이름": "페이퍼 스트리트 커피", "name_en": "Paper Street Coffee", "위치": "타이베이 중정구 화산 1914 맞은편", "location_en": "Taipei, Zhongzheng, opposite Huashan 1914", "특징": "탁 트인 창밖 풍경을 보며 진한 커피를 즐기기 좋은 카페", "feature_en": "Great views through large windows with rich coffee", "평점": 4.4, "리뷰수": 2600, "전화번호": "+886 2 2395 6865", "가격대": "NT$120~250", "빌딩": "화산 1914 맞은편 건물", "building_en": "Building Opposite Huashan 1914", "coordinates": {"lat": 25.0448, "lng": 121.5290}},

    // 버블티 & 밀크티 전문점
    {"이름": "춘수당", "name_en": "Chun Shui Tang", "위치": "타이베이 중정기념당", "location_en": "Taipei, CKS Memorial Hall", "특징": "1983년 버블티(펄밀크티) 원조 브랜드, 대만 대표 찻집", "feature_en": "Original bubble tea brand since 1983, Taiwan's iconic tea house", "평점": 4.5, "리뷰수": 12000, "전화번호": "+886 2 2393 2699", "가격대": "NT$80~200", "빌딩": "중정기념당역 인근", "building_en": "Near CKS Memorial Hall Station", "coordinates": {"lat": 25.0325, "lng": 121.5180}},
    {"이름": "더앨리", "name_en": "The Alley", "위치": "타이베이 융캉제", "location_en": "Taipei, Yongkang Street", "특징": "흑당 버블티로 유명한 대만 밀크티 브랜드", "feature_en": "Famous Taiwanese milk tea brand known for brown sugar bubble tea", "평점": 4.4, "리뷰수": 15000, "전화번호": "+886 2 2321 6268", "가격대": "NT$60~120", "빌딩": "융캉제 거리", "building_en": "Yongkang Street", "coordinates": {"lat": 25.0328, "lng": 121.5288}},
    {"이름": "타이거슈가", "name_en": "Tiger Sugar", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "호랑이무늬 흑당 밀크티로 SNS 인기 폭발, 쫀득한 타피오카펄", "feature_en": "Tiger-striped brown sugar milk tea, viral on social media with chewy tapioca pearls", "평점": 4.5, "리뷰수": 22000, "전화번호": "+886 2 2388 5225", "가격대": "NT$55~90", "빌딩": "시먼딩 거리", "building_en": "Ximending Street", "coordinates": {"lat": 25.0418, "lng": 121.5081}},
    {"이름": "행복당", "name_en": "Xing Fu Tang", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "매장에서 직접 흑당을 볶아 만드는 수제 흑당 버블티, 컵에 호랑이 무늬처럼 흑당이 흐르는 비주얼", "feature_en": "Handmade brown sugar bubble tea roasted in-store; tiger-stripe brown sugar visual", "평점": 4.5, "리뷰수": 18000, "전화번호": "+886 2 2311 5765", "가격대": "NT$55~100", "빌딩": "시먼딩 거리", "building_en": "Ximending Street", "coordinates": {"lat": 25.0421, "lng": 121.5074}},
    {"이름": "밀크샵", "name_en": "Milk Shop", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "녹차 라떼, 타로 밀크티 유명, 신선한 우유 사용", "feature_en": "Known for matcha latte and taro milk tea with fresh milk", "평점": 4.4, "리뷰수": 11000, "전화번호": "+886 2 2331 8899", "가격대": "NT$50~100", "빌딩": "시먼딩 거리", "building_en": "Ximending Street", "coordinates": {"lat": 25.0415, "lng": 121.5070}},
    {"이름": "쩐주단", "name_en": "Zhen Zhu Dan", "위치": "타이베이 융캉제", "location_en": "Taipei, Yongkang Street", "특징": "흑당 버블티 원조 중 하나, 쫀득한 타피오카", "feature_en": "One of the original brown sugar bubble tea shops, chewy tapioca", "평점": 4.5, "리뷰수": 14000, "전화번호": "+886 2 2395 8080", "가격대": "NT$55~95", "빌딩": "융캉제 거리", "building_en": "Yongkang Street", "coordinates": {"lat": 25.0332, "lng": 121.5295}},
    {"이름": "우롱원", "name_en": "Wu Long Yuan", "위치": "타이베이 중산", "location_en": "Taipei, Zhongshan", "특징": "대만 우롱차 전문, 티 애호가들에게 인기", "feature_en": "Taiwanese oolong tea specialist, popular among tea enthusiasts", "평점": 4.4, "리뷰수": 5200, "전화번호": "+886 2 2581 6655", "가격대": "NT$60~120", "빌딩": "중산역 인근", "building_en": "Near Zhongshan Station", "coordinates": {"lat": 25.0527, "lng": 121.5207}}
  ],
  "까르푸": [
    {"이름": "까르푸 구이린점 (시먼딩)", "name_en": "Carrefour Guilin (Ximending)", "위치": "타이베이 완화구 Guilin Rd 1호", "location_en": "Taipei, Wanhua, Guilin Rd 1", "특징": "24시간 운영, 한국인 필수 방문지, 한글 안내판 완비, 샤오난먼역 1번출구 도보 5분", "feature_en": "Open 24h, must-visit for Koreans, Korean signage, 5 min walk from Xiaonanmen Station Exit 1", "평점": 4.3, "리뷰수": 18000, "전화번호": "+886 2 2388 9898", "빌딩": "구이린로 1호", "building_en": "Guilin Rd No.1", "coordinates": {"lat": 25.0380, "lng": 121.5050}},
    {"이름": "까르푸 중산점", "name_en": "Carrefour Zhongshan", "위치": "타이베이 다퉁구 Chongqing North Rd 171호", "location_en": "Taipei, Datong, Chongqing N. Rd 171", "특징": "중산역 근처 대형마트, 다양한 대만 기념품과 식료품", "feature_en": "Large supermarket near Zhongshan Station with Taiwanese souvenirs and groceries", "평점": 4.2, "리뷰수": 8500, "전화번호": "+886 2 2553 7899", "빌딩": "충칭북로 171호", "building_en": "Chongqing N. Rd No.171", "coordinates": {"lat": 25.0560, "lng": 121.5150}},
    {"이름": "까르푸 네이후점", "name_en": "Carrefour Neihu", "위치": "타이베이 네이후구", "location_en": "Taipei, Neihu", "특징": "타이베이 플래그십 매장, RT마트/이케아/코스트코 인접", "feature_en": "Taipei flagship store, near RT-Mart/IKEA/Costco", "평점": 4.4, "리뷰수": 12000, "전화번호": "+886 2 8791 8899", "빌딩": "네이후 쇼핑단지", "building_en": "Neihu Shopping Complex", "coordinates": {"lat": 25.0780, "lng": 121.5750}},
    {"이름": "까르푸 타이베이역점", "name_en": "Carrefour Taipei Station", "위치": "타이베이역 지하상가", "location_en": "Taipei Main Station Underground", "특징": "역 지하에 위치해 접근성 좋음, 여행 마지막 날 쇼핑에 최적", "feature_en": "Located underground at the station, perfect for last-day shopping", "평점": 4.1, "리뷰수": 6500, "전화번호": "+886 2 2311 8899", "빌딩": "타이베이역 지하 1층", "building_en": "Taipei Station B1", "coordinates": {"lat": 25.0475, "lng": 121.5165}}
  ],
  "갈만한 곳": [
    {"이름": "단수이", "name_en": "Tamsui", "위치": "신베이시 단수이구", "location_en": "New Taipei, Tamsui", "특징": "강가의 아름다운 해안 도시, 유명한 옛 거리와 맛집들이 많음", "feature_en": "Beautiful riverside coastal town with famous old streets and restaurants", "야시장": "단수이 야시장"},
    {"이름": "고양이마을 (후투엔)", "name_en": "Houtong Cat Village", "위치": "신베이시 루이팡구", "location_en": "New Taipei, Ruifang", "특징": "고양이들이 자유롭게 돌아다니는 아기자기한 마을", "feature_en": "Charming village where cats roam freely"},
    {"이름": "지우펀", "name_en": "Jiufen", "위치": "신베이시 루이팡구", "location_en": "New Taipei, Ruifang", "특징": "구릉 지대에 위치한 작은 산골마을, 카페와 갤러리가 많음", "feature_en": "Hillside mountain village with cafes and galleries"},
    {"이름": "예류", "name_en": "Yehliu Geopark", "위치": "신베이시 완리구", "location_en": "New Taipei, Wanli", "특징": "해안 절벽과 바위로 유명한 경관 명소", "feature_en": "Scenic spot famous for coastal cliffs and rock formations"},
    {"이름": "스펀", "name_en": "Shifen", "위치": "신베이시 루이팡구", "location_en": "New Taipei, Ruifang", "특징": "물이 뿜어나오는 특별한 지질 현상으로 유명", "feature_en": "Famous for sky lanterns and Shifen Waterfall"},
    {"이름": "용산사", "name_en": "Longshan Temple", "위치": "타이베이시 베이터우구", "location_en": "Taipei, Wanhua", "특징": "타이베이 최고의 절, 아름다운 중국식 건축물", "feature_en": "Taipei's finest temple with beautiful Chinese architecture"},
    {"이름": "중정기념당", "name_en": "CKS Memorial Hall", "위치": "타이베이시 중정구", "location_en": "Taipei, Zhongzheng", "특징": "타이완의 상징적인 건물, 넓은 광장과 아름다운 정원", "feature_en": "Taiwan's iconic landmark with spacious plaza and beautiful gardens"},
    {"이름": "융캉제", "name_en": "Yongkang Street", "위치": "타이베이시 다안구", "location_en": "Taipei, Da'an", "특징": "전통 대만 거리, 맛집과 쇼핑거리가 많은 번화가", "feature_en": "Traditional Taiwanese street with many restaurants and shops"},
    {"이름": "고궁박물관", "name_en": "National Palace Museum", "위치": "타이베이시 스린구", "location_en": "Taipei, Shilin", "특징": "세계 최대 규모의 중국 미술품 컬렉션", "feature_en": "World's largest collection of Chinese art"},
    {"이름": "타이베이 근교 온천", "name_en": "Taipei Hot Springs", "위치": "타이베이시 베이터우구/신베이시", "location_en": "Taipei, Beitou / New Taipei", "특징": "베이터우, 지룽 등 근교에 위치한 유명 온천 지역", "feature_en": "Famous hot spring areas in Beitou and surrounding New Taipei"},
    {"이름": "타이베이 101", "name_en": "Taipei 101", "위치": "타이베이시 신이구", "location_en": "Taipei, Xinyi", "특징": "타이베이의 랜드마크, 전망대와 쇼핑몰", "feature_en": "Taipei's landmark with observatory and shopping mall"}
  ],
  "야시장별": {
    "스린 야시장": ["하오따따 지파이", "왕자 치즈감자", "충성호 굴전", "우유튀김", "아훼이 면선", "샤오황 따빠처우", "스린 퐌투안"],
    "닝샤 야시장": ["류유지 타로볼 튀김", "위엔화볜 굴전", "지파이", "고구마볼", "샹창 찹쌀 소세지", "오징어튀김", "닝샤 미까오"],
    "단수이 야시장": ["아이메이 홍두빙"],
    "라오허제 야시장": ["푸저우스주 후쟈오빙", "라오허제 취두부", "약재갈비탕", "굴미선", "라오허제 대왕오징어"],
    "난지창 야시장": ["산네이지러우", "린자오 루로우판", "퉁즈미가오", "난지창 물만두", "주시에까오", "난지창 룬빙"]
  },
  "도심투어": {
    "시먼딩": [
      {"이름": "아종면선", "name_en": "Ay-Chung Flour Rice Noodles", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "걸쭉한 국물의 면선으로 유명한 맛집", "feature_en": "Famous for thick vermicelli soup"},
      {"이름": "행복당", "name_en": "Xing Fu Tang", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "유명한 타로 밀크티와 팥빙수 전문 디저트 찻집", "feature_en": "Famous taro milk tea and red bean shaved ice dessert shop"},
      {"이름": "삼형제빙수", "name_en": "Three Brothers Shaved Ice", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "망고빙수 맛집, 시먼딩 대표 빙수집", "feature_en": "Mango shaved ice hotspot, Ximending's signature dessert"},
      {"이름": "스무시 하우스 시먼딩점", "name_en": "Smoothie House Ximending", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "유명한 망고빙수 전문점", "feature_en": "Famous mango shaved ice shop"},
      {"이름": "시먼딩 펑차", "name_en": "Ximending Feng Cha", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "유명한 펄 밀크티 전문점", "feature_en": "Famous pearl milk tea shop"},
      {"이름": "시먼딩 차관", "name_en": "Ximending Tea House", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "전통 대만 찻집, 우롱차와 철관음 전문", "feature_en": "Traditional Taiwanese tea house, oolong and Tieguanyin specialty"},
      {"이름": "천천빙", "name_en": "Qian Qian Bing", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "대만 전통 찻집, 빙수와 디저트도 판매", "feature_en": "Traditional tea house with shaved ice and desserts"},
      {"이름": "시먼카페", "name_en": "Ximen Cafe", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "트렌디한 카페, 인스타 감성 사진 명소", "feature_en": "Trendy cafe, popular Instagram photo spot"},
      {"이름": "스타벅스 시먼딩점", "name_en": "Starbucks Ximending", "위치": "타이베이 시먼딩", "location_en": "Taipei, Ximending", "특징": "쇼핑 중 휴식하기 좋은 카페", "feature_en": "Great cafe for a shopping break"}
    ],
    "융캉제": [
      {"이름": "융캉우육면", "name_en": "Yong Kang Beef Noodle", "위치": "타이베이 융캉제", "location_en": "Taipei, Yongkang Street", "특징": "50년 전통의 대만 우육면 대명사, 홍샤오(빨간국물)와 칭뚠(맑은국물) 선택 가능", "feature_en": "50-year legacy beef noodle icon; choose braised red or clear broth", "전화번호": "+886 2 2351 1051", "가격대": "NT$200~400"},
      {"이름": "융캉제 딩타이펑", "name_en": "Din Tai Fung Yongkang", "위치": "타이베이 융캉제", "location_en": "Taipei, Yongkang Street", "특징": "유명한 샤오롱바오 전문점", "feature_en": "Famous xiao long bao (soup dumpling) restaurant"},
      {"이름": "옐로우 커피", "name_en": "Yellow Coffee", "위치": "타이베이 융캉제", "location_en": "Taipei, Yongkang Street", "특징": "브런치와 커피가 유명한 카페", "feature_en": "Popular cafe known for brunch and coffee"}
    ],
    "중산카페거리": [
      {"이름": "VWI by CHADWANG", "name_en": "VWI by CHADWANG", "위치": "타이베이 중산", "location_en": "Taipei, Zhongshan", "특징": "유명한 브런치 카페", "feature_en": "Famous brunch cafe"},
      {"이름": "Fika Fika Cafe", "name_en": "Fika Fika Cafe", "위치": "타이베이 중산", "location_en": "Taipei, Zhongshan", "특징": "원두 로스팅 전문 카페", "feature_en": "Coffee bean roasting specialty cafe"},
      {"이름": "Congrats Cafe", "name_en": "Congrats Cafe", "위치": "타이베이 중산", "location_en": "Taipei, Zhongshan", "특징": "예쁜 디저트와 커피가 유명한 카페", "feature_en": "Known for beautiful desserts and coffee"}
    ],
    "중정기념당": [
      {"이름": "춘수당", "name_en": "Chun Shui Tang", "위치": "타이베이 중정기념당", "location_en": "Taipei, CKS Memorial Hall", "특징": "버블티(펄밀크티) 원조 브랜드, 1983년 타이중에서 시작된 대만 대표 찻집", "feature_en": "Original bubble tea brand, Taiwan's iconic tea house since 1983 in Taichung"},
      {"이름": "중정기념당", "name_en": "CKS Memorial Hall", "위치": "타이베이시 중정구", "location_en": "Taipei, Zhongzheng", "특징": "타이완의 상징적인 건물, 넓은 광장과 아름다운 정원", "feature_en": "Taiwan's iconic landmark with spacious plaza and beautiful gardens"}
    ]
  }
};

// 카테고리 정보
export const categories = [
  { id: "전체", name: "전체", nameKey: "categories.all", icon: "🍽️" },
  { id: "면류", name: "면류", nameKey: "categories.noodles", icon: "🍜" },
  { id: "밥류", name: "밥류", nameKey: "categories.rice", icon: "🍚" },
  { id: "탕류", name: "탕류", nameKey: "categories.soup", icon: "🍲" },
  { id: "만두", name: "만두", nameKey: "categories.dumplings", icon: "🥟" },
  { id: "디저트", name: "디저트", nameKey: "categories.dessert", icon: "🍧" },
  { id: "길거리음식", name: "길거리", nameKey: "categories.street_food", icon: "🍢" },
  { id: "카페", name: "카페", nameKey: "categories.cafe", icon: "☕" },
  { id: "까르푸", name: "까르푸", nameKey: "categories.carrefour", icon: "🛒" },
];

// 야시장 정보
export const markets = [
  { id: "전체", name: "전체", nameKey: "market.all", icon: "🌙" },
  { id: "스린 야시장", name: "스린", nameKey: "market.shilin", icon: "🏮" },
  { id: "닝샤 야시장", name: "닝샤", nameKey: "market.ningxia", icon: "🏮" },
  { id: "라오허제 야시장", name: "라오허제", nameKey: "market.raohe", icon: "🏮" },
  { id: "난지창 야시장", name: "난지창", nameKey: "market.nanjichang", icon: "🏮" },
  { id: "단수이 야시장", name: "단수이", nameKey: "market.danshui", icon: "🏮" },
];

// 도심투어 지역
export const tourAreas = [
  { id: "전체", name: "전체", nameKey: "tour.all_areas", icon: "🏙️" },
  { id: "시먼딩", name: "시먼딩", nameKey: "tour.ximending", icon: "🛍️" },
  { id: "융캉제", name: "융캉제", nameKey: "tour.yongkang", icon: "☕" },
  { id: "중산카페거리", name: "중산카페", nameKey: "tour.zhongshan_cafe", icon: "🍰" },
  { id: "중정기념당", name: "중정기념당", nameKey: "tour.cks_memorial", icon: "🏛️" },
];

// place_id 생성 함수 (정적 데이터용)
export function generateStaticPlaceId(name: string, category: string): string {
  return `static_${name.replace(/\s+/g, '_').toLowerCase()}_${category}`;
}

// 유틸리티 함수
export function getAllRestaurants(): Restaurant[] {
  const all: Restaurant[] = [];
  const cats = ["면류", "만두", "밥류", "탕류", "디저트", "길거리음식", "카페", "까르푸"] as const;
  for (const cat of cats) {
    const restaurants = taiwanFoodMap[cat].map(r => ({
      ...r,
      place_id: generateStaticPlaceId(r.이름, cat),
      category: cat,
    }));
    all.push(...restaurants);
  }
  return all;
}

export function getRestaurantsByCategory(category: string): Restaurant[] {
  if (category === "전체") {
    return getAllRestaurants();
  }
  const restaurants = taiwanFoodMap[category as keyof typeof taiwanFoodMap] as Restaurant[] || [];
  return restaurants.map(r => ({
    ...r,
    place_id: generateStaticPlaceId(r.이름, category),
    category: category,
  }));
}

export function getRestaurantsByMarket(market: string): Restaurant[] {
  const allRestaurants: Record<string, { restaurant: Restaurant; category: string }> = {};
  const cats = ["면류", "만두", "밥류", "탕류", "디저트", "길거리음식", "카페", "까르푸"] as const;

  for (const cat of cats) {
    for (const rest of taiwanFoodMap[cat]) {
      allRestaurants[rest.이름] = { restaurant: rest, category: cat };
    }
  }

  if (market === "전체") {
    const items: Restaurant[] = [];
    const seen = new Set<string>();

    for (const marketName of Object.keys(taiwanFoodMap.야시장별)) {
      const names = taiwanFoodMap.야시장별[marketName] || [];
      for (const name of names) {
        if (!seen.has(name)) {
          seen.add(name);
          const data = allRestaurants[name];
          if (data) {
            items.push({
              ...data.restaurant,
              place_id: generateStaticPlaceId(name, data.category),
              category: data.category,
            });
          } else {
            items.push({ 이름: name, 위치: "", 특징: "", 야시장: marketName });
          }
        }
      }
    }
    return items;
  }

  const names = taiwanFoodMap.야시장별[market] || [];
  return names.map(name => {
    const data = allRestaurants[name];
    if (data) {
      return {
        ...data.restaurant,
        place_id: generateStaticPlaceId(name, data.category),
        category: data.category,
      };
    }
    return { 이름: name, 위치: "", 특징: "", 야시장: market };
  });
}

export function getRestaurantsByTour(area: string): Restaurant[] {
  if (area === "전체") {
    const items: Restaurant[] = [];
    const seen = new Set<string>();

    for (const areaName of Object.keys(taiwanFoodMap.도심투어)) {
      const restaurants = taiwanFoodMap.도심투어[areaName] || [];
      for (const rest of restaurants) {
        if (!seen.has(rest.이름)) {
          seen.add(rest.이름);
          items.push({
            ...rest,
            place_id: generateStaticPlaceId(rest.이름, '도심투어'),
            category: '도심투어',
          });
        }
      }
    }
    return items;
  }

  const restaurants = taiwanFoodMap.도심투어[area] || [];
  return restaurants.map(rest => ({
    ...rest,
    place_id: generateStaticPlaceId(rest.이름, '도심투어'),
    category: '도심투어',
  }));
}

export function getPlaces(): Restaurant[] {
  return taiwanFoodMap["갈만한 곳"].map(rest => ({
    ...rest,
    place_id: generateStaticPlaceId(rest.이름, '갈만한곳'),
    category: '갈만한곳',
  }));
}

// 인기 맛집 (카테고리별 최고 평점 맛집 1개씩)
export interface PopularRestaurant extends Restaurant {
  카테고리: string;
}

export function getPopularRestaurants(): PopularRestaurant[] {
  const cats = ["면류", "만두", "밥류", "탕류", "디저트", "길거리음식", "카페", "까르푸"] as const;
  const topByCategory: PopularRestaurant[] = [];

  for (const cat of cats) {
    const items = taiwanFoodMap[cat];
    if (items && items.length > 0) {
      // 각 카테고리에서 평점이 가장 높은 맛집 선택
      const sorted = [...items]
        .filter((r) => r.평점)
        .sort((a, b) => (b.평점 || 0) - (a.평점 || 0));
      if (sorted.length > 0) {
        topByCategory.push({
          ...sorted[0],
          카테고리: cat,
          place_id: generateStaticPlaceId(sorted[0].이름, cat),
          category: cat,
        });
      }
    }
  }

  return topByCategory;
}

// 시간대별 맛집 추천 (대만 시간 UTC+8 기준)
export interface TimeBasedRecommendation {
  timeSlot: string;
  emoji: string;
  greeting: string;
  gradient: string;
  restaurants: PopularRestaurant[];
}

const timeSlotConfig = [
  {
    name: "morning",
    range: [6, 11] as const,
    emoji: "🌅",
    greeting: "좋은 아침! 든든한 아침 맛집",
    gradient: "from-foreground to-foreground/90",
    categories: ["밥류"] as string[],
    keywords: ["또우장", "퐌투안", "브런치", "아침", "주먹밥", "브런치"],
  },
  {
    name: "lunch",
    range: [11, 14] as const,
    emoji: "🍽️",
    greeting: "점심시간! 인기 맛집 추천",
    gradient: "from-foreground to-foreground/90",
    categories: ["면류", "밥류", "만두", "탕류"] as string[],
    keywords: [],
  },
  {
    name: "afternoon",
    range: [14, 17] as const,
    emoji: "☕",
    greeting: "오후 티타임! 디저트 & 카페",
    gradient: "from-foreground/90 to-foreground",
    categories: ["디저트", "카페"] as string[],
    keywords: ["디저트", "빙수", "카페", "밀크티", "버블티"],
  },
  {
    name: "dinner",
    range: [17, 21] as const,
    emoji: "🌙",
    greeting: "저녁 맛집 추천",
    gradient: "from-foreground/90 to-foreground",
    categories: ["탕류", "밥류", "면류", "만두"] as string[],
    keywords: ["훠궈", "마라", "갈비"],
  },
  {
    name: "night",
    range: [21, 6] as const,
    emoji: "🌃",
    greeting: "야식 타임! 야시장 맛집",
    gradient: "from-foreground to-foreground/90",
    categories: ["길거리음식"] as string[],
    keywords: ["24시간", "야시장"],
    nightMarket: true,
  },
];

export function getTimeBasedRecommendations(hour: number): TimeBasedRecommendation {
  // 현재 시간대 찾기
  const config = timeSlotConfig.find(slot => {
    const [start, end] = slot.range;
    if (start < end) return hour >= start && hour < end;
    return hour >= start || hour < end; // 야식: 21~6
  }) || timeSlotConfig[1]; // 기본값: 점심

  const candidates: PopularRestaurant[] = [];
  const seenNames = new Set<string>();

  const cats = ["면류", "만두", "밥류", "탕류", "디저트", "길거리음식", "카페", "까르푸"] as const;

  for (const cat of cats) {
    const items = taiwanFoodMap[cat] || [];
    for (const item of items) {
      if (seenNames.has(item.이름)) continue;

      let matched = false;

      // 키워드 매칭
      if (config.keywords.length > 0) {
        const feature = (item.특징 || "").toLowerCase();
        const name = (item.이름 || "").toLowerCase();
        if (config.keywords.some(kw => feature.includes(kw) || name.includes(kw))) {
          matched = true;
        }
      }

      // 야시장 매칭
      if ("nightMarket" in config && config.nightMarket && item.야시장) {
        matched = true;
      }

      // 카테고리 매칭
      if (config.categories.includes(cat)) {
        matched = true;
      }

      if (matched && item.평점) {
        seenNames.add(item.이름);
        candidates.push({
          ...item,
          카테고리: cat,
          place_id: generateStaticPlaceId(item.이름, cat),
          category: cat,
        });
      }
    }
  }

  // 평점 순 정렬 후 상위 8개
  candidates.sort((a, b) => (b.평점 || 0) - (a.평점 || 0));

  return {
    timeSlot: config.name,
    emoji: config.emoji,
    greeting: config.greeting,
    gradient: config.gradient,
    restaurants: candidates.slice(0, 8),
  };
}

// 이미지 URL 생성 (Lorem Picsum 사용)
// AI 추천용 맛집 요약 생성 (프롬프트에 포함할 컴팩트 리스트)
export function getRestaurantSummaryForAI(): string {
  const all = getAllRestaurants();
  return all
    .filter(r => r.평점 && r.평점 >= 3.5)
    .sort((a, b) => (b.평점 || 0) - (a.평점 || 0))
    .map(r => {
      const parts = [r.이름];
      if (r.category) parts.push(`[${r.category}]`);
      if (r.위치) parts.push(r.위치);
      if (r.평점) parts.push(`⭐${r.평점}`);
      if (r.특징) parts.push(r.특징.substring(0, 40));
      if (r.야시장) parts.push(`(${r.야시장})`);
      if (r.가격대) parts.push(r.가격대);
      return parts.join(" | ");
    })
    .join("\n");
}

export function getUnsplashImage(name: string): string {
  // 이름 해시로 고유 시드 생성 (같은 이름은 항상 같은 이미지)
  const seed = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return `https://picsum.photos/seed/${seed}/400/300`;
}

// 구글 맵 링크 생성 (좌표가 있으면 좌표 중심으로 검색하여 정확한 위치 표시)
export function getGoogleMapsLink(name: string, location: string, coordinates?: { lat: number; lng: number }): string {
  let query = name || "";
  if (location && !location.includes("야시장")) {
    query += " " + location;
  }
  if (coordinates) {
    // 좌표로 직접 검색 → 해당 위치의 실제 POI(가게)가 표시됨
    return `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
  }
  query += " Taipei Taiwan";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
}

// 통합 검색 함수 - 식당이름, 위치, 음식, 야시장 등 검색
export interface SearchResult extends Restaurant {
  카테고리?: string;
  도심투어?: string;
  타입?: string;
  matchType: 'name' | 'location' | 'market' | 'feature';
}

// 음식 종류 키워드 → 카테고리 매핑
const foodKeywordMap: Record<string, string[]> = {
  '디저트': ['누가크래커', '누가', '크래커', '팥빙수', '빙수', '케이크', '마카롱', '와플', '타르트', '푸딩', '젤리', '초콜릿', '아이스크림', '파인애플케이크', '펑리수', '에그타르트', '망고빙수', '두화', '선초', '떡'],
  '카페': ['라떼', '커피', '아메리카노', '카푸치노', '밀크티', '버블티', '타피오카', '스무디', '주스', '차', '홍차', '녹차', '우롱차', '매실차'],
  '면류': ['우육면', '소고기면', '라멘', '국수', '비빔면', '쌀국수', '단자이면', '탄자이면'],
  '밥류': ['루러우판', '지파이', '치킨', '도시락', '볶음밥', '덮밥', '카레'],
  '탕류': ['훠궈', '마라', '마라탕', '샤브샤브', '우유훠궈', '갈비탕'],
  '만두': ['샤오롱바오', '소룡포', '만두', '딤섬', '바오즈', '군만두', '물만두'],
  '길거리음식': ['꼬치', '닭날개', '소시지', '계란빵', '호떡', '튀김', '선혈떡', '닭튀김', '옥수수'],
  '까르푸': ['까르푸', '마트', '쇼핑'],
};

function getMatchedCategories(query: string): Set<string> {
  const matched = new Set<string>();
  const q = query.toLowerCase();
  for (const [cat, keywords] of Object.entries(foodKeywordMap)) {
    if (keywords.some(kw => kw.includes(q) || q.includes(kw))) {
      matched.add(cat);
    }
  }
  return matched;
}

export function searchRestaurants(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: SearchResult[] = [];
  const seenNames = new Set<string>();
  const matchedCategories = getMatchedCategories(q);

  // 모든 카테고리에서 검색
  const cats = ["면류", "만두", "밥류", "탕류", "디저트", "길거리음식", "카페", "까르푸"] as const;

  for (const cat of cats) {
    const items = taiwanFoodMap[cat] || [];
    // 키워드로 매칭된 카테고리면 해당 카테고리 전체 포함
    const categoryMatched = matchedCategories.has(cat);

    for (const item of items) {
      if (seenNames.has(item.이름)) continue;

      const name = (item.이름 || '').toLowerCase();
      const nameEn = (item.name_en || '').toLowerCase();
      const location = (item.위치 || '').toLowerCase();
      const locationEn = (item.location_en || '').toLowerCase();
      const feature = (item.특징 || '').toLowerCase();
      const featureEn = (item.feature_en || '').toLowerCase();
      const market = (item.야시장 || '').toLowerCase();

      if (categoryMatched || name.includes(q) || nameEn.includes(q) || location.includes(q) || locationEn.includes(q) || feature.includes(q) || featureEn.includes(q) || market.includes(q)) {
        seenNames.add(item.이름);
        results.push({
          ...item,
          카테고리: cat,
          place_id: generateStaticPlaceId(item.이름, cat),
          category: cat,
          matchType: (name.includes(q) || nameEn.includes(q)) ? 'name' :
                     (location.includes(q) || locationEn.includes(q)) ? 'location' :
                     market.includes(q) ? 'market' :
                     (feature.includes(q) || featureEn.includes(q)) ? 'feature' : 'feature'
        });
      }
    }
  }

  // 도심투어에서 검색
  for (const area of Object.keys(taiwanFoodMap.도심투어)) {
    const items = taiwanFoodMap.도심투어[area] || [];
    for (const item of items) {
      if (seenNames.has(item.이름)) continue;

      const name = (item.이름 || '').toLowerCase();
      const nameEn = (item.name_en || '').toLowerCase();
      const location = (item.위치 || '').toLowerCase();
      const locationEn = (item.location_en || '').toLowerCase();
      const feature = (item.특징 || '').toLowerCase();
      const featureEn = (item.feature_en || '').toLowerCase();

      if (name.includes(q) || nameEn.includes(q) || location.includes(q) || locationEn.includes(q) || feature.includes(q) || featureEn.includes(q) || area.toLowerCase().includes(q)) {
        seenNames.add(item.이름);
        results.push({
          ...item,
          도심투어: area,
          place_id: generateStaticPlaceId(item.이름, '도심투어'),
          category: '도심투어',
          matchType: (name.includes(q) || nameEn.includes(q)) ? 'name' :
                     (location.includes(q) || locationEn.includes(q)) ? 'location' : 'feature'
        });
      }
    }
  }

  // 갈만한 곳에서 검색
  const places = taiwanFoodMap["갈만한 곳"] || [];
  for (const item of places) {
    if (seenNames.has(item.이름)) continue;

    const name = (item.이름 || '').toLowerCase();
    const nameEn = (item.name_en || '').toLowerCase();
    const location = (item.위치 || '').toLowerCase();
    const locationEn = (item.location_en || '').toLowerCase();
    const feature = (item.특징 || '').toLowerCase();
    const featureEn = (item.feature_en || '').toLowerCase();

    if (name.includes(q) || nameEn.includes(q) || location.includes(q) || locationEn.includes(q) || feature.includes(q) || featureEn.includes(q)) {
      seenNames.add(item.이름);
      results.push({
        ...item,
        타입: '명소',
        place_id: generateStaticPlaceId(item.이름, '갈만한곳'),
        category: '갈만한곳',
        matchType: (name.includes(q) || nameEn.includes(q)) ? 'name' :
                   (location.includes(q) || locationEn.includes(q)) ? 'location' : 'feature'
      });
    }
  }

  // 이름 매칭을 우선으로 정렬
  results.sort((a, b) => {
    const priority = { name: 0, market: 1, location: 2, feature: 3 };
    return priority[a.matchType] - priority[b.matchType];
  });

  return results;
}

// 언어별 표시 헬퍼 함수
export function getDisplayName(restaurant: Restaurant, language: string): string {
  if (language === "en" && restaurant.name_en) return restaurant.name_en;
  return restaurant.이름;
}

export function getDisplayLocation(restaurant: Restaurant, language: string): string {
  if (language === "en" && restaurant.location_en) return restaurant.location_en;
  return restaurant.위치;
}

export function getDisplayFeature(restaurant: Restaurant, language: string): string {
  if (language === "en" && restaurant.feature_en) return restaurant.feature_en;
  return restaurant.특징;
}

export function getDisplayBuilding(restaurant: Restaurant, language: string): string | undefined {
  if (language === "en" && restaurant.building_en) return restaurant.building_en;
  return restaurant.빌딩;
}

// 야시장 이름 영문 매핑
const NIGHT_MARKET_EN: Record<string, string> = {
  "스린 야시장": "Shilin Night Market",
  "닝샤 야시장": "Ningxia Night Market",
  "단수이 야시장": "Tamsui Night Market",
  "라오허제 야시장": "Raohe Night Market",
  "난지창 야시장": "Nanjichang Night Market",
};

export function getDisplayNightMarket(nightMarket: string, language: string): string {
  if (language === "en" && NIGHT_MARKET_EN[nightMarket]) return NIGHT_MARKET_EN[nightMarket];
  return nightMarket;
}
