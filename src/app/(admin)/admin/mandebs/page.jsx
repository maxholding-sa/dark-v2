import React from "react";
import MandebList from "./_components/MandebList";

export const metadata = {
    title: "المناديب | Max Motors Admin",
    description: "إدارة المناديب في السوق الخاص بك",
};

const MandebsPage = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-right">إدارة المناديب</h1>
            <MandebList />
        </div>
    );
};

export default MandebsPage;
