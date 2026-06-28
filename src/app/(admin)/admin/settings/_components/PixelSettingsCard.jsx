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
import { Loader2, Save, BarChart3, Facebook, Chrome, Music2, Share2, MousePointer2 } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import { getPixelSettings, updatePixelSettings } from "@/actions/site-management";
import { toast } from "sonner";

const PixelSettingsCard = () => {
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
            toast.success("تم حفظ إعدادات البيكسل والتحليلات بنجاح");
        }
    }, [updateData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        await updateFn(formData);
    };

    return (
        <div dir="rtl">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        <CardTitle>البيكسل والتحليلات</CardTitle>
                    </div>
                    <CardDescription>
                        إدارة أكواد التتبع والبيكسل لمنصات الإعلانات والتحليلات
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Facebook Pixel */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Facebook className="h-4 w-4 text-blue-600" />
                                <Label htmlFor="facebookPixel">Facebook Pixel ID</Label>
                            </div>
                            <Input
                                id="facebookPixel"
                                name="facebookPixel"
                                placeholder="مثال: 123456789012345"
                                value={formData.facebookPixel}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-muted-foreground">أدخل معرف البيكسل الخاص بفيسبوك/ميتا</p>
                        </div>

                        {/* Google Analytics */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Chrome className="h-4 w-4 text-orange-500" />
                                <Label htmlFor="googleAnalytics">Google Analytics (GA4) ID</Label>
                            </div>
                            <Input
                                id="googleAnalytics"
                                name="googleAnalytics"
                                placeholder="مثال: G-XXXXXXXXXX"
                                value={formData.googleAnalytics}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-muted-foreground">أدخل معرف القياس (Measurement ID) الخاص بـ Google Analytics 4</p>
                        </div>

                        {/* Google Ads */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <MousePointer2 className="h-4 w-4 text-blue-400" />
                                <Label htmlFor="googleAdsId">Google Ads Conversion ID</Label>
                            </div>
                            <Input
                                id="googleAdsId"
                                name="googleAdsId"
                                placeholder="مثال: AW-123456789"
                                value={formData.googleAdsId}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-muted-foreground">أدخل معرف التحويل الخاص بإعلانات جوجل</p>
                        </div>

                        {/* TikTok Pixel */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Music2 className="h-4 w-4 text-black" />
                                <Label htmlFor="tiktokPixel">TikTok Pixel ID</Label>
                            </div>
                            <Input
                                id="tiktokPixel"
                                name="tiktokPixel"
                                placeholder="مثال: CXXXXXXXXXXXXXXXXXXX"
                                value={formData.tiktokPixel}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-muted-foreground">أدخل معرف البيكسل الخاص بتيك توك</p>
                        </div>

                        {/* Snapchat Pixel */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Share2 className="h-4 w-4 text-yellow-500" />
                                <Label htmlFor="snapchatPixel">Snapchat Pixel ID</Label>
                            </div>
                            <Input
                                id="snapchatPixel"
                                name="snapchatPixel"
                                placeholder="مثال: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                                value={formData.snapchatPixel}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-muted-foreground">أدخل معرف البيكسل الخاص بسناب شات</p>
                        </div>

                        {/* Microsoft Clarity */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Chrome className="h-4 w-4 text-teal-600" />
                                <Label htmlFor="microsoftClarity">Microsoft Clarity ID</Label>
                            </div>
                            <Input
                                id="microsoftClarity"
                                name="microsoftClarity"
                                placeholder="مثال: XXXXXXXXXX"
                                value={formData.microsoftClarity}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-muted-foreground">أدخل معرف المشروع الخاص بـ Microsoft Clarity</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-start border-t p-6">
                    <Button
                        onClick={handleSave}
                        disabled={updateLoading || getLoading}
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
        </div>
    );
};

export default PixelSettingsCard;
