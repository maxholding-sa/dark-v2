"use client";
import { Camera, Loader2, Upload, Search } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useRouter } from "next/navigation";
import useFetch from "@/hooks/use-fetch";
import { processAiImageSearch } from "@/actions/home";
import LoadingBar from "@/components/LoadingBar";

const HomeSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isImageSearchActive, setIsImageSearchActive] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [searchImage, setSearchImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Dropdown states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const searchRef = useRef(null);
  const router = useRouter();

  // hook
  const {
    loading: aiImageSearchLoading,
    fn: aiImageSearchFn,
    data: aiImageSearchData,
    error: aiImageSearchError,
    setData: setAiImageSearchData,
  } = useFetch(processAiImageSearch);

  const buildImageSearchUrl = (data) => {
    const params = new URLSearchParams();
    const searchQuery =
      data.searchQuery || [data.make, data.model].filter(Boolean).join(" ").trim();

    if (searchQuery) {
      params.set("search", searchQuery);
    }

    if (!params.toString()) {
      return null;
    }

    params.set("page", "1");
    return `/cars?${params.toString()}`;
  };

  // Fetch suggestions from database/API
  useEffect(() => {
    const fetchSuggestions = async () => {
      const query = searchTerm.trim();
      if (query.length > 0) {
        setLoadingSuggestions(true);
        try {
          const response = await fetch(
            `/api/search-suggestions?q=${encodeURIComponent(query)}`
          );
          if (!response.ok) throw new Error("Failed to fetch suggestions");

          const data = await response.json();

          setSuggestions(data.suggestions || []);
          setShowSuggestions(data.suggestions && data.suggestions.length > 0);
        } catch (error) {
          console.error("Error fetching suggestions:", error);
          setSuggestions([]);
          setShowSuggestions(false);
        } finally {
          setLoadingSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      setActiveSuggestionIndex(-1);
    };

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      fetchSuggestions();
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // handle server action errors
  useEffect(() => {
    if (aiImageSearchError) {
      toast.error(
        aiImageSearchError.message || "فشل تحليل الصورة"
      );
      setIsSearching(false);
      window.dispatchEvent(new CustomEvent('stopLoading'));
    }
  }, [aiImageSearchError]);

  // handle success image search
  useEffect(() => {
    if (aiImageSearchData) {
      // Handle error response from server
      if (!aiImageSearchData.success) {
        toast.error(aiImageSearchData.error || "فشل تحليل الصورة");
        setIsSearching(false);
        window.dispatchEvent(new CustomEvent('stopLoading'));
        return;
      }

      // Handle success
      if (aiImageSearchData.success && aiImageSearchData.data) {
        const targetUrl = buildImageSearchUrl(aiImageSearchData.data);

        if (!targetUrl) {
          toast.error("لم نتمكن من استخراج بيانات بحث واضحة من الصورة");
          setIsSearching(false);
          window.dispatchEvent(new CustomEvent('stopLoading'));
          return;
        }

        setIsSearching(false);
        window.dispatchEvent(new CustomEvent('stopLoading'));
        router.push(targetUrl);
      }
    }
  }, [aiImageSearchData, router]);

  // handling image input
  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];

    if (file.size > 5 * 1024 * 1024) {
      toast.error("يجب أن يكون حجم الصورة أقل من 5 ميجابايت");
      return;
    }

    setIsUploading(true);
    setSearchImage(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setIsUploading(false);
      toast.success("تم تحميل الصورة بنجاح");
    };

    reader.onerror = () => {
      setIsUploading(false);
      toast.error("فشل في قراءة الصورة");
    };

    reader.readAsDataURL(file);
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        "image/*": [".jpeg", ".jpg", ".png"],
      },
      maxFiles: 1,
    });

  const handleTextSubmit = (e) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (!query) {
      toast.info("يرجى إدخال مصطلح البحث");
      return;
    }

    setShowSuggestions(false);
    setIsSearching(true);
    // Dispatch custom event to show loading immediately
    window.dispatchEvent(new CustomEvent('startLoading'));
    router.push(`/cars?search=${encodeURIComponent(query)}&page=1`);
  };

  const handleSuggestionClick = async (suggestion) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);

    const params = new URLSearchParams();
    params.set("search", suggestion.trim());
    params.set("page", "1");

    setIsSearching(true);
    window.dispatchEvent(new CustomEvent('startLoading'));
    router.push(`/cars?${params.toString()}`);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && activeSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[activeSuggestionIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const handleImageSearch = async (e) => {
    e.preventDefault();
    if (!searchImage) {
      toast.error("يرجى تحميل صورة أولاً");
      return;
    }

    setIsSearching(true);
    setAiImageSearchData(undefined);
    // Dispatch custom event to show loading immediately
    window.dispatchEvent(new CustomEvent('startLoading'));
    const formData = new FormData();
    formData.append("image", searchImage);

    await aiImageSearchFn(formData);
  };

  return (
    <div>
      <form onSubmit={handleTextSubmit} suppressHydrationWarning>
        {/* Desktop Search */}
        <div className="hidden md:flex relative z-30 items-center overflow-visible" ref={searchRef} suppressHydrationWarning>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              setIsInputFocused(true);
              if (searchTerm.trim() && suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => setIsInputFocused(false)}
            onKeyDown={handleKeyDown}
            type="text"
            placeholder="أدخل الماركة، الموديل، أو استخدم البحث بالصورة"
            className={`pr-8 pl-8 py-6 w-full rounded-full border border-white/30 bg-black/40 backdrop-blur-xl text-white placeholder:text-white/60 shadow-2xl shadow-black/40 ${isInputFocused ? "focus-visible:border-white/60 focus-visible:ring-white/20" : ""
              }`}
            suppressHydrationWarning
          />

          {/* Desktop Suggestions Dropdown */}
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-[100]">
              {loadingSuggestions ? (
                <div className="px-6 py-4 text-center text-gray-500">
                  <LoadingBar fullScreen={false} size="sm" />
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`px-6 py-3 cursor-pointer transition-colors flex items-center gap-3 ${index === activeSuggestionIndex
                      ? "bg-gray-100"
                      : "hover:bg-gray-50"
                      } ${index === 0 ? "rounded-t-2xl" : ""} ${index === suggestions.length - 1 ? "rounded-b-2xl" : ""
                      }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSuggestionClick(suggestion);
                    }}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                  >
                    <Search size={16} className="text-gray-400" />
                    <span className="text-gray-700">{suggestion}</span>
                  </div>
                ))
              ) : null}
            </div>
          )}

          <div className="absolute left-[70px]">
            <button
              type="button"
              onClick={() => setIsImageSearchActive(!isImageSearchActive)}
              className="cursor-pointer rounded-xl p-1.5 transition-colors"
              style={{
                background: isImageSearchActive ? "black" : "transparent",
                color: isImageSearchActive ? "white" : "inherit",
              }}
              aria-label="البحث بالصورة"
            >
              <Camera size={30} />
            </button>
          </div>

          <Button type="submit" className="absolute left-2 rounded-full" suppressHydrationWarning>
            بحث
          </Button>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden flex flex-col gap-2 px-4 items-center" suppressHydrationWarning>
          <div className="relative z-30 w-full overflow-visible" ref={searchRef}>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                setIsInputFocused(true);
                if (searchTerm.trim() && suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => setIsInputFocused(false)}
              onKeyDown={handleKeyDown}
              type="text"
              placeholder="أدخل الماركة، الموديل، أو استخدم البحث بالصورة"
              className={`pr-4 pl-4 py-4 w-full rounded-full border border-white/30 bg-black/40 backdrop-blur-xl text-sm text-center placeholder:text-center text-white placeholder:text-white/60 shadow-2xl shadow-black/40 ${isInputFocused ? "focus-visible:border-white/60 focus-visible:ring-white/20" : ""
                }`}
              suppressHydrationWarning
            />

            {/* Mobile Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-200 max-h-64 overflow-y-auto z-[100]">
                {loadingSuggestions ? (
                  <div className="px-4 py-4 text-center text-gray-500">
                    <LoadingBar fullScreen={false} size="sm" />
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`px-4 py-3 cursor-pointer transition-colors flex items-center gap-2 text-sm ${index === activeSuggestionIndex
                        ? "bg-gray-100"
                        : "hover:bg-gray-50"
                        } ${index === 0 ? "rounded-t-2xl" : ""} ${index === suggestions.length - 1 ? "rounded-b-2xl" : ""
                        }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSuggestionClick(suggestion);
                      }}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                    >
                      <Search size={14} className="text-gray-400" />
                      <span className="text-gray-700">{suggestion}</span>
                    </div>
                  ))
                ) : null}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full rounded-full py-4 text-sm bg-yellow-600 text-black hover:bg-yellow-700" suppressHydrationWarning>
            بحث
          </Button>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setIsImageSearchActive(!isImageSearchActive)}
              className="cursor-pointer rounded-xl p-2 transition-colors"
              style={{
                background: isImageSearchActive ? "black" : "#f3f4f6",
                color: isImageSearchActive ? "white" : "black",
              }}
              aria-label="البحث بالصورة"
            >
              <Camera size={36} />
            </button>
          </div>
        </div>
      </form>

      {isImageSearchActive && (
        <div className="mt-4 px-4 md:px-0">
          <form onSubmit={handleImageSearch} suppressHydrationWarning>
            <div className="outline-1 outline-offset-1 outline-gray-600 rounded-lg p-3 md:p-4 bg-white">
              {imagePreview ? (
                <div className="flex flex-col items-center ">
                  <img
                    src={imagePreview}
                    alt="Car Preview"
                    className="h-32 md:h-40 object-contain mb-3 md:mb-4"
                  />
                  <Button
                    type="button"
                    className="cursor-pointer text-sm text-black "
                    variant="outline"
                    onClick={() => {
                      setSearchImage(null);
                      setImagePreview("");
                      toast.info("تم حذف الصورة");
                    }}
                    suppressHydrationWarning
                  >
                    حذف الصورة
                  </Button>
                </div>
              ) : (
                <div {...getRootProps()} className="cursor-pointer">
                  <input {...getInputProps()} suppressHydrationWarning />
                  <div className="flex flex-col items-center py-2 md:py-0">
                    <Upload className="h-8 w-8 md:h-12 md:w-12 text-gray-400 mb-2 " />
                    <p className="text-gray-700 text-sm md:text-base text-center px-2">
                      {isDragActive && !isDragReject
                        ? "اترك الملف هنا للتحميل"
                        : "اسحب وأفلت صورة سيارة أو انقر للاختيار"}
                    </p>
                    {isDragReject && (
                      <p className="text-red-500 mb-2 text-sm"> نوع الصورة غير صالح </p>
                    )}
                    <p className="text-gray-400 text-xs md:text-sm text-center px-2">
                      {" "}
                      الصيغ المدعومة: JPG, PNG (الحد الأقصى 5 ميجابايت){" "}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {imagePreview && (
              <Button
                className="cursor-pointer w-full mt-2 text-sm"
                type="submit"
                disabled={isUploading}
                suppressHydrationWarning
              >
                {isUploading ? (
                  <LoadingBar fullScreen={false} size="sm" />
                ) : (
                  <>
                    {aiImageSearchLoading ? (
                      <LoadingBar fullScreen={false} size="sm" />
                    ) : (
                      "ابحث باستخدام هذه الصورة"
                    )}{" "}
                  </>
                )}
              </Button>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default HomeSearch;