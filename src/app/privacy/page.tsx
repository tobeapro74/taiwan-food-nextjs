"use client";

import { useLanguage } from "@/components/language-provider";

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t("privacy.title")}</h1>

      <p className="text-gray-600 mb-6">
        {t("privacy.effective_date")}
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t("privacy.section1_title")}</h2>
        <p className="text-gray-700 leading-relaxed">
          {t("privacy.section1_content")}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t("privacy.section2_title")}</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>{t("privacy.section2_item1")}</li>
          <li>{t("privacy.section2_item2")}</li>
          <li>{t("privacy.section2_item3")}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t("privacy.section3_title")}</h2>
        <p className="text-gray-700 leading-relaxed">
          {t("privacy.section3_content")}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t("privacy.section4_title")}</h2>
        <p className="text-gray-700 leading-relaxed">
          {t("privacy.section4_content")}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t("privacy.section5_title")}</h2>
        <p className="text-gray-700 leading-relaxed">
          {t("privacy.section5_content")}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t("privacy.section6_title")}</h2>
        <p className="text-gray-700 leading-relaxed">
          {t("privacy.section6_content")}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t("privacy.section7_title")}</h2>
        <p className="text-gray-700 leading-relaxed">
          {t("privacy.section7_content")}
        </p>
        <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
          <li>{t("privacy.section7_email")}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t("privacy.section8_title")}</h2>
        <p className="text-gray-700 leading-relaxed">
          {t("privacy.section8_content")}
        </p>
      </section>
    </div>
  );
}
