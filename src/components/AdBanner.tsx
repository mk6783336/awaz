/**
 * Google AdSense Ad Banner Component
 * Replace the data-ad-slot and data-ad-client values with your real AdSense IDs.
 * Until then, a placeholder is shown.
 */

interface AdBannerProps {
    slot?: string;
    format?: "horizontal" | "rectangle" | "vertical";
    className?: string;
}

export default function AdBanner({ slot, format = "horizontal", className = "" }: AdBannerProps) {
    // When you have a real AdSense account, replace this with:
    // <ins className="adsbygoogle" data-ad-client="ca-pub-XXXXXXX" data-ad-slot={slot} ... />
    // and load the AdSense script in index.html

    return (
        <div className={`ad-slot ${className}`} data-ad-slot={slot || "placeholder"} data-ad-format={format}>
            <span>Ad Space</span>
        </div>
    );
}
