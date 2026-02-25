"use client";

import { useLanguage } from "@/components/language-provider";

export default function SupportPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t("support.title")}</h1>

      <p className="text-gray-600 mb-6">
        {t("support.description")}
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t("support.contact")}</h2>
        <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
          {t("support.contact_desc")}
        </p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-700">
            <span className="font-semibold">{t("support.email")}:</span>{" "}
            <a href="mailto:tobeapro@gmail.com" className="text-blue-600 hover:underline">
              tobeapro@gmail.com
            </a>
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t("support.faq")}</h2>

        <div className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="font-semibold text-gray-800 mb-2">{t("support.faq_nearby")}</h3>
            <p className="text-gray-700">
              {t("support.faq_nearby_a")}
            </p>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-semibold text-gray-800 mb-2">{t("support.faq_toilet")}</h3>
            <p className="text-gray-700">
              {t("support.faq_toilet_a")}
            </p>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-semibold text-gray-800 mb-2">{t("support.faq_schedule")}</h3>
            <p className="text-gray-700">
              {t("support.faq_schedule_a")}
            </p>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-semibold text-gray-800 mb-2">{t("support.faq_offline")}</h3>
            <p className="text-gray-700">
              {t("support.faq_offline_a")}
            </p>
          </div>

          <div className="pb-4">
            <h3 className="font-semibold text-gray-800 mb-2">{t("support.faq_error")}</h3>
            <p className="text-gray-700">
              {t("support.faq_error_a")}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t("support.app_info")}</h2>
        <ul className="text-gray-700 space-y-2">
          <li>{t("support.app_name")}</li>
          <li>{t("support.version")}</li>
          <li>{t("support.developer")}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t("support.related_links")}</h2>
        <ul className="text-gray-700 space-y-2">
          <li>
            <a href="/privacy" className="text-blue-600 hover:underline">
              {t("privacy.title")}
            </a>
          </li>
        </ul>
      </section>

      <footer className="text-center text-gray-500 text-sm mt-12 pt-8 border-t">
        <p>{t("support.copyright")}</p>
      </footer>
    </div>
  );
}
