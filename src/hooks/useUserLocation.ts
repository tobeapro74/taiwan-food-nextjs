"use client";

import { useState, useCallback } from "react";
import { MOCK_LOCATIONS, Coordinates, searchAddressToCoordinates, AddressSearchResult } from "@/lib/geo-utils";

interface LocationState {
  coordinates: Coordinates | null;
  locationName: string | null;
  error: string | null;
  isLoading: boolean;
  isMockLocation: boolean;
  isSearching: boolean;
  searchResults: AddressSearchResult[];
  gpsFailed: boolean; // GPS 실패로 기본 위치(시먼딩)로 폴백했는지 여부
}

interface UseUserLocationReturn extends LocationState {
  requestLocation: () => void;
  setMockLocation: (locationKey: string) => void;
  clearLocation: () => void;
  searchAddress: (query: string) => Promise<void>;
  selectSearchResult: (result: AddressSearchResult) => void;
  clearSearchResults: () => void;
  setManualCoordinates: (lat: number, lng: number, name?: string) => void;
}

/**
 * 사용자 위치 관리 훅
 * - 실제 GPS 위치 또는 Mock 위치 지원
 * - 테스트용 사전 정의 위치 제공
 * - 주소 검색 기능 지원
 */
export function useUserLocation(): UseUserLocationReturn {
  const [state, setState] = useState<LocationState>({
    coordinates: null,
    locationName: null,
    error: null,
    isLoading: false,
    isMockLocation: false,
    isSearching: false,
    searchResults: [],
    gpsFailed: false,
  });

  /**
   * 실제 GPS 위치 요청
   * - iOS WKWebView에서 geolocation이 콜백 없이 멈출 수 있으므로 수동 타임아웃 추가
   */
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "이 브라우저에서는 위치 서비스를 지원하지 않습니다.",
        isLoading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    let settled = false;

    // GPS 실패 시 시먼딩 기본 위치로 폴백 (App Store 심사관 등 대만 외 환경 대응)
    const fallbackToDefault = () => {
      const defaultLocation = MOCK_LOCATIONS["시먼딩"];
      setState({
        coordinates: { lat: defaultLocation.lat, lng: defaultLocation.lng },
        locationName: defaultLocation.name,
        error: null,
        isLoading: false,
        isMockLocation: true,
        isSearching: false,
        searchResults: [],
        gpsFailed: true,
      });
    };

    // iOS WKWebView에서 권한 미설정 시 콜백이 호출되지 않는 경우를 대비한 수동 타임아웃
    const fallbackTimeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        fallbackToDefault();
      }
    }, 15000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimeout);
        setState({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          locationName: "현재 위치",
          error: null,
          isLoading: false,
          isMockLocation: false,
          isSearching: false,
          searchResults: [],
          gpsFailed: false,
        });
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimeout);
        fallbackToDefault();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  /**
   * Mock 위치 설정 (테스트용)
   */
  const setMockLocation = useCallback((locationKey: string) => {
    const mockLocation = MOCK_LOCATIONS[locationKey];
    if (mockLocation) {
      setState({
        coordinates: { lat: mockLocation.lat, lng: mockLocation.lng },
        locationName: mockLocation.name,
        error: null,
        isLoading: false,
        isMockLocation: true,
        isSearching: false,
        searchResults: [],
        gpsFailed: false,
      });
    } else {
      setState((prev) => ({
        ...prev,
        error: `알 수 없는 위치: ${locationKey}`,
      }));
    }
  }, []);

  /**
   * 위치 초기화
   */
  const clearLocation = useCallback(() => {
    setState({
      coordinates: null,
      locationName: null,
      error: null,
      isLoading: false,
      isMockLocation: false,
      isSearching: false,
      searchResults: [],
      gpsFailed: false,
    });
  }, []);

  /**
   * 주소 검색
   */
  const searchAddress = useCallback(async (query: string) => {
    if (!query.trim()) {
      setState((prev) => ({ ...prev, searchResults: [], error: null }));
      return;
    }

    setState((prev) => ({ ...prev, isSearching: true, error: null }));

    try {
      const results = await searchAddressToCoordinates(query);
      setState((prev) => ({
        ...prev,
        isSearching: false,
        searchResults: results,
        error: results.length === 0 ? "검색 결과가 없습니다. 다른 주소를 입력해보세요." : null,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        isSearching: false,
        searchResults: [],
        error: "주소 검색 중 오류가 발생했습니다.",
      }));
    }
  }, []);

  /**
   * 검색 결과 선택
   */
  const selectSearchResult = useCallback((result: AddressSearchResult) => {
    setState({
      coordinates: { lat: result.lat, lng: result.lng },
      locationName: result.displayName.split(",")[0], // 첫 번째 부분만 표시
      error: null,
      isLoading: false,
      isMockLocation: false,
      isSearching: false,
      searchResults: [],
      gpsFailed: false,
    });
  }, []);

  /**
   * 검색 결과 초기화
   */
  const clearSearchResults = useCallback(() => {
    setState((prev) => ({ ...prev, searchResults: [], error: null }));
  }, []);

  /**
   * 직접 좌표 입력
   */
  const setManualCoordinates = useCallback((lat: number, lng: number, name?: string) => {
    setState({
      coordinates: { lat, lng },
      locationName: name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      error: null,
      isLoading: false,
      isMockLocation: false,
      isSearching: false,
      searchResults: [],
      gpsFailed: false,
    });
  }, []);

  return {
    ...state,
    requestLocation,
    setMockLocation,
    clearLocation,
    searchAddress,
    selectSearchResult,
    clearSearchResults,
    setManualCoordinates,
  };
}

/**
 * 사용 가능한 Mock 위치 목록
 */
export function getMockLocationList(): { key: string; name: string }[] {
  return Object.entries(MOCK_LOCATIONS).map(([key, value]) => ({
    key,
    name: value.name,
  }));
}
