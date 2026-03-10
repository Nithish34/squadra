import { Suspense } from "react";
import ReviewPageClient from "./ReviewPageClient";
import { Loader2 } from "lucide-react";

export default function ReviewPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[hsl(340,30%,98%)]">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[hsl(340,65%,65%)] mx-auto mb-3" />
                        <p className="text-sm text-[hsl(340,10%,50%)]">Loading review…</p>
                    </div>
                </div>
            }
        >
            <ReviewPageClient />
        </Suspense>
    );
}
