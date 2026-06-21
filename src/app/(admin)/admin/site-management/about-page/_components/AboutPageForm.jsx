"use client";

import AboutPageEditor from "@/app/(admin)/admin/site-data/_components/AboutPageEditor";

const AboutPageForm = ({ aboutPage, onSubmit }) => {
  return <AboutPageEditor data={aboutPage} onRefresh={onSubmit} />;
};

export default AboutPageForm;
