"use client";

import AboutPageEditor from "./AboutPageEditor";

const AboutPageManager = ({ data, onRefresh }) => {
  return <AboutPageEditor data={data} onRefresh={onRefresh} />;
};

export default AboutPageManager;
