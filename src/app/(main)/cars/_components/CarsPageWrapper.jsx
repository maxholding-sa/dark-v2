"use client";

import { useEffect, useState } from "react";
import WhatsAppButton from "@/components/WhatsAppButton";
import { getWhatsAppNumber } from "@/actions/site-management";

export default function CarsPageWrapper() {
  const [whatsappNumber, setWhatsappNumber] = useState(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [whatsappLabel, setWhatsappLabel] = useState("لم تجد سياراتك؟");
  const [whatsappText, setWhatsappText] = useState("السلام عليكم%0Aلقد بحثت عن سيارة ولم أجدها%0Aهل يمكنكم مساعدتي؟");

  useEffect(() => {
    const fetchWhatsAppNumber = async () => {
      try {
        const result = await getWhatsAppNumber();
        if (result.success && result.data) {
          setWhatsappNumber(result.data);
          setWhatsappEnabled(result.whatsappEnabled ?? true);
          if (result.whatsappLabel) setWhatsappLabel(result.whatsappLabel);
          if (result.whatsappText) setWhatsappText(result.whatsappText);
        }
      } catch (error) {
        console.error("Error fetching WhatsApp number:", error);
      }
    };
    fetchWhatsAppNumber();
  }, []);

  return (
    <WhatsAppButton 
      phoneNumber={whatsappNumber}
      enabled={whatsappEnabled}
      label={whatsappLabel}
      text={whatsappText}
      bottomOffset="bottom-4 md:bottom-6"
      rightOffset="right-4 md:right-6"
    />
  );
}
