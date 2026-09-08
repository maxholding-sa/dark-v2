import React from "react";
import CompanyRequestList from "./_components/CompanyRequestList";

export const metadata = {
    title: "طلبات الشركات | Max Motors Admin",
    description: "إدارة طلبات شراكة الشركات",
};

const CompanyRequestsPage = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-right">طلبات الشركات</h1>
            <CompanyRequestList />
        </div>
    );
};

export default CompanyRequestsPage;
