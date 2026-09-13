import { useEffect, useState } from "react";
import { authFetch } from "../auth/authFetch";

export default function ContractFormPage() {
  const [formData, setFormData] = useState({
    principalAmount: "",
    startDate: "",
    maturityDate: "",
    interestRate: "0.5",
    repaymentDay: "1",
    repaymentType: "EQUAL_PRINCIPAL_AND_INTEREST",
    contractAlias: "",
    terms: "",
    creditorAddress: "",
  });

  const [creditorInfo, setCreditorInfo] = useState<{
    name: string;
    birthDate: string;
  } | null>(null);

  useEffect(() => {
    async function loadCreditorInfo() {
      const res = await authFetch("/api/users/me", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const user = await res.json();
      setCreditorInfo({ name: user.name, birthDate: user.birthDate });
    }

    loadCreditorInfo();
  }, []);

  return <div>Contract Form Page</div>;
}
