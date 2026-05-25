import { describe, expect, it } from "vitest";
import {
  REGIONS,
  SIDO_NAMES,
  getSigungu,
  composeMunicipality,
} from "./regions";

// 행정구역 데이터셋 무결성 — 조례 검색 범위 드롭다운의 단일 출처
describe("regions", () => {
  it("17개 시도를 모두 포함한다", () => {
    expect(REGIONS).toHaveLength(17);
    expect(SIDO_NAMES).toContain("서울특별시");
    expect(SIDO_NAMES).toContain("세종특별자치시");
    expect(SIDO_NAMES).toContain("제주특별자치도");
  });

  it("2023~2024 행정구역 개편을 반영한다", () => {
    // 강원·전북 특별자치도 개칭
    expect(SIDO_NAMES).toContain("강원특별자치도");
    expect(SIDO_NAMES).toContain("전북특별자치도");
    // 군위군은 대구로 편입, 경북에는 없음
    expect(getSigungu("대구광역시")).toContain("군위군");
    expect(getSigungu("경상북도")).not.toContain("군위군");
  });

  it("세종특별자치시는 단층제로 시군구가 없다", () => {
    expect(getSigungu("세종특별자치시")).toEqual([]);
  });

  it("시군구 명칭에 중복이 없고 비어있지 않다", () => {
    for (const r of REGIONS) {
      const unique = new Set(r.sigungu);
      expect(unique.size, `${r.name} 중복`).toBe(r.sigungu.length);
      for (const s of r.sigungu) {
        expect(s.length, `${r.name} 빈 항목`).toBeGreaterThan(0);
      }
    }
  });

  it("서울특별시는 25개 자치구를 가진다", () => {
    expect(getSigungu("서울특별시")).toHaveLength(25);
  });

  it("getSigungu 는 미존재 시도에 빈 배열을 반환한다", () => {
    expect(getSigungu("없는도")).toEqual([]);
  });

  it("composeMunicipality 는 시도+시군구를 합성하고 단층제는 시도만 반환한다", () => {
    expect(composeMunicipality("서울특별시", "강남구")).toBe("서울특별시 강남구");
    expect(composeMunicipality("세종특별자치시")).toBe("세종특별자치시");
    expect(composeMunicipality(" 경기도 ", " 수원시 ")).toBe("경기도 수원시");
  });
});
