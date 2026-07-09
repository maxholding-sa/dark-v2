"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowRight, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import LoadingBar from "@/components/LoadingBar";

export default function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/article/public');
        const json = await res.json();
        if (json.success) {
          setArticles(json.data);
        } else {
          console.error("Error fetching articles:", json.error);
          setArticles([]);
        }
      } catch (error) {
        console.error("Error fetching articles:", error);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  if (loading) {
    return <LoadingBar />;
  }

  return (
    <div className="flex flex-col bg-black min-h-screen">
      {/* Header Section */}
       <section className="py-12 px-6 md:px-12">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            مقالات
          </h1>
          <p className="text-yellow-600 text-base max-w-2xl mx-auto">
            اكتشف مقالاتنا المفيدة عن السيارات والصيانة والنصائح العملية
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-9 px-6 md:px-12">
        <div className="container mx-auto">
          {articles.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 text-lg">لا توجد مقالات متاحة حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => (
                <Card key={article.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-300 bg-white relative h-96">
                  <Image
                    src={article.image || "/background1.jpg"}
                    alt={article.titleAr}
                    fill
                    style={{ objectFit: "cover", objectPosition: "top" }}
                    className="transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <Badge className="absolute top-4 right-4 bg-black text-white z-10">
                    مقال
                  </Badge>
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
                  <CardTitle className="text-xl font-bold line-clamp-2 mb-2">
                      {article.title}
                    </CardTitle>
                    <p className="text-gray-200 mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center text-sm text-gray-300 mb-4 space-x-4 rtl:space-x-reverse">
                      <div className="flex items-center">
                        <User className="h-4 w-4 ml-1" />
                        <span>{article.author?.name || 'فريق ماكس موتورز'}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 ml-1 mr-4" />
                        <span>{new Date(article.publishedAt).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full group bg-white/10 border-white text-white hover:bg-white hover:text-black" asChild>
                      <Link href={`/articles/${article.slug}`}>
                        اقرأ المزيد
                        <ArrowLeft className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
