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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2,
    Save,
    Facebook,
    Chrome,
    Music2,
    Share2,
    MousePointer2,
    Activity,
    BarChart3,
    Eye,
    LineChart,
} from "lucide-react";
import useFetch from "../../../../../../hooks/use-fetch";
import { getPixelSettings, updatePixelSettings } from "@/actions/site-management";
import { toast } from "sonner";

const PixelSettingsForm = () => {
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

    if (getLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div dir="rtl" className="space-y-6">
            <Tabs defaultValue="meta" className="w-full">
                <div className="flex justify-end mb-6">
                <TabsList dir="rtl" className="flex flex-wrap h-auto gap-1 bg-black/40 border border-white/10 p-1">
                    <TabsTrigger value="meta" className="flex items-center gap-2 data-[state=active]:bg-blue-600">
                        <Facebook className="h-4 w-4" /> Meta / FB
                    </TabsTrigger>
                    <TabsTrigger value="google" className="flex items-center gap-2 data-[state=active]:bg-orange-600">
                        <Chrome className="h-4 w-4" /> Google
                    </TabsTrigger>
                    <TabsTrigger value="tiktok" className="flex items-center gap-2 data-[state=active]:bg-pink-600">
                        <Music2 className="h-4 w-4" /> TikTok / Snap
                    </TabsTrigger>
                    <TabsTrigger value="clarity" className="flex items-center gap-2 data-[state=active]:bg-teal-600">
                        <Activity className="h-4 w-4" /> Clarity
                    </TabsTrigger>
                </TabsList>
                </div>

                {/* Meta / Facebook Tab */}
                <TabsContent value="meta">
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Facebook className="h-5 w-5 text-blue-500" />
                                <CardTitle>إعدادات فيسبوك بيكسل</CardTitle>
                            </div>
                            <CardDescription>اربط موقعك بـ Meta Pixel لتتبع حملاتك الإعلانية على فيسبوك وإنستجرام</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-w-xl">
                                <div className="space-y-2">
                                    <Label htmlFor="facebookPixel">Facebook Pixel ID</Label>
                                    <Input
                                        id="facebookPixel"
                                        name="facebookPixel"
                                        placeholder="مثال: 123456789012345"
                                        value={formData.facebookPixel}
                                        onChange={handleChange}
                                        className="bg-black/40 border-white/10"
                                    />
                                    <p className="text-xs text-muted-foreground">معرف البيكسل المكون من 15 رقم تقريبًا</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Google Tab */}
                <TabsContent value="google">
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Chrome className="h-5 w-5 text-orange-500" />
                                <CardTitle>إعدادات جوجل (Analytics & Ads)</CardTitle>
                            </div>
                            <CardDescription>تتبع حركة الزوار وقياس أداء إعلانات جوجل</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6 max-w-xl">
                                <div className="space-y-2">
                                    <Label htmlFor="googleAnalytics" className="flex items-center gap-2">
                                        <LineChart className="h-4 w-4" /> Google Analytics (GA4) ID
                                    </Label>
                                    <Input
                                        id="googleAnalytics"
                                        name="googleAnalytics"
                                        placeholder="مثال: G-XXXXXXXXXX"
                                        value={formData.googleAnalytics}
                                        onChange={handleChange}
                                        className="bg-black/40 border-white/10"
                                    />
                                    <p className="text-xs text-muted-foreground">معرف القياس الخاص بـ GA4 (يبدأ بـ G-)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="googleAdsId" className="flex items-center gap-2">
                                        <MousePointer2 className="h-4 w-4" /> Google Ads Conversion ID
                                    </Label>
                                    <Input
                                        id="googleAdsId"
                                        name="googleAdsId"
                                        placeholder="مثال: AW-123456789"
                                        value={formData.googleAdsId}
                                        onChange={handleChange}
                                        className="bg-black/40 border-white/10"
                                    />
                                    <p className="text-xs text-muted-foreground">معرف التحويل الخاص بإعلانات جوجل (يبدأ بـ AW-)</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TikTok & Snapchat Tab */}
                <TabsContent value="tiktok">
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Music2 className="h-5 w-5 text-white" />
                                <CardTitle>تيك توك وسناب شات</CardTitle>
                            </div>
                            <CardDescription>ربط أدوات التتبع للمنصات الاجتماعية الأخرى</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6 max-w-xl">
                                <div className="space-y-2 border-b border-white/5 pb-6">
                                    <Label htmlFor="tiktokPixel" className="flex items-center gap-2">
                                        <Music2 className="h-4 w-4" /> TikTok Pixel ID
                                    </Label>
                                    <Input
                                        id="tiktokPixel"
                                        name="tiktokPixel"
                                        placeholder="CXXXXXXXXXXXXXXXXXXX"
                                        value={formData.tiktokPixel}
                                        onChange={handleChange}
                                        className="bg-black/40 border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="snapchatPixel" className="flex items-center gap-2">
                                        <Share2 className="h-4 w-4 text-yellow-500" /> Snapchat Pixel ID
                                    </Label>
                                    <Input
                                        id="snapchatPixel"
                                        name="snapchatPixel"
                                        placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                                        value={formData.snapchatPixel}
                                        onChange={handleChange}
                                        className="bg-black/40 border-white/10"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Microsoft Clarity Tab */}
                <TabsContent value="clarity">
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Eye className="h-5 w-5 text-teal-400" />
                                <CardTitle>Microsoft Clarity</CardTitle>
                            </div>
                            <CardDescription>أداة تحليل سلوك المستخدم وخارطة الحرارة (Heatmaps)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-w-xl">
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
                                    <p className="text-xs text-muted-foreground">المعرف الخاص بمشروعك في Clarity</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex justify-start">
                <Button
                    onClick={handleSave}
                    disabled={updateLoading}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 min-w-[200px]"
                >
                    {updateLoading ? (
                        <>
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            جاري الحفظ...
                        </>
                    ) : (
                        <>
                            <Save className="ml-2 h-4 w-4" />
                            حفظ جميع التغييرات
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default PixelSettingsForm;
