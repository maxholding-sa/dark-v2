"use client";
import React, { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    Save,
    Facebook,
    Chrome,
    Music2,
    Share2,
    MousePointer2,
    Activity,
    Eye,
    LineChart,
} from "lucide-react";
import useFetch from "../../../../../../hooks/use-fetch";
import { getPixelSettings, updatePixelSettings } from "@/actions/site-management";
import { toast } from "sonner";

const PixelTabContent = ({ type }) => {
    const {
        loading: getLoading,
        fn: getFn,
        data: getData,
    } = useFetch(getPixelSettings);

    const {
        loading: updateLoading,
        fn: updateFn,
        data: updateData,
    } = useFetch(updatePixelSettings);

    const [formData, setFormData] = useState({
        facebookPixel: "",
        googleAnalytics: "",
        googleAdsId: "",
        tiktokPixel: "",
        snapchatPixel: "",
        microsoftClarity: "",
    });

    useEffect(() => {
        getFn();
    }, []);

    useEffect(() => {
        if (getData?.success && getData.data) {
            setFormData({
                facebookPixel: getData.data.facebookPixel || "",
                googleAnalytics: getData.data.googleAnalytics || "",
                googleAdsId: getData.data.googleAdsId || "",
                tiktokPixel: getData.data.tiktokPixel || "",
                snapchatPixel: getData.data.snapchatPixel || "",
                microsoftClarity: getData.data.microsoftClarity || "",
            });
        }
    }, [getData]);

    useEffect(() => {
        if (updateData?.success) {
            toast.success("تم تحديث الإعدادات بنجاح");
        } else if (updateData?.success === false) {
            toast.error(updateData.error || "فشل حفظ الإعدادات");
        }
    }, [updateData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        let payload = {};
        if (type === "facebook") {
            payload = { facebookPixel: formData.facebookPixel };
        } else if (type === "google") {
            payload = {
                googleAnalytics: formData.googleAnalytics,
                googleAdsId: formData.googleAdsId
            };
        } else if (type === "social") {
            payload = {
                tiktokPixel: formData.tiktokPixel,
                snapchatPixel: formData.snapchatPixel
            };
        } else if (type === "clarity") {
            payload = { microsoftClarity: formData.microsoftClarity };
        }
        await updateFn(payload);
    };

    if (getLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Card className="bg-black/20 border-white/10 shadow-2xl backdrop-blur-sm text-right" dir="rtl">
            <CardHeader>
                <div className="flex items-center gap-3">
                    {type === "facebook" && <Facebook className="h-6 w-6 text-blue-500" />}
                    {type === "google" && <Chrome className="h-6 w-6 text-orange-500" />}
                    {type === "social" && <Music2 className="h-6 w-6 text-pink-500" />}
                    {type === "clarity" && <Activity className="h-6 w-6 text-teal-400" />}
                    <CardTitle className="text-xl">
                        {type === "facebook" && "فيسبوك بيكسل (Meta Pixel)"}
                        {type === "google" && "إعدادات جوجل (Analytics & Ads)"}
                        {type === "social" && "تيك توك وسناب شات"}
                        {type === "clarity" && "مايكروسوفت كلايريتي (Clarity)"}
                    </CardTitle>
                </div>
                <CardDescription className="text-right">
                    {type === "facebook" && "تتبع حملاتك الإعلانية وجمهورك على فيسبوك وإنستجرام"}
                    {type === "google" && "تحليل حركة المرور وقياس تحويلات إعلانات جوجل"}
                    {type === "social" && "أدوات التتبع للمنصات الاجتماعية الإضافية"}
                    {type === "clarity" && "تحليل سلوك المستخدم من خلال خرائط الحرارة والتسجيلات"}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-right">
                {type === "facebook" && (
                    <div className="space-y-2">
                        <Label htmlFor="facebookPixel">Facebook Pixel ID</Label>
                        <Input
                            id="facebookPixel"
                            name="facebookPixel"
                            placeholder="123456789012345"
                            value={formData.facebookPixel}
                            onChange={handleChange}
                            className="focus:border-blue-500 transition-colors"
                        />
                    </div>
                )}

                {type === "google" && (
                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="googleAnalytics" className="flex items-center gap-2">
                                <LineChart className="h-4 w-4" /> Google Analytics (GA4) ID
                            </Label>
                            <Input
                                id="googleAnalytics"
                                name="googleAnalytics"
                                placeholder="G-XXXXXXXXXX"
                                value={formData.googleAnalytics}
                                onChange={handleChange}
                                className=""
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="googleAdsId" className="flex items-center gap-2">
                                <MousePointer2 className="h-4 w-4" /> Google Ads Conversion ID
                            </Label>
                            <Input
                                id="googleAdsId"
                                name="googleAdsId"
                                placeholder="AW-123456789"
                                value={formData.googleAdsId}
                                onChange={handleChange}
                                className=""
                            />
                        </div>
                    </div>
                )}

                {type === "social" && (
                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="tiktokPixel" className="flex items-center gap-2">
                                <Music2 className="h-4 w-4" /> TikTok Pixel ID
                            </Label>
                            <Input
                                id="tiktokPixel"
                                name="tiktokPixel"
                                placeholder="CXXXXXXXXXXXXXXXXXXX"
                                value={formData.tiktokPixel}
                                onChange={handleChange}
                                className=""
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="snapchatPixel" className="flex items-center gap-2">
                                <Share2 className="h-4 w-4 text-yellow-500" /> Snapchat Pixel ID
                            </Label>
                            <Input
                                id="snapchatPixel"
                                name="snapchatPixel"
                                placeholder="XXXXXXXX-XXXX...XXXX"
                                value={formData.snapchatPixel}
                                onChange={handleChange}
                                className=""
                            />
                        </div>
                    </div>
                )}

                {type === "clarity" && (
                    <div className="space-y-2">
                        <Label htmlFor="microsoftClarity">Microsoft Clarity Project ID</Label>
                        <Input
                            id="microsoftClarity"
                            name="microsoftClarity"
                            placeholder="xxxxxxxxxx"
                            value={formData.microsoftClarity}
                            onChange={handleChange}
                            className="bg-black/40 border-white/10"
                        />
                    </div>
                )}
            </CardContent>
            <CardFooter className="border-t border-white/5 pt-6">
                <Button
                    onClick={handleSave}
                    disabled={updateLoading}
                    className="bg-primary hover:bg-primary/90"
                >
                    {updateLoading ? (
                        <>
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            جاري الحفظ...
                        </>
                    ) : (
                        <>
                            <Save className="ml-2 h-4 w-4" />
                            حفظ الإعدادات
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default PixelTabContent;
