export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">고객 지원</h1>

      <p className="text-gray-600 mb-6">
        대만맛집 앱 이용에 관한 문의 및 지원 안내입니다.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">문의하기</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          앱 사용 중 문제가 발생하거나 문의사항이 있으시면 아래 이메일로 연락해 주세요.
          영업일 기준 24시간 이내에 답변드리겠습니다.
        </p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-700">
            <span className="font-semibold">이메일:</span>{" "}
            <a href="mailto:tobeapro@gmail.com" className="text-blue-600 hover:underline">
              tobeapro@gmail.com
            </a>
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">자주 묻는 질문 (FAQ)</h2>

        <div className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="font-semibold text-gray-800 mb-2">Q. 내 주변 맛집은 어떻게 찾나요?</h3>
            <p className="text-gray-700">
              앱 하단의 &quot;지도&quot; 탭을 누르면 현재 위치 기반으로 주변 맛집을 확인할 수 있습니다.
              위치 권한을 허용해 주세요.
            </p>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-semibold text-gray-800 mb-2">Q. 화장실/ATM 위치는 어떻게 찾나요?</h3>
            <p className="text-gray-700">
              지도 화면에서 상단의 &quot;화장실&quot; 또는 &quot;ATM&quot; 버튼을 누르면
              현재 위치에서 가장 가까운 편의시설을 확인할 수 있습니다.
            </p>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-semibold text-gray-800 mb-2">Q. 맞춤 여행 일정은 어떻게 만드나요?</h3>
            <p className="text-gray-700">
              &quot;일정&quot; 탭에서 여행 날짜와 일행 정보(인원, 연령, 성별 등)를 입력하면
              AI가 맞춤형 여행 스케줄을 자동으로 추천해 드립니다.
            </p>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-semibold text-gray-800 mb-2">Q. 오프라인에서도 사용할 수 있나요?</h3>
            <p className="text-gray-700">
              일부 기능은 인터넷 연결이 필요합니다. 대만 여행 전 Wi-Fi 환경에서
              필요한 맛집 정보를 미리 확인해 두시는 것을 권장합니다.
            </p>
          </div>

          <div className="pb-4">
            <h3 className="font-semibold text-gray-800 mb-2">Q. 앱에서 오류가 발생해요.</h3>
            <p className="text-gray-700">
              앱을 최신 버전으로 업데이트하고, 기기를 재시작해 보세요.
              문제가 지속되면 이메일로 문의해 주세요. 오류 상황을 자세히 알려주시면 빠른 해결에 도움이 됩니다.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">앱 정보</h2>
        <ul className="text-gray-700 space-y-2">
          <li><span className="font-semibold">앱 이름:</span> 대만맛집</li>
          <li><span className="font-semibold">버전:</span> 1.0</li>
          <li><span className="font-semibold">개발자:</span> Byungchul Park</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">관련 링크</h2>
        <ul className="text-gray-700 space-y-2">
          <li>
            <a href="/privacy" className="text-blue-600 hover:underline">
              개인정보 처리방침
            </a>
          </li>
        </ul>
      </section>

      <footer className="text-center text-gray-500 text-sm mt-12 pt-8 border-t">
        <p>&copy; 2026 대만맛집. All rights reserved.</p>
      </footer>
    </div>
  );
}
