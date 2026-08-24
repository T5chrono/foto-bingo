import { useNavigate } from "react-router-dom";

import { useT } from "../hooks/useLocale";

/**
 * Powrót na planszę — jedyne wyjście z ekranów, które pod nią leżą.
 *
 * Jest guzikiem z obwódką, a nie podkreślonym słowem: gość trzyma telefon
 * jedną ręką, często w rękawiczce i po zmroku, a plansza jest miejscem, do
 * którego wraca po każdym zdjęciu. To najczęściej dotykany element aplikacji
 * poza samymi kafelkami, więc dostaje pole wielkości opuszka, nie linijki
 * tekstu.
 *
 * Strzałka siedzi w słowniku razem z napisem (`← Plansza`), bo po angielsku
 * zmienia się całość, a nie samo słowo.
 */
export function BackButton({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const t = useT();

  return (
    <button
      type="button"
      onClick={() => navigate("/")}
      className={
        "inline-flex items-center gap-2 self-start rounded-full border border-brand-300 " +
        "bg-paper px-5 py-2.5 text-base font-medium text-brand-800 " +
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 " +
        className
      }
    >
      {t.category.board}
    </button>
  );
}
