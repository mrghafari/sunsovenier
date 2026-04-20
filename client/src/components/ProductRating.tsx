import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import StarRating from './StarRating';
import { User, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCustomer } from '@/hooks/useCustomer';

interface Review {
  id: number;
  customerId: number;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ProductRatingProps {
  productId: number;
  productName: string;
  averageRating: number;
  totalReviews: number;
  reviews: Review[];
  onAddReview?: (review: { rating: number; comment: string; reviewerName?: string; reviewerEmail?: string }) => Promise<void>;
}

export default function ProductRating({
  productId,
  productName,
  averageRating,
  totalReviews,
  reviews,
  onAddReview
}: ProductRatingProps) {
  const { toast } = useToast();
  const { t, direction } = useLanguage();
  const [newRating, setNewRating] = React.useState(0);
  const [newComment, setNewComment] = React.useState('');
  const [guestName, setGuestName] = React.useState('');
  const [guestEmail, setGuestEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  const { customer, isLoading: isLoadingCustomer } = useCustomer();

  const existingReview = React.useMemo(() => {
    if (!customer) return null;
    return reviews.find(review => review.customerId === customer.id) || null;
  }, [reviews, customer]);

  React.useEffect(() => {
    if (isEditing && existingReview) {
      setNewRating(existingReview.rating);
      setNewComment(existingReview.comment);
    } else if (!isEditing) {
      setNewRating(0);
      setNewComment('');
    }
  }, [isEditing, existingReview]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newRating === 0) {
      toast({ title: t.error, description: t.rating, variant: 'destructive' });
      return;
    }

    if (!customer && guestName.trim().length === 0) {
      toast({ title: t.error, description: 'لطفاً نام خود را وارد کنید', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (onAddReview) {
        await onAddReview({
          rating: newRating,
          comment: newComment.trim(),
          reviewerName: customer ? undefined : guestName.trim(),
          reviewerEmail: customer ? undefined : (guestEmail.trim() || undefined),
        });
      }
      setNewRating(0);
      setNewComment('');
      setGuestName('');
      setGuestEmail('');
      setIsEditing(false);
      toast({
        title: isEditing ? t.reviewUpdated : t.reviewSubmitted,
        description: isEditing ? t.reviewUpdatedDesc : t.reviewSubmittedDesc,
      });
    } catch (error: any) {
      const msg = error?.message || t.reviewErrorDesc;
      toast({ title: t.reviewError, description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6" dir={direction}>
      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t.productReviewsFor} {productName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{averageRating.toFixed(1)}</div>
              <StarRating rating={averageRating} size="lg" />
            </div>
            <div className="text-gray-600">
              <div className="text-lg font-semibold">{totalReviews} {t.totalReviewsCount}</div>
              <div className="text-sm">{t.customerFeedback}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Review Form */}
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? t.editReview : t.addYourReview}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCustomer ? (
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <>
              {/* Show existing review info for logged-in customers */}
              {customer && existingReview && !isEditing && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-blue-800">{t.yourPreviousReview}</h3>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="text-blue-600 border-blue-300 hover:bg-blue-100">
                      {t.editReview}
                    </Button>
                  </div>
                  <StarRating rating={existingReview.rating} size="sm" />
                  <p className="text-gray-700 mt-2">{existingReview.comment}</p>
                  <p className="text-xs text-gray-500 mt-2">{t.postedOn} {formatDate(existingReview.createdAt)}</p>
                </div>
              )}

              {/* Form — visible to everyone (logged-in or guest), hidden only when logged-in customer already reviewed and not editing */}
              {(!customer || !existingReview || isEditing) && (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Guest fields */}
                  {!customer && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="guestName">نام <span className="text-red-500">*</span></Label>
                        <Input
                          id="guestName"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="نام شما"
                          className="mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="guestEmail">ایمیل (اختیاری)</Label>
                        <Input
                          id="guestEmail"
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="mt-1"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}

                  {customer && (
                    <p className="text-sm text-gray-600">{t.reviewingAs} {customer.firstName} {customer.lastName}</p>
                  )}

                  <div>
                    <Label>{t.rating} <span className="text-red-500">*</span></Label>
                    <div className="mt-2">
                      <StarRating rating={newRating} size="lg" interactive onRatingChange={setNewRating} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="comment">{t.comment}</Label>
                    <Textarea
                      id="comment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={isEditing ? t.editYourReview : t.writeReview}
                      className="mt-1"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? t.loading : (isEditing ? t.updateReview : t.submitReview)}
                    </Button>
                    {isEditing && (
                      <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setNewRating(0); setNewComment(''); }} disabled={isSubmitting}>
                        {t.cancel}
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>{t.customerReviews}</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{t.noReviewsYet}</p>
              <p className="text-sm">{t.beFirstToReview}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const isOwnReview = customer && review.customerId === customer.id;
                return (
                  <div key={review.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isOwnReview ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <User className={`w-5 h-5 ${isOwnReview ? 'text-blue-600' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${isOwnReview ? 'text-blue-700' : ''}`}>
                              {review.customerName}
                              {isOwnReview && <span className="text-xs text-blue-600 mr-1">({t.you})</span>}
                            </span>
                            <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
                          </div>
                          {isOwnReview && !isEditing && (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="text-blue-600 border-blue-300 hover:bg-blue-100">
                              {t.edit}
                            </Button>
                          )}
                        </div>
                        <StarRating rating={review.rating} size="sm" />
                        {review.comment && <p className="mt-2 text-gray-700">{review.comment}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
