export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">개인정보 처리방침</h1>

      <p className="text-gray-600 mb-6">
        시행일: 2025년 2월 3일
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. 개인정보의 수집 및 이용 목적</h2>
        <p className="text-gray-700 leading-relaxed">
          &quot;대만맛집&quot; 앱(이하 &quot;앱&quot;)은 사용자에게 대만 지역 맛집 정보를 제공하기 위해
          최소한의 개인정보를 수집합니다. 수집된 정보는 서비스 제공 및 개선 목적으로만 사용됩니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. 수집하는 개인정보 항목</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>회원가입 시: 이메일 주소, 비밀번호(암호화 저장)</li>
          <li>리뷰 작성 시: 작성자명, 리뷰 내용, 별점</li>
          <li>자동 수집: 앱 사용 기록, 접속 로그</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. 개인정보의 보유 및 이용 기간</h2>
        <p className="text-gray-700 leading-relaxed">
          회원 탈퇴 시까지 보유하며, 탈퇴 요청 시 지체 없이 파기합니다.
          단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. 개인정보의 제3자 제공</h2>
        <p className="text-gray-700 leading-relaxed">
          앱은 사용자의 개인정보를 제3자에게 제공하지 않습니다.
          단, 법령에 의한 요청이 있는 경우 예외로 합니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. 개인정보의 파기</h2>
        <p className="text-gray-700 leading-relaxed">
          개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우,
          해당 개인정보를 지체 없이 파기합니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. 이용자의 권리</h2>
        <p className="text-gray-700 leading-relaxed">
          이용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리 정지를
          요청할 수 있습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. 개인정보 보호책임자</h2>
        <p className="text-gray-700 leading-relaxed">
          개인정보 처리에 관한 문의사항이 있으시면 아래로 연락해 주세요.
        </p>
        <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
          <li>이메일: support@taiwan-yummy-food.com</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. 개인정보 처리방침 변경</h2>
        <p className="text-gray-700 leading-relaxed">
          본 개인정보 처리방침은 법령 및 정책 변경에 따라 수정될 수 있으며,
          변경 시 앱 내 공지를 통해 안내합니다.
        </p>
      </section>
    </div>
  );
}
