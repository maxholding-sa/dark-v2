"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Loader2,
    MoreHorizontal,
    Search,
    Trash2,
    Eye,
    Building2,
    Phone,
    User,
    FileText,
    Clock,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import {
    getCompanyRequests,
    deleteCompanyRequest,
    updateCompanyRequestStatus,
} from "@/actions/company-requests";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
    PENDING: {
        label: "قيد الانتظار",
        badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        icon: Clock,
    },
    REVIEWED: {
        label: "تمت المراجعة",
        badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        icon: Eye,
    },
    COMPLETED: {
        label: "مكتمل",
        badge: "bg-green-500/20 text-green-400 border-green-500/30",
        icon: CheckCircle2,
    },
};

const CompanyRequestList = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [requestToDelete, setRequestToDelete] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [viewRequest, setViewRequest] = useState(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [updatingId, setUpdatingId] = useState(null);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const result = await getCompanyRequests();
            if (result.success) {
                setRequests(result.data);
            } else {
                toast.error(result.error || "فشل في جلب البيانات");
            }
        } catch (error) {
            toast.error("حدث خطأ ما");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const filteredRequests = requests.filter((req) => {
        const matchesSearch =
            req.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.contactPerson || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.phone || "").includes(searchTerm);

        const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleDelete = async () => {
        if (!requestToDelete) return;
        setDeleteLoading(true);
        try {
            const result = await deleteCompanyRequest(requestToDelete.id);
            if (result.success) {
                toast.success("تم حذف الطلب بنجاح");
                fetchRequests();
                setDeleteDialogOpen(false);
                setRequestToDelete(null);
            } else {
                toast.error(result.error || "فشل في الحذف");
            }
        } catch (error) {
            toast.error("حدث خطأ ما");
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        setUpdatingId(id);
        try {
            const result = await updateCompanyRequestStatus(id, newStatus);
            if (result.success) {
                toast.success("تم تحديث الحالة بنجاح");
                setRequests((prev) =>
                    prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
                );
                if (viewRequest?.id === id) {
                    setViewRequest((prev) => ({ ...prev, status: newStatus }));
                }
            } else {
                toast.error(result.error || "فشل في التحديث");
            }
        } catch (error) {
            toast.error("حدث خطأ ما");
        } finally {
            setUpdatingId(null);
        }
    };

    const StatusBadge = ({ status }) => {
        const config = statusConfig[status] || statusConfig.PENDING;
        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.badge}`}
            >
                <config.icon className="w-3 h-3" />
                {config.label}
            </span>
        );
    };

    // Counts
    const counts = {
        ALL: requests.length,
        PENDING: requests.filter((r) => r.status === "PENDING").length,
        REVIEWED: requests.filter((r) => r.status === "REVIEWED").length,
        COMPLETED: requests.filter((r) => r.status === "COMPLETED").length,
    };

    return (
        <div className="space-y-4" dir="rtl">
            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { key: "ALL", label: "الكل", color: "text-white" },
                    { key: "PENDING", label: "قيد الانتظار", color: "text-yellow-400" },
                    { key: "REVIEWED", label: "تمت المراجعة", color: "text-blue-400" },
                    { key: "COMPLETED", label: "مكتمل", color: "text-green-400" },
                ].map(({ key, label, color }) => (
                    <button
                        key={key}
                        onClick={() => setStatusFilter(key)}
                        className={`p-3 rounded-xl border transition-all text-right ${
                            statusFilter === key
                                ? "border-yellow-500/50 bg-yellow-500/10"
                                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
                        }`}
                    >
                        <p className={`text-2xl font-bold ${color}`}>{counts[key]}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{label}</p>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <form onSubmit={(e) => e.preventDefault()} className="flex w-full sm:w-auto">
                    <div className="relative flex-1">
                        <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            type="search"
                            placeholder="بحث باسم الشركة أو المسؤول..."
                            className="pr-9 w-full sm:w-72"
                        />
                    </div>
                </form>
            </div>

            <Card className="overflow-visible">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : filteredRequests.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">اسم الشركة</TableHead>
                                        <TableHead className="text-right">المسؤول</TableHead>
                                        <TableHead className="text-right">رقم الجوال</TableHead>
                                        <TableHead className="text-right">الحالة</TableHead>
                                        <TableHead className="text-right">تاريخ الطلب</TableHead>
                                        <TableHead className="text-left">الإجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRequests.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                                                    {req.companyName}
                                                </div>
                                            </TableCell>
                                            <TableCell>{req.contactPerson || "—"}</TableCell>
                                            <TableCell dir="ltr" className="text-right">
                                                {req.phone ? (
                                                    <a
                                                        href={`tel:${req.phone}`}
                                                        className="text-blue-400 hover:underline"
                                                    >
                                                        {req.phone}
                                                    </a>
                                                ) : (
                                                    "—"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={req.status} />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(req.createdAt).toLocaleDateString("ar-SA")}
                                            </TableCell>
                                            <TableCell className="text-left">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0"
                                                            disabled={updatingId === req.id}
                                                        >
                                                            {updatingId === req.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" dir="rtl">
                                                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setViewRequest(req);
                                                                setViewDialogOpen(true);
                                                            }}
                                                        >
                                                            <Eye className="ml-2 h-4 w-4" /> عرض التفاصيل
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuLabel className="text-xs text-gray-400">تغيير الحالة</DropdownMenuLabel>
                                                        {req.status !== "PENDING" && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleStatusChange(req.id, "PENDING")}
                                                            >
                                                                <Clock className="ml-2 h-4 w-4 text-yellow-400" /> قيد الانتظار
                                                            </DropdownMenuItem>
                                                        )}
                                                        {req.status !== "REVIEWED" && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleStatusChange(req.id, "REVIEWED")}
                                                            >
                                                                <Eye className="ml-2 h-4 w-4 text-blue-400" /> تمت المراجعة
                                                            </DropdownMenuItem>
                                                        )}
                                                        {req.status !== "COMPLETED" && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleStatusChange(req.id, "COMPLETED")}
                                                            >
                                                                <CheckCircle2 className="ml-2 h-4 w-4 text-green-400" /> مكتمل
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-500"
                                                            onClick={() => {
                                                                setRequestToDelete(req);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="ml-2 h-4 w-4" /> حذف
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <Building2 className="h-12 w-12 text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                                لم يتم العثور على طلبات
                            </h3>
                            <p className="text-gray-500">
                                {searchTerm || statusFilter !== "ALL"
                                    ? "لا توجد نتائج تطابق معايير البحث"
                                    : "لا توجد طلبات شركات حتى الآن"}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* View Details Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="bg-[#0a0a0a] text-white border-zinc-800 max-w-md" dir="rtl">
                    <DialogHeader className="text-right sm:text-right">
                        <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-yellow-400" />
                            تفاصيل الطلب
                        </DialogTitle>
                    </DialogHeader>
                    {viewRequest && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900">
                                <Building2 className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-400">اسم الشركة</p>
                                    <p className="text-white font-medium">{viewRequest.companyName}</p>
                                </div>
                            </div>
                            {viewRequest.contactPerson && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900">
                                    <User className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-400">اسم المسؤول</p>
                                        <p className="text-white font-medium">{viewRequest.contactPerson}</p>
                                    </div>
                                </div>
                            )}
                            {viewRequest.phone && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900">
                                    <Phone className="h-4 w-4 text-green-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-400">رقم الجوال</p>
                                        <a
                                            href={`tel:${viewRequest.phone}`}
                                            className="text-blue-400 font-medium hover:underline"
                                            dir="ltr"
                                        >
                                            {viewRequest.phone}
                                        </a>
                                    </div>
                                </div>
                            )}
                            {viewRequest.notes && (
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900">
                                    <FileText className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">تفاصيل الطلب</p>
                                        <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{viewRequest.notes}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900">
                                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-400">تاريخ الطلب</p>
                                    <p className="text-white font-medium">
                                        {new Date(viewRequest.createdAt).toLocaleDateString("ar-SA", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </p>
                                </div>
                            </div>
                            {/* Status changer in view dialog */}
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900">
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400 mb-2">الحالة</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {["PENDING", "REVIEWED", "COMPLETED"].map((s) => {
                                            const cfg = statusConfig[s];
                                            const isActive = viewRequest.status === s;
                                            return (
                                                <button
                                                    key={s}
                                                    onClick={() => handleStatusChange(viewRequest.id, s)}
                                                    disabled={isActive || updatingId === viewRequest.id}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                                        isActive
                                                            ? cfg.badge + " opacity-100"
                                                            : "border-zinc-700 text-gray-400 hover:border-zinc-500 disabled:opacity-50"
                                                    }`}
                                                >
                                                    {updatingId === viewRequest.id && !isActive ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <cfg.icon className="w-3 h-3" />
                                                    )}
                                                    {cfg.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:justify-start flex-row mt-2">
                        <Button
                            variant="ghost"
                            onClick={() => setViewDialogOpen(false)}
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900"
                        >
                            إغلاق
                        </Button>
                        {viewRequest?.phone && (
                            <a
                                href={`https://wa.me/${viewRequest.phone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors"
                            >
                                <Phone className="h-4 w-4" />
                                واتساب
                            </a>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="bg-[#0a0a0a] text-white border-zinc-800" dir="rtl">
                    <DialogHeader className="text-right sm:text-right">
                        <DialogTitle className="text-xl font-bold text-white">تأكيد الحذف</DialogTitle>
                        <DialogDescription className="text-zinc-400 text-right">
                            هل أنت متأكد من حذف طلب شركة{" "}
                            <strong>{requestToDelete?.companyName}</strong>؟ هذا الإجراء لا يمكن التراجع عنه.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 sm:justify-start flex-row mt-4">
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                            ) : (
                                "حذف الطلب"
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={deleteLoading}
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900"
                        >
                            إلغاء
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CompanyRequestList;
