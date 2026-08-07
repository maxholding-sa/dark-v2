"use client";

import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Star, MapPin, Car } from "lucide-react";

const ReviewCard = ({ review }) => {
  const [videoError, setVideoError] = useState(false);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? "text-gold-light fill-current" : "text-white-300"}`}
      />
    ));
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow py-0 px-0 bg-black/50 backdrop-blur-md border border-white/20">
      {/* Media Section */}
      <div className="absolute top-0 left-0 right-0 h-80 rounded-t-lg w-full overflow-hidden">
        {review.videoUrl && !videoError ? (
          <video
            src={review.videoUrl}
            controls
            className="w-full h-full object-fill"
            poster={review.imageUrl}
            onError={() => setVideoError(true)}
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            src={review.imageUrl}
            alt="Review media"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <CardContent className="px-6 py-6 pt-80">
        {/* Client Info */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">{review.clientName}</h3>
          <div className="flex items-center">
            {renderStars(review.rating)}
          </div>
        </div>

        {/* City and Car */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-300">
            <MapPin className="w-4 h-4 mr-2 ml-2" />
            <span className="text-sm">{review.city}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <Car className="w-4 h-4 mr-2 ml-2" />
            <span className="text-sm">{review.car}</span>
          </div>
        </div>

        {/* Review Text */}
        <p className="text-gray-200 text-sm leading-relaxed">{review.reviewText}</p>
      </CardContent>
    </Card>
  );
};

export default ReviewCard;
