import React from "react";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "تسجيل الدخول",
  robots: NOINDEX_ROBOTS,
};

const authLayout = ({ children }) => {
  return <div className="flex justify-center pt-40">{children}</div>;
};

export default authLayout;
