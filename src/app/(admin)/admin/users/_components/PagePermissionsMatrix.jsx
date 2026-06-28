"use client";
import React, { useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldAlert } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import { getUsers, updateUserPermissions } from "@/actions/settings";
import { ADMIN_ROUTES } from "@/constants/admin-routes";
import { toast } from "sonner";

const PagePermissionsMatrix = () => {
    const {
        loading: getUsersLoading,
        fn: getUsersFn,
        data: getUsersData,
    } = useFetch(getUsers);

    const {
        loading: updatePermissionsLoading,
        fn: updatePermissionsFn,
        data: updatePermissionsData,
        error: updatePermissionsError,
    } = useFetch(updateUserPermissions);

    useEffect(() => {
        getUsersFn();
    }, []);

    const editors = getUsersData?.success
        ? getUsersData.data.filter(u => u.role === "EDITOR")
        : [];

    const handleToggle = async (userId, routeId, currentPermissions) => {
        let newPermissions = [...(currentPermissions || [])];
        if (newPermissions.includes(routeId)) {
            newPermissions = newPermissions.filter(id => id !== routeId);
        } else {
            newPermissions.push(routeId);
        }

        const res = await updatePermissionsFn(userId, newPermissions);
        if (res?.success) {
            toast.success("تم تحديث الصلاحية");
            getUsersFn();
        }
    };

    if (getUsersLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (editors.length === 0) {
        return (
            <Card className="bg-gray-900 border-gray-800 text-right">
                <CardHeader>
                    <CardTitle className="text-white">لا يوجد محررون حالياً</CardTitle>
                    <CardDescription>قم بإضافة محررين من صفحة الإعدادات أولاً لتتمكن من إدارة صلاحياتهم هنا</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="bg-gray-900 border-gray-800 overflow-hidden">
            <CardHeader className="text-right border-b border-gray-800 pb-6">
                <CardTitle className="text-white text-xl flex items-center justify-end gap-2">
                    مصفوفة صلاحيات الصفحات
                    <ShieldAlert className="h-5 w-5 text-blue-500" />
                </CardTitle>
                <CardDescription>تحكم في من يمكنه الدخول لكل صفحة من صفحات لوحة التحكم</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-gray-800/50">
                            <TableRow className="hover:bg-transparent border-gray-800">
                                <TableHead className="text-right text-gray-300 font-bold py-4">صفحات الإدارة</TableHead>
                                {editors.map(editor => (
                                    <TableHead key={editor.id} className="text-center text-gray-300 font-bold py-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs text-blue-400">محرر:</span>
                                            <span className="whitespace-nowrap">{editor.name || editor.email.split('@')[0]}</span>
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ADMIN_ROUTES.map((route) => (
                                <TableRow key={route.id} className="border-gray-800 hover:bg-gray-800/30 transition-colors">
                                    <TableCell className="text-right py-4">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{route.label}</span>
                                            <span className="text-xs text-gray-500">{route.href}</span>
                                        </div>
                                    </TableCell>
                                    {editors.map(editor => {
                                        const isAllowed = editor.permissions?.includes(route.id);
                                        return (
                                            <TableCell key={editor.id} className="text-center py-4">
                                                <div className="flex justify-center">
                                                    <Checkbox
                                                        checked={isAllowed}
                                                        onCheckedChange={() => handleToggle(editor.id, route.id, editor.permissions)}
                                                        className="h-5 w-5 border-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                    />
                                                </div>
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default PagePermissionsMatrix;
