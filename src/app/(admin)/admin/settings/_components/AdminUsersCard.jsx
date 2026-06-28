"use client";
import React, { useEffect, useState } from "react";
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Shield, Users, UserX, Settings2, Check, X } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import { getUsers, updateUserRole, updateUserPermissions } from "@/actions/settings";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ADMIN_ROUTES } from "@/constants/admin-routes";

const AdminUsersCard = () => {
  const [userSearch, setUserSearch] = useState("");
  const [permissionUser, setPermissionUser] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const {
    loading: getUsersLoading,
    fn: getUsersFn,
    data: getUsersData,
    error: getUsersError,
  } = useFetch(getUsers);

  const {
    loading: updateUserRoleLoading,
    fn: updateUserRoleFn,
    data: updateUserRoleData,
    error: updateUserRoleError,
  } = useFetch(updateUserRole);

  const {
    loading: updatePermissionsLoading,
    fn: updatePermissionsFn,
    data: updatePermissionsData,
    error: updatePermissionsError,
  } = useFetch(updateUserPermissions);

  // Fetch users on component mount
  useEffect(() => {
    getUsersFn();
  }, [getUsers]);

  //   find user by searchUser state
  const filteredData = getUsersData?.success
    ? getUsersData?.data.filter(
      (user) =>
        user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearch.toLowerCase())
    )
    : [];

  // Update role
  const handleUpdateRole = async (user, newRole) => {
    let confirmMsg = "";
    if (newRole === "USER") confirmMsg = `هل أنت متأكد من إزالة صلاحيات الإدارة من ${user.name || user.email}؟`;
    else if (newRole === "ADMIN") confirmMsg = `هل أنت متأكد من منح صلاحيات المدير لـ ${user.name || user.email}؟`;
    else if (newRole === "EDITOR") confirmMsg = `هل أنت متأكد من منح صلاحيات المحرر لـ ${user.name || user.email}؟`;

    if (confirm(confirmMsg)) {
      await updateUserRoleFn(user.id, newRole);
    }
  };

  // Open permissions dialog
  const handleOpenPermissions = (user) => {
    setPermissionUser(user);
    setSelectedPermissions(user.permissions || []);
  };

  // Toggle permission
  const togglePermission = (routeId) => {
    setSelectedPermissions((prev) =>
      prev.includes(routeId)
        ? prev.filter((id) => id !== routeId)
        : [...prev, routeId]
    );
  };

  // Save permissions
  const handleSavePermissions = async () => {
    await updatePermissionsFn(permissionUser.id, selectedPermissions);
    setPermissionUser(null);
  };

  // handle error
  useEffect(() => {
    if (updateUserRoleError) {
      toast.error(`خطأ أثناء تحديث حالة المستخدم ${updateUserRoleError.message}`);
    }
    if (getUsersError) {
      toast.error(`خطأ أثناء جلب المستخدمين ${getUsersError.message}`);
    }
    if (updatePermissionsError) {
      toast.error(`خطأ أثناء تحديث الصلاحيات ${updatePermissionsError.message}`);
    }
  }, [updateUserRoleError, getUsersError, updatePermissionsError]);

  // handle success operations
  useEffect(() => {
    if (updateUserRoleData?.success || updatePermissionsData?.success) {
      toast.success(`تم تحديث البيانات بنجاح`);
      getUsersFn();
    }
  }, [updateUserRoleData, updatePermissionsData]);

  return (
    <div dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>التحكم في الصفحات المسموحة والممنوعة</CardTitle>
          <CardDescription>إدارة وصول المحررين: حدد ما يمكنهم فعله وما لا يمكنهم فعله</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 relative">
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              className="pr-9 w-full"
              type="search"
              placeholder="بحث عن المستخدمين..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />

            {getUsersLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : getUsersData?.success && filteredData.length > 0 ? (
              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المستخدم</TableHead>
                      <TableHead className="text-right">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right">الدور</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredData.map((user) => {
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium text-right">
                            <div className="flex items-center gap-2 justify-start">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden relative">
                                {user.imageUrl ? (
                                  <img
                                    src={user.imageUrl}
                                    alt={user.name || "User"}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Users className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                              <span>{user.name || "مستخدم بدون اسم"}</span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right">{user.email}</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              className={
                                user.role === "ADMIN"
                                  ? "bg-green-800"
                                  : user.role === "EDITOR"
                                    ? "bg-blue-800"
                                    : "bg-gray-800"
                              }
                            >
                              {user.role === "ADMIN" ? "مدير" : user.role === "EDITOR" ? "محرر" : "مستخدم"}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-left">
                            <div className="flex gap-2 justify-end">
                              {user.role === "EDITOR" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenPermissions(user)}
                                >
                                  <Settings2 className="h-4 w-4 ml-2" />
                                  الصلاحيات
                                </Button>
                              )}

                              {user.role !== "ADMIN" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateRole(user, "ADMIN")}
                                  disabled={updateUserRoleLoading}
                                >
                                  <Shield className="h-4 w-4 ml-2" />
                                  جعله مديراً
                                </Button>
                              )}

                              {user.role !== "EDITOR" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateRole(user, "EDITOR")}
                                  disabled={updateUserRoleLoading}
                                >
                                  <Settings2 className="h-4 w-4 ml-2" />
                                  جعله محرراً
                                </Button>
                              )}

                              {(user.role === "ADMIN" || user.role === "EDITOR") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleUpdateRole(user, "USER")}
                                  disabled={updateUserRoleLoading}
                                >
                                  <UserX className="h-4 w-4 ml-2" />
                                  إلغاء الصلاحيات
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  لم يتم العثور على مستخدمين
                </h3>
                <p>
                  {userSearch
                    ? "لا يوجد مستخدمون يطابقون معاييرك"
                    : "لا يوجد مستخدمون مرتبطون هنا"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!permissionUser} onOpenChange={() => setPermissionUser(null)}>
        <DialogContent className="sm:max-w-[425px] bg-black border-gray-800 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-white">تحديد الصفحات المسموحة</DialogTitle>
            <DialogDescription className="text-right text-white">
              اختر الصفحات المسموح بدخولها لـ {permissionUser?.name || permissionUser?.email}. الصفحات غير المختارة ستكون ممنوعة تماماً.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {ADMIN_ROUTES.filter(route => !route.isAdminOnly).map((route) => (
              <div key={route.id} className="flex items-center gap-4">
                <Checkbox
                  id={route.id}
                  checked={selectedPermissions.includes(route.id)}
                  onCheckedChange={() => togglePermission(route.id)}
                  className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-black"
                />
                <label
                  htmlFor={route.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-white"
                >
                  {route.label}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              onClick={handleSavePermissions}
              disabled={updatePermissionsLoading}
              className="bg-white text-black hover:bg-gray-200"
            >
              {updatePermissionsLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ التغييرات
            </Button>
            <Button
              variant="outline"
              onClick={() => setPermissionUser(null)}
              className="border-gray-700 text-white hover:bg-gray-900 hover:text-white"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersCard;
