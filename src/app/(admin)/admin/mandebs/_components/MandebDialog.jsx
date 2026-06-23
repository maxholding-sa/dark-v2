"use client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createMandeb, updateMandeb } from "@/actions/mandeb";

const MandebDialog = ({ open, onClose, mandeb, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        city: "",
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (mandeb) {
            setFormData({
                name: mandeb.name || "",
                phone: mandeb.phone || "",
                city: mandeb.city || "",
            });
        } else {
            setFormData({
                name: "",
                phone: "",
                city: "",
            });
        }
    }, [mandeb, open]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.phone || !formData.city) {
            toast.error("يرجى ملء جميع الحقول");
            return;
        }

        setLoading(true);
        try {
            let result;
            if (mandeb) {
                result = await updateMandeb(mandeb.id, formData);
            } else {
                result = await createMandeb(formData);
            }

            if (result.success) {
                toast.success(mandeb ? "تم تحديث البيانات بنجاح" : "تم إضافة المندوب بنجاح");
                onSuccess?.();
            } else {
                toast.error(result.error || "حدث خطأ ما");
            }
        } catch (error) {
            toast.error("حدث خطأ ما");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#0a0a0a] text-white border-zinc-800" dir="rtl">
                <DialogHeader className="text-right sm:text-right">
                    <DialogTitle className="text-xl font-bold text-white">
                        {mandeb ? "تعديل بيانات المندوب" : "إضافة مندوب جديد"}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 text-right">
                        أدخل معلومات المندوب هنا. اضغط حفظ عند الانتهاء.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-zinc-300">اسم المندوب</Label>
                        <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="مثال: أحمد محمد"
                            required
                            className="focus-visible:ring-yellow-500/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-zinc-300">رقمه</Label>
                        <Input
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="مثال: 0500000000"
                            required
                            className="focus-visible:ring-yellow-500/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city" className="text-zinc-300">المدينة</Label>
                        <Input
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="مثال: الرياض"
                            required
                            className="focus-visible:ring-yellow-500/50"
                        />
                    </div>
                    <DialogFooter className="pt-4 gap-2 sm:gap-0 sm:justify-start flex-row mt-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : (
                                "حفظ البيانات"
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={loading}
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900"
                        >
                            إلغاء
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default MandebDialog;
