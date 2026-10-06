import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { ar, faIR } from "date-fns/locale";
import { marked } from "marked";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  Share2,
  Link as LinkIcon,
  User,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Twitter,
  Linkedin,
  BookOpen,
  MessageCircle,
  Heart,
} from "lucide-react";
import ArticleSchema from "@/components/seo/ArticleSchema";
import OpenGraphTags from "@/components/seo/OpenGraphTags";
import CanonicalUrl from "@/components/seo/CanonicalUrl";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { useToast } from "@/hooks/use-toast";
import type { Language } from "@/lib/i18n";

marked.setOptions({
  breaks: true,
  gfm: true,
});

export default function BlogPost() {
  const { slug } = useParams();
  const { t, language, direction } = useLanguage();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const pageCopy = {
    en: { blog: "Blog", author: "Author", helpful: "Did you find this article helpful?", authorBio: "Chemical industry expert and content creator at Momtazchem" },
    ar: { blog: "المدونة", author: "الكاتب", helpful: "هل وجدت هذه المقالة مفيدة؟", authorBio: "خبير في الصناعات الكيميائية وصانع محتوى في Momtazchem" },
    tr: { blog: "Blog", author: "Yazar", helpful: "Bu makaleyi faydalı buldunuz mu?", authorBio: "Momtazchem'de kimya sektörü uzmanı ve içerik üreticisi" },
    fa: { blog: "بلاگ", author: "نویسنده", helpful: "آیا این مقاله برای شما مفید بود؟", authorBio: "کارشناس صنایع شیمیایی و تولیدکننده محتوا در ممتازکم" },
  }[language];
  const [activeHeading, setActiveHeading] = useState<string>("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['/api/blog/', slug, language],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');
      const response = await fetch(`/api/blog/${slug}?language=${language}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Post not found');
        }
        throw new Error('Failed to fetch blog post');
      }
      const json = await response.json();
      if (!json.success || !json.data) {
        throw new Error('Invalid response');
      }
      // Flatten translation data for easier access
      const { translation, ...postData } = json.data;
      return {
        ...postData,
        translationLanguage: translation?.language || language,
        availableLanguages: json.data.availableLanguages || [],
        title: translation?.title || '',
        slug: translation?.slug || '',
        excerpt: translation?.excerpt || '',
        content: translation?.content || '',
        metaTitle: translation?.metaTitle,
        metaDescription: translation?.metaDescription,
      };
    },
    enabled: !!slug,
  });

  const { data: relatedPosts } = useQuery({
    queryKey: ['/api/blog/', post?.id, 'related', language],
    queryFn: async () => {
      if (!post?.id) return [];
      const response = await fetch(`/api/blog-related/${post.id}?language=${language}`);
      if (!response.ok) return [];
      const json = await response.json();
      if (!json.success || !Array.isArray(json.data)) return [];
      return json.data.map(({ translation, ...relatedPost }: any) => ({
        ...relatedPost,
        title: translation?.title || '',
        slug: translation?.slug || '',
        excerpt: translation?.excerpt || '',
      }));
    },
    enabled: !!post?.id,
  });

  useEffect(() => {
    if (post?.slug && slug !== post.slug) {
      window.history.replaceState(null, "", `/blog/${post.slug}`);
    }
  }, [post?.slug, slug]);

  const { htmlContent, tableOfContents } = useMemo(() => {
    if (!post?.content) return { htmlContent: '', tableOfContents: [] };

    const toc: Array<{ id: string; text: string; level: number }> = [];
    let idCounter = 0;

    const renderer = new marked.Renderer();
    renderer.heading = ({ tokens, depth }: { tokens: any[]; depth: number }) => {
      const text = tokens.map((t: any) => t.text || '').join('');
      const id = `heading-${idCounter++}`;
      
      if (depth === 2 || depth === 3) {
        toc.push({ id, text, level: depth });
      }
      
      return `<h${depth} id="${id}" class="scroll-mt-24">${text}</h${depth}>`;
    };

    marked.setOptions({ renderer });
    const html = marked.parse(post.content);

    return { htmlContent: html, tableOfContents: toc };
  }, [post?.content]);

  const readingTime = useMemo(() => {
    if (!post?.content) return 0;
    const wordCount = post.content.split(/\s+/).length;
    return Math.ceil(wordCount / 200);
  }, [post?.content]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    if (language === 'ar' || language === 'fa') {
      return format(date, 'dd MMMM yyyy', { locale: language === 'fa' ? faIR : ar });
    }
    return format(date, 'MMMM dd, yyyy');
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: t.blogPost.linkCopied,
        description: t.blogPost.linkCopiedMessage,
      });
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeading(id);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const headings = tableOfContents.map(item => document.getElementById(item.id));
      const scrollPosition = window.scrollY + 120;

      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading && heading.offsetTop <= scrollPosition) {
          setActiveHeading(tableOfContents[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tableOfContents]);

  const shareOnSocial = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(post?.title || '');
    
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`,
    };
    
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>
        <div className="w-full h-[500px] bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-4"
          data-testid="blog-post-not-found"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/50 dark:to-orange-900/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-slate-900 dark:text-slate-100">
            {t.blogPost.notFound}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            {t.blogPost.notFoundMessage}
          </p>
          <Button 
            onClick={() => navigate('/blog')} 
            className="rounded-full px-8 py-6"
            data-testid="button-back-to-blog"
          >
            <ArrowLeft className={`h-5 w-5 ${direction === 'rtl' ? 'ml-2 rotate-180' : 'mr-2'}`} />
            {t.blogPost.backToBlog}
          </Button>
        </motion.div>
      </div>
    );
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const articleLanguage = post.translationLanguage || language;
  const articleDirection = articleLanguage === "ar" || articleLanguage === "fa" ? "rtl" : "ltr";
  const languageNamesForNotice: Record<Language, string> = {
    en: "English",
    ar: "العربية",
    tr: "Türkçe",
    fa: "فارسی",
  };
  const fallbackNoticeCopy = {
    en: `This article is shown in ${({ en: "English", ar: "Arabic", tr: "Turkish", fa: "Persian" } as Record<string, string>)[articleLanguage] || articleLanguage} because a translation in ${languageNamesForNotice[language]} is not available.`,
    ar: `تُعرض هذه المقالة باللغة ${{ en: "الإنجليزية", ar: "العربية", tr: "التركية", fa: "الفارسية" }[articleLanguage as Language]} لعدم توفر ترجمة باللغة ${languageNamesForNotice[language]}.`,
    tr: `Bu makale, ${languageNamesForNotice[language]} çevirisi bulunmadığı için ${{ en: "İngilizce", ar: "Arapça", tr: "Türkçe", fa: "Farsça" }[articleLanguage as Language]} olarak gösteriliyor.`,
    fa: `این مقاله به زبان ${{ en: "انگلیسی", ar: "عربی", tr: "ترکی", fa: "فارسی" }[articleLanguage as Language]} نمایش داده می‌شود، زیرا ترجمهٔ ${languageNamesForNotice[language]} موجود نیست.`,
  }[language];

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>
      <CanonicalUrl path={`/blog/${slug}`} />
      <ArticleSchema
        headline={post.title}
        description={post.excerpt || post.title}
        image={post.featuredImage}
        datePublished={post.publishDate || post.createdAt}
        dateModified={post.updatedAt}
        author={post.authorName || 'Momtazchem'}
        url={currentUrl}
        tags={post.tags || []}
      />
      <OpenGraphTags
        title={`${post.title} | Momtazchem Blog`}
        description={post.excerpt || post.title}
        type="article"
        image={post.featuredImage}
        url={currentUrl}
        publishedTime={post.publishDate || post.createdAt}
        modifiedTime={post.updatedAt}
        author={post.authorName}
        tags={post.tags || []}
      />
      
      <title>{post.title} | Momtazchem Blog</title>
      <meta name="description" content={post.excerpt || post.title} />

      {/* Hero Section */}
      <section
        className="relative w-full min-h-[500px] flex items-end"
        data-testid="blog-post-hero"
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: post.featuredImage
              ? `url(${post.featuredImage})`
              : 'linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 50%, #1a1a2e 100%)',
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
        
        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Hero Content */}
        <div className="relative container mx-auto px-4 py-16 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Breadcrumbs */}
            <div className="mb-8">
              <Breadcrumbs
                items={[
                  { label: pageCopy.blog, href: '/blog' },
                  { label: post.title },
                ]}
                className="text-white/80"
              />
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6" data-testid="blog-post-tags">
                {post.tags.map((tag: string) => (
                  <Badge
                    key={tag}
                    className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-1"
                    data-testid={`blog-post-tag-${tag}`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Title */}
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 max-w-4xl leading-tight"
              data-testid="blog-post-title"
              lang={articleLanguage}
              dir={articleDirection}
            >
              {post.title}
            </h1>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-6 text-white/90">
              {/* Author */}
              <div className="flex items-center gap-3" data-testid="blog-post-author">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                  {(post.authorName || 'M')[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{post.authorName || 'Momtazchem'}</div>
                  <div className="text-sm text-white/70">{t.blog.by} {pageCopy.author}</div>
                </div>
              </div>

              <div className="hidden md:block w-px h-8 bg-white/30" />

              {/* Date */}
              <div className="flex items-center gap-2" data-testid="blog-post-date">
                <Calendar className="h-5 w-5" />
                <span>{formatDate(post.publishDate || post.createdAt)}</span>
              </div>

              {/* Reading Time */}
              {readingTime > 0 && (
                <div className="flex items-center gap-2" data-testid="blog-post-reading-time">
                  <Clock className="h-5 w-5" />
                  <span>{readingTime} {t.blogPost.minutes}</span>
                </div>
              )}

              {/* Views */}
              <div className="flex items-center gap-2" data-testid="blog-post-views">
                <Eye className="h-5 w-5" />
                <span>{post.viewCount || 0} {t.blog.views}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Article Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-8"
          >
            {/* Social Share Bar - Sticky on Desktop */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">{t.blogPost.share}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shareOnSocial('facebook')}
                  className="rounded-full w-10 h-10 p-0"
                  data-testid="button-share-facebook"
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shareOnSocial('twitter')}
                  className="rounded-full w-10 h-10 p-0"
                  data-testid="button-share-twitter"
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shareOnSocial('linkedin')}
                  className="rounded-full w-10 h-10 p-0"
                  data-testid="button-share-linkedin"
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="rounded-full px-4"
                  data-testid="button-copy-link"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  {t.blogPost.copyLink}
                </Button>
              </div>
            </div>

            {/* Article Body */}
            {articleLanguage !== language && (
              <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100" role="status">
                {fallbackNoticeCopy}
              </p>
            )}
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900" lang={articleLanguage} dir={articleDirection}>
              <CardContent className="p-8 md:p-12">
                <article
                  className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-a:text-blue-600 prose-img:rounded-2xl prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/20 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                  data-testid="blog-post-content"
                  lang={articleLanguage}
                  dir={articleDirection}
                />
              </CardContent>
            </Card>

            {/* Article Footer */}
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Heart className="h-6 w-6 text-red-500" />
                  <span className="text-slate-700 dark:text-slate-300">{pageCopy.helpful}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="rounded-full"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    {t.blogPost.shareArticle}
                  </Button>
                </div>
              </div>
            </div>

            {/* Previous/Next Navigation */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
              {post.previousPost && (
                <Card
                  className="cursor-pointer hover:shadow-xl transition-all duration-300 rounded-2xl border-0 bg-white dark:bg-slate-800 group overflow-hidden"
                  onClick={() => navigate(`/blog/${post.previousPost.slug}`)}
                  data-testid="blog-post-previous"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-3">
                      <ChevronLeft className={`h-4 w-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
                      <span>{t.blogPost.previousPost}</span>
                    </div>
                    <h3 className="font-bold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {post.previousPost.title}
                    </h3>
                  </CardContent>
                </Card>
              )}

              {post.nextPost && (
                <Card
                  className="cursor-pointer hover:shadow-xl transition-all duration-300 rounded-2xl border-0 bg-white dark:bg-slate-800 group overflow-hidden md:text-right"
                  onClick={() => navigate(`/blog/${post.nextPost.slug}`)}
                  data-testid="blog-post-next"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-3 justify-end">
                      <span>{t.blogPost.nextPost}</span>
                      <ChevronRight className={`h-4 w-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
                    </div>
                    <h3 className="font-bold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {post.nextPost.title}
                    </h3>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Back to Blog */}
            <div className="mt-12 text-center">
              <Button
                variant="outline"
                onClick={() => navigate('/blog')}
                className="rounded-full px-8 py-6"
                data-testid="button-back-to-blog-bottom"
              >
                <ArrowLeft className={`h-5 w-5 ${direction === 'rtl' ? 'ml-2 rotate-180' : 'mr-2'}`} />
                {t.blogPost.backToBlog}
              </Button>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-4 space-y-8"
          >
            {/* Author Card */}
            <Card className="rounded-3xl border-0 shadow-xl overflow-hidden bg-white dark:bg-slate-900" data-testid="blog-post-author-card">
              <div className="h-24 bg-gradient-to-r from-blue-600 to-purple-600" />
              <CardContent className="pt-0 -mt-12 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mx-auto border-4 border-white dark:border-slate-900 shadow-xl">
                  {(post.authorName || 'M')[0].toUpperCase()}
                </div>
                <h3 className="font-bold text-xl mt-4">{post.authorName || 'Momtazchem'}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  {pageCopy.authorBio}
                </p>
              </CardContent>
            </Card>

            {/* Table of Contents */}
            {tableOfContents.length > 0 && (
              <Card className="rounded-3xl border-0 shadow-xl sticky top-24 bg-white dark:bg-slate-900" data-testid="blog-post-toc">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    {t.blogPost.tableOfContents}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <nav className="space-y-1">
                    {tableOfContents.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToHeading(item.id)}
                        className={`block w-full ${direction === 'rtl' ? 'text-right' : 'text-left'} text-sm py-2 px-3 rounded-lg transition-all duration-200 ${
                          item.level === 3 ? (direction === 'rtl' ? 'pr-6' : 'pl-6') : ''
                        } ${
                          activeHeading === item.id
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        data-testid={`toc-item-${item.id}`}
                      >
                        {item.text}
                      </button>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            )}

            {/* Related Posts */}
            {relatedPosts && relatedPosts.length > 0 && (
              <Card className="rounded-3xl border-0 shadow-xl bg-white dark:bg-slate-900" data-testid="blog-post-related">
                <CardHeader>
                  <CardTitle>{t.blogPost.relatedPosts}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {relatedPosts.slice(0, 4).map((relatedPost: any, index: number) => (
                    <div key={relatedPost.id}>
                      <div
                        className="cursor-pointer group flex gap-4"
                        onClick={() => navigate(`/blog/${relatedPost.slug}`)}
                        data-testid={`related-post-${relatedPost.id}`}
                      >
                        {relatedPost.featuredImage && (
                          <img
                            src={relatedPost.featuredImage}
                            alt={relatedPost.title}
                            className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                            {relatedPost.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(relatedPost.publishDate || relatedPost.createdAt)}
                          </p>
                        </div>
                      </div>
                      {index < relatedPosts.slice(0, 4).length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
