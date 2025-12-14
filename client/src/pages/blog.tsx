import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ArrowRight,
  Eye,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  BookOpen,
  Sparkles,
} from "lucide-react";
import OpenGraphTags from "@/components/seo/OpenGraphTags";
import CanonicalUrl from "@/components/seo/CanonicalUrl";

export default function Blog() {
  const { t, language, direction } = useLanguage();
  const [, navigate] = useLocation();
  
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [page, setPage] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const limit = 9;
  const offset = page * limit;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: blogData, isLoading } = useQuery({
    queryKey: ['/api/blog', language, page, debouncedSearch, selectedTag],
    queryFn: async () => {
      const params = new URLSearchParams({
        language,
        limit: limit.toString(),
        offset: offset.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(selectedTag && { tag: selectedTag }),
      });
      
      const response = await fetch(`/api/blog?${params}`);
      if (!response.ok) throw new Error('Failed to fetch blog posts');
      return response.json();
    },
  });

  const posts = blogData?.posts || [];
  const total = blogData?.total || 0;
  const availableTags = blogData?.tags || [];
  const totalPages = Math.ceil(total / limit);

  const featuredPost = posts.length > 0 && page === 0 && !debouncedSearch && !selectedTag ? posts[0] : null;
  const regularPosts = featuredPost ? posts.slice(1) : posts;

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? "" : tag);
    setPage(0);
  };

  const handleReadMore = (slug: string) => {
    navigate(`/blog/${slug}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (language === 'ar') {
      return format(date, 'dd MMMM yyyy', { locale: ar });
    }
    return format(date, 'MMM dd, yyyy');
  };

  const truncateExcerpt = (text: string, maxLength = 150) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const getReadingTime = (content: string) => {
    if (!content) return 0;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / 200);
  };

  const getFallbackImage = (index: number = 0) => {
    const colors = ['1e3a5f', '2d5a3d', '5a2d4d', '4a3d2d', '2d3d5a'];
    const color = colors[index % colors.length];
    return `https://via.placeholder.com/800x400/${color}/ffffff?text=Momtazchem+Blog`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>
      <CanonicalUrl path="/blog" />
      <OpenGraphTags
        title="Blog - Chemical Industry Insights | Momtazchem"
        description="Latest articles, guides, and insights about chemical solutions, fuel additives, water treatment, and industrial chemicals from Momtazchem experts."
        type="website"
        url="/blog"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white py-24" data-testid="blog-hero">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">{"Latest Industry Insights"}</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-purple-100" data-testid="blog-title">
              {t.blog.title}
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed" data-testid="blog-subtitle">
              {t.blog.subtitle}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 mt-12">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold">{total}+</div>
                  <div className="text-sm text-blue-200">{"Articles"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold">{availableTags.length}</div>
                  <div className="text-sm text-blue-200">{"Categories"}</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16 max-w-7xl">
        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-20" />
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2">
              <Search className={`absolute ${direction === 'rtl' ? 'right-5' : 'left-5'} top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5`} />
              <Input
                type="text"
                placeholder={t.blog.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full ${direction === 'rtl' ? 'pr-14' : 'pl-14'} py-6 text-lg border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0`}
                data-testid="blog-search-input"
              />
            </div>
          </div>
        </motion.div>

        {/* Tag Filter */}
        {availableTags.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <div className="flex flex-wrap gap-3 justify-center" data-testid="blog-tag-filter">
              <Button
                variant={selectedTag === "" ? "default" : "outline"}
                onClick={() => handleTagClick("")}
                className="rounded-full px-6 py-2 transition-all duration-300 hover:scale-105"
                data-testid="tag-all"
              >
                {t.blog.allTags}
              </Button>
              {availableTags.map((tag: string) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  onClick={() => handleTagClick(tag)}
                  className="rounded-full px-6 py-2 transition-all duration-300 hover:scale-105"
                  data-testid={`tag-${tag}`}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-8" data-testid="blog-loading">
            <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden rounded-2xl">
                  <Skeleton className="h-56 w-full" />
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && posts.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24" 
            data-testid="blog-empty-state"
          >
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Search className="h-12 w-12 text-blue-500" />
              </div>
              <h3 className="text-3xl font-bold mb-4 text-slate-900 dark:text-slate-100">
                {t.blog.noPostsFound}
              </h3>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                {t.blog.noPostsMessage}
              </p>
            </div>
          </motion.div>
        )}

        {/* Featured Post */}
        {!isLoading && featuredPost && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-16"
          >
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-600 dark:text-blue-400">{"Featured Article"}</span>
            </div>
            
            <Card 
              className="overflow-hidden rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 cursor-pointer group border-0 bg-white dark:bg-slate-800"
              onClick={() => handleReadMore(featuredPost.slug)}
              data-testid={`blog-featured-${featuredPost.id}`}
            >
              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative h-80 md:h-auto overflow-hidden">
                  <img
                    src={featuredPost.featuredImage || getFallbackImage(0)}
                    alt={featuredPost.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getFallbackImage(0);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden" />
                </div>
                
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  {featuredPost.tags && featuredPost.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {featuredPost.tags.slice(0, 3).map((tag: string) => (
                        <Badge 
                          key={tag}
                          className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {featuredPost.title}
                  </h2>
                  
                  <p className="text-lg text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                    {truncateExcerpt(featuredPost.excerpt, 200)}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 dark:text-slate-400 mb-8">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{featuredPost.authorName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{featuredPost.publishDate ? formatDate(featuredPost.publishDate) : formatDate(featuredPost.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>{featuredPost.viewCount || 0} {t.blog.views}</span>
                    </div>
                  </div>
                  
                  <Button className="w-fit group/btn rounded-full px-8 py-6 text-base">
                    <span>{t.blog.readMore}</span>
                    <ArrowRight className={`h-5 w-5 ${direction === 'rtl' ? 'mr-2 group-hover/btn:-translate-x-2' : 'ml-2 group-hover/btn:translate-x-2'} transition-transform`} />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Blog Cards Grid */}
        {!isLoading && regularPosts.length > 0 && (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
              data-testid="blog-grid"
            >
              {regularPosts.map((post: any, index: number) => (
                <motion.div key={post.id} variants={itemVariants}>
                  <Card 
                    className="overflow-hidden rounded-2xl hover:shadow-xl transition-all duration-500 flex flex-col h-full cursor-pointer group border-0 bg-white dark:bg-slate-800 shadow-lg"
                    onClick={() => handleReadMore(post.slug)}
                    data-testid={`blog-card-${post.id}`}
                  >
                    {/* Featured Image */}
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={post.featuredImage || getFallbackImage(index + 1)}
                        alt={post.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getFallbackImage(index + 1);
                        }}
                        data-testid={`blog-image-${post.id}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Reading time badge */}
                      <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{getReadingTime(post.content || post.excerpt) || 3} {t.blogPost?.minutes || "min"}</span>
                      </div>
                      
                      {/* Tags on image */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex flex-wrap gap-2">
                            {post.tags.slice(0, 2).map((tag: string) => (
                              <Badge 
                                key={tag}
                                className="bg-white/90 text-slate-700 text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <CardHeader className="flex-grow p-6">
                      {/* Title */}
                      <CardTitle 
                        className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                        data-testid={`blog-title-${post.id}`}
                      >
                        {post.title}
                      </CardTitle>

                      {/* Excerpt */}
                      <CardDescription 
                        className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed"
                        data-testid={`blog-excerpt-${post.id}`}
                      >
                        {truncateExcerpt(post.excerpt)}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6 pt-0">
                      {/* Meta Information */}
                      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-4 mb-4">
                        <div className="flex items-center gap-2" data-testid={`blog-author-${post.id}`}>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {(post.authorName || 'M')[0].toUpperCase()}
                          </div>
                          <span className="font-medium">{post.authorName}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1" data-testid={`blog-date-${post.id}`}>
                            <Calendar className="h-3 w-3" />
                            {post.publishDate ? formatDate(post.publishDate) : formatDate(post.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Read More Button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReadMore(post.slug);
                        }}
                        className="w-full group/btn rounded-full"
                        data-testid={`blog-read-more-${post.id}`}
                      >
                        <span>{t.blog.readMore}</span>
                        <ArrowRight className={`h-4 w-4 ${direction === 'rtl' ? 'mr-2 group-hover/btn:-translate-x-1' : 'ml-2 group-hover/btn:translate-x-1'} transition-transform`} />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* Pagination */}
        {!isLoading && posts.length > 0 && totalPages > 1 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-4"
            data-testid="blog-pagination"
          >
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="gap-2 rounded-full px-6"
              data-testid="pagination-previous"
            >
              {direction === 'rtl' ? (
                <>
                  <span>{t.blog.previousPage}</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>{t.blog.previousPage}</span>
                </>
              )}
            </Button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i;
                if (totalPages > 5) {
                  if (page <= 2) pageNum = i;
                  else if (page >= totalPages - 3) pageNum = totalPages - 5 + i;
                  else pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    onClick={() => setPage(pageNum)}
                    className="w-10 h-10 rounded-full p-0"
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="gap-2 rounded-full px-6"
              data-testid="pagination-next"
            >
              {direction === 'rtl' ? (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>{t.blog.nextPage}</span>
                </>
              ) : (
                <>
                  <span>{t.blog.nextPage}</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
