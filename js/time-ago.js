// Time-ago formatting with i18n support and Arabic numerals
import { getCurrentLanguage } from './i18n.js';

const timeAgoTranslations = {
  en: {
    now: 'just now',
    minute: 'minute ago',
    minutes: 'minutes ago',
    hour: 'hour ago',
    hours: 'hours ago',
    day: 'day ago',
    days: 'days ago',
    week: 'week ago',
    weeks: 'weeks ago',
    month: 'month ago',
    months: 'months ago',
    year: 'year ago',
    years: 'years ago'
  },
  ar: {
    now: 'الآن',
    minute: 'منذ دقيقة',
    minutes: 'منذ دقائق',
    hour: 'منذ ساعة',
    hours: 'منذ ساعات',
    day: 'منذ يوم',
    days: 'منذ أيام',
    week: 'منذ أسبوع',
    weeks: 'منذ أسابيع',
    month: 'منذ شهر',
    months: 'منذ أشهر',
    year: 'منذ سنة',
    years: 'منذ سنوات'
  }
};

// Arabic numerals mapping
const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

// Convert number to Arabic numerals
function toArabicNumerals(num) {
  return num.toString().replace(/\d/g, d => arabicNumerals[parseInt(d)]);
}

export function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  const lang = getCurrentLanguage();
  const t = timeAgoTranslations[lang] || timeAgoTranslations.en;
  
  if (diffInSeconds < 60) {
    return t.now;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    const num = lang === 'ar' ? toArabicNumerals(diffInMinutes) : diffInMinutes;
    return `${num} ${diffInMinutes === 1 ? t.minute : t.minutes}`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    const num = lang === 'ar' ? toArabicNumerals(diffInHours) : diffInHours;
    return `${num} ${diffInHours === 1 ? t.hour : t.hours}`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    const num = lang === 'ar' ? toArabicNumerals(diffInDays) : diffInDays;
    return `${num} ${diffInDays === 1 ? t.day : t.days}`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    const num = lang === 'ar' ? toArabicNumerals(diffInWeeks) : diffInWeeks;
    return `${num} ${diffInWeeks === 1 ? t.week : t.weeks}`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    const num = lang === 'ar' ? toArabicNumerals(diffInMonths) : diffInMonths;
    return `${num} ${diffInMonths === 1 ? t.month : t.months}`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  const num = lang === 'ar' ? toArabicNumerals(diffInYears) : diffInYears;
  return `${num} ${diffInYears === 1 ? t.year : t.years}`;
}

export function formatDate(dateString, options = {}) {
  const date = new Date(dateString);
  const lang = getCurrentLanguage();
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return date.toLocaleDateString(lang === 'ar' ? 'ar-KW' : 'en-US', { ...defaultOptions, ...options });
}
