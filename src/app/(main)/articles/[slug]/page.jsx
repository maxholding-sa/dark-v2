"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowRight, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import LoadingBar from "@/components/LoadingBar";

export default function ArticleDetailPage() {
  const params = useParams();
  const slug = params.slug;
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/article/public/${slug}`);
        const json = await res.json();
        if (json.success) {
          setArticle(json.data);
        } else {
          setError(json.error || "Article not found");
        }
      } catch (error) {
        setError("Failed to fetch article");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  const renderContentSection = (section, index) => {
    switch (section.type) {
      case 'paragraph':
        return (
          <div key={section.id} className="mb-6">
            <p className="text-white leading-relaxed text-lg">
              {section.content}
            </p>
          </div>
        );
      case 'image':
        return (
          <div key={section.id} className="mb-8">
            <div className="relative w-full h-96 rounded-lg overflow-hidden">
              <Image
                src={section.src}
                alt={section.alt || `Image ${index + 1}`}
                fill
                style={{ objectFit: "cover" }}
                className="transition-transform duration-300 hover:scale-105"
              />
            </div>
            {section.alt && (
              <p className="text-sm text-gray-500 mt-2 text-center italic">
                {section.alt}
              </p>
            )}
          </div>
        );
      case 'video':
        return (
          <div key={section.id} className="mb-8">
            <div className="relative w-full h-96 rounded-lg overflow-hidden">
              <video
                src={section.src}
                controls
                className="w-full h-full object-cover"
              >
                متصفحك لا يدعم تشغيل الفيديو.
              </video>
            </div>
            {section.alt && (
              <p className="text-sm text-gray-500 mt-2 text-center italic">
                {section.alt}
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };



  if (loading) {
    return <LoadingBar />;
  }

  if (error || !article) {
    return (
      <div className="pt-20 flex flex-col items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">المقال غير موجود</h1>
          <p className="text-gray-400 mb-8">{error}</p>
          <Button asChild>
            <Link href="/articles">
              العودة إلى المقالات
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const contentSections = article.contentSections || [];

  return (
    <div className="flex flex-col bg-black min-h-screen">
      {/* Header Section */}
      <section className="pt-20 pb-12 px-6 md:px-12">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Link href="/articles" className="inline-flex items-center text-gray-400 hover:text-white transition-colors">
                <ArrowRight className="h-4 w-4 ml-2" />
                العودة إلى المقالات
              </Link>
            </div>

            <Badge className="mb-4 bg-white text-black">
              مقال
            </Badge>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {article.title}
            </h1>

            {article.excerpt && (
              <p className="text-xl text-gray-300 mb-6 leading-relaxed">
                {article.excerpt}
              </p>
            )}

            <div className="flex items-center text-sm text-gray-400 space-x-6 rtl:space-x-reverse">
              <div className="flex items-center ">
                <User className="h-4 w-4 ml-2 mr-2" />
                <span>{article.author?.name || 'غير محدد'}</span>
              </div>
              <div className="flex items-center ml-1">
                <Calendar className="h-4 w-4 mr-2 ml-2" />
                <span>{new Date(article.publishedAt || article.createdAt).toLocaleDateString('ar-SA')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Article Image */}
      {article.image && (
        <section className="px-6 md:px-12 mb-12">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto">
              <div className="relative w-full h-96 md:h-[500px] rounded-lg overflow-hidden">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  style={{ objectFit: "cover" }}
                  className="transition-transform duration-300 hover:scale-105"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Article Content */}
      <section className="px-6 md:px-12 pb-20">
        <div className="container mx-auto">
          <Card className="max-w-4xl mx-auto bg-black">
            <CardContent className="p-8 md:p-12">
              {contentSections.length > 0 ? (
                <div className="prose prose-lg max-w-none">
                  {contentSections.map((section, index) => renderContentSection(section, index))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-white-500 text-lg">لا يوجد محتوى للمقال</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
