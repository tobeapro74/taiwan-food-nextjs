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
  });

  /**
   * 실제 GPS 위치 요청
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

    navigator.geolocation.getCurrentPosition(
      (position) => {
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
        });
      },
      (error) => {
        let errorMessage = "위치를 가져올 수 없습니다.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "위치 정보를 사용할 수 없습니다.";
            break;
          case error.TIMEOUT:
            errorMessage = "위치 요청 시간이 초과되었습니다.";
            break;
        }
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
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
