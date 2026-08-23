import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useGuestToken } from "../hooks/useGuestToken";
import { useT } from "../hooks/useLocale";

/**
 * Wejście z QR: /g/ABCD1234. Zapisuje kod i przekierowuje na planszę.
 *
 * Przekierowanie jest zastępujące (replace), żeby cofnięcie nie wracało
 * na ekran, który tylko coś zapisuje i idzie dalej.
 */
export default function JoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { setToken } = useGuestToken();
  const t = useT();

  useEffect(() => {
    if (token) {
      setToken(token);
      void client.invalidateQueries({ queryKey: ["me"] });
    }
    navigate("/", { replace: true });
  }, [token, navigate, client, setToken]);

  return <p className="p-8 text-center text-brand-800/60">{t.app.loading}</p>;
}
