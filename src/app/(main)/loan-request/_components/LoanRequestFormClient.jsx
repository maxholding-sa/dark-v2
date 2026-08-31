"use client";

import dynamic from "next/dynamic";

const LoanRequestForm = dynamic(() => import("./LoanRequestForm"), {
  ssr: false,
  loading: () => null,
});

export default function LoanRequestFormClient(props) {
  return <LoanRequestForm {...props} />;
}
