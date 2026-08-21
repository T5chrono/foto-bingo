/**
 * Ekran dla kogoś, kto trafił na adres bez kodu — najczęściej po instalacji
 * z gołego adresu zamiast z linku osobistego, co na iOS zdarza się łatwo,
 * bo zainstalowana aplikacja dostaje osobny magazyn danych od Safari.
 */
export default function NoTokenPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-5 px-6 py-10 text-center">
      <h1 className="text-2xl font-semibold text-brand-800">Foto Bingo</h1>
      <p className="text-ink/70">
        Zeskanuj kod QR ze swojej winietki — to on mówi aplikacji, kim jesteś.
      </p>
      <p className="text-sm text-ink/50">
        Jeśli winietka gdzieś przepadła, poproś Parę Młodą o nowy kod.
      </p>
    </main>
  );
}
