"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Building2,
    Globe,
    Package,
    Plus,
    Trash2,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Sparkles,
    CheckCircle2,
    Tag,
    FileText,
    Upload,
    FileSpreadsheet,
    X,
    AlertCircle,
    Download,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useAuthStore, Product } from "@/store/authStore";

const INDUSTRIES = [
    "Consumer Goods", "FMCG", "Electronics", "Fashion & Apparel",
    "Food & Beverage", "Healthcare", "Home & Living", "Beauty & Personal Care",
    "Automotive", "Sports & Outdoors", "Other",
];

const STEPS = [
    { id: 1, label: "Company", icon: Building2 },
    { id: 2, label: "Products", icon: Package },
    { id: 3, label: "Ready!", icon: CheckCircle2 },
];

const emptyProduct = (): Product => ({
    id: crypto.randomUUID(),
    name: "",
    category: "",
    price: "",
    description: "",
});

// ── CSV helpers ────────────────────────────────────────────────────────────────

const SAMPLE_CSV = `name,category,price,description
Premium Hand Wash,Personal Care,299,Antibacterial formula with moisturiser
Organic Green Tea,Food & Beverage,450,100% pure Darjeeling first flush
Bamboo Toothbrush,Dental Care,149,Eco-friendly biodegradable handle
Cotton Tote Bag,Accessories,199,Reusable sustainable shopping bag`;

const downloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
};

interface ParseResult {
    products: Product[];
    warnings: string[];
    skipped: number;
}

function parseCSV(text: string): ParseResult {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
        return { products: [], warnings: ["CSV must have a header row and at least one data row."], skipped: 0 };
    }

    const headers = lines[0].split(",").map((h) =>
        h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
    );

    const col = (aliases: string[]) => {
        for (const a of aliases) {
            const idx = headers.findIndex((h) => h.includes(a));
            if (idx !== -1) return idx;
        }
        return -1;
    };

    const nameIdx = col(["name", "product", "title", "item"]);
    const catIdx = col(["category", "cat", "type", "group", "department"]);
    const priceIdx = col(["price", "cost", "mrp", "rate", "amount"]);
    const descIdx = col(["description", "desc", "details", "notes", "info"]);

    const warnings: string[] = [];
    if (nameIdx === -1) warnings.push("Could not find a 'name' column. Expected: name, product, title, or item.");
    if (catIdx === -1) warnings.push("Could not find a 'category' column. Expected: category, cat, type, or group.");

    const products: Product[] = [];
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i]
            .match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g)
            ?.map((v) => v.replace(/^"|"$/g, "").trim()) ??
            lines[i].split(",").map((v) => v.trim());

        const name = nameIdx !== -1 ? (values[nameIdx] ?? "").trim() : "";
        const category = catIdx !== -1 ? (values[catIdx] ?? "").trim() : "";

        if (!name || !category) {
            skipped++;
            continue;
        }

        const rawPrice = priceIdx !== -1 ? (values[priceIdx] ?? "") : "";
        const price = rawPrice.replace(/[^\d.]/g, "");
        const description = descIdx !== -1 ? (values[descIdx] ?? "").trim() : "";

        products.push({ id: crypto.randomUUID(), name, category, price, description });
    }

    return { products, warnings, skipped };
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
    const router = useRouter();
    const { name: userName, completeOnboarding, isAuthenticated, hasCompletedOnboarding } = useAuthStore();

    // ── Auth Guard ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) {
            router.replace("/auth");
        } else if (hasCompletedOnboarding) {
            router.replace("/dashboard");
        }
    }, [isAuthenticated, hasCompletedOnboarding, router]);

    if (!isAuthenticated) return null;


    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Company fields
    const [companyName, setCompanyName] = useState("");
    const [industry, setIndustry] = useState("");
    const [website, setWebsite] = useState("");
    const [description, setDescription] = useState("");

    // Products
    const [products, setProducts] = useState<Product[]>([emptyProduct()]);

    // CSV state
    const [isDragging, setIsDragging] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
    const [csvSkipped, setCsvSkipped] = useState(0);
    const [csvImported, setCsvImported] = useState(0);
    const [showImportBanner, setShowImportBanner] = useState(false);
    const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const addProduct = () => {
        const p = emptyProduct();
        setProducts((prev) => [...prev, p]);
        setExpandedProducts((prev) => new Set([...prev, p.id]));
    };

    const removeProduct = (id: string) => {
        setProducts((p) => p.filter((x) => x.id !== id));
        setExpandedProducts((prev) => {
            const s = new Set(prev);
            s.delete(id);
            return s;
        });
    };

    const updateProduct = (id: string, field: keyof Product, value: string) =>
        setProducts((p) => p.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

    const toggleExpand = (id: string) =>
        setExpandedProducts((prev) => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });

    const processFile = useCallback((file: File) => {
        if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
            setCsvWarnings(["Please upload a .csv file."]);
            setCsvImported(0);
            setShowImportBanner(true);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const { products: imported, warnings, skipped } = parseCSV(text);
            setCsvFile(file);
            setCsvWarnings(warnings);
            setCsvSkipped(skipped);
            setCsvImported(imported.length);
            setShowImportBanner(true);
            if (imported.length > 0) {
                setProducts((prev) => {
                    const hasBlank = prev.length === 1 && !prev[0].name && !prev[0].category;
                    return hasBlank ? imported : [...prev, ...imported];
                });
                setExpandedProducts(new Set());
            }
        };
        reader.readAsText(file);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        e.target.value = "";
    };

    const clearImport = () => {
        setCsvFile(null);
        setCsvWarnings([]);
        setCsvSkipped(0);
        setCsvImported(0);
        setShowImportBanner(false);
        setProducts([emptyProduct()]);
        setExpandedProducts(new Set());
    };

    // ── Validation ────────────────────────────────────────────────────────────
    const canProceedStep1 = companyName.trim() && industry;
    const canProceedStep2 = products.length > 0 && products.every((p) => p.name.trim() && p.category.trim());

    const handleFinish = async () => {
        setSaving(true);
        await new Promise((r) => setTimeout(r, 1000));
        completeOnboarding({ companyName, industry, website, description, products });
        router.push("/dashboard");
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[hsl(340,30%,98%)] flex flex-col">
            {/* Top bar */}
            <div className="border-b border-[hsl(340,25%,90%)] bg-white/70 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(340,65%,65%)] to-[hsl(340,70%,72%)] flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            MarketMind<span className="text-[hsl(340,65%,65%)]">AI</span>
                        </span>
                    </div>
                    <span className="text-sm text-[hsl(340,10%,50%)]">
                        👋 Welcome, <span className="font-semibold text-[hsl(340,25%,20%)]">{userName}</span>!
                    </span>
                </div>
            </div>

            <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
                {/* Step indicator */}
                <div className="flex items-center gap-0 mb-10">
                    {STEPS.map((s, i) => (
                        <div key={s.id} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-1.5">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${step > s.id
                                    ? "bg-gradient-to-br from-[hsl(130,55%,55%)] to-[hsl(130,60%,48%)] shadow-md"
                                    : step === s.id
                                        ? "bg-gradient-to-br from-[hsl(340,65%,62%)] to-[hsl(340,70%,68%)] shadow-lg"
                                        : "bg-[hsl(340,20%,92%)]"
                                    }`}>
                                    {step > s.id ? (
                                        <CheckCircle2 className="w-5 h-5 text-white" />
                                    ) : (
                                        <s.icon className={`w-5 h-5 ${step === s.id ? "text-white" : "text-[hsl(340,10%,55%)]"}`} />
                                    )}
                                </div>
                                <span className={`text-xs font-medium ${step === s.id ? "text-[hsl(340,55%,50%)]" : "text-[hsl(340,10%,55%)]"}`}>
                                    {s.label}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-3 mb-5 transition-all duration-500 ${step > s.id ? "bg-[hsl(130,55%,55%)]" : "bg-[hsl(340,20%,90%)]"}`} />
                            )}
                        </div>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* ── STEP 1 ────────────────────────────────────────────── */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.25 }}
                        >
                            <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                Tell us about your company
                            </h1>
                            <p className="text-[hsl(340,10%,50%)] text-sm mb-8">
                                This helps us tailor your AI agents and competitor tracking to your specific market.
                            </p>

                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-[hsl(340,20%,30%)] mb-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-[hsl(340,55%,60%)]" />
                                            Company Name <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="e.g. Acme Consumer Goods"
                                            className="w-full px-4 py-3 rounded-xl border border-[hsl(340,25%,88%)] bg-white text-sm placeholder-[hsl(340,10%,60%)] focus:outline-none focus:ring-2 focus:ring-[hsl(340,65%,68%)] focus:border-transparent transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-[hsl(340,20%,30%)] mb-1.5">
                                            <Tag className="w-3.5 h-3.5 text-[hsl(340,55%,60%)]" />
                                            Industry <span className="text-red-400">*</span>
                                        </label>
                                        <select
                                            value={industry}
                                            onChange={(e) => setIndustry(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-[hsl(340,25%,88%)] bg-white text-sm text-[hsl(340,25%,20%)] focus:outline-none focus:ring-2 focus:ring-[hsl(340,65%,68%)] focus:border-transparent transition appearance-none"
                                        >
                                            <option value="">Select your industry…</option>
                                            {INDUSTRIES.map((ind) => (
                                                <option key={ind} value={ind}>{ind}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-[hsl(340,20%,30%)] mb-1.5">
                                        <Globe className="w-3.5 h-3.5 text-[hsl(340,55%,60%)]" />
                                        Website
                                    </label>
                                    <input
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        placeholder="https://yourcompany.com"
                                        type="url"
                                        className="w-full px-4 py-3 rounded-xl border border-[hsl(340,25%,88%)] bg-white text-sm placeholder-[hsl(340,10%,60%)] focus:outline-none focus:ring-2 focus:ring-[hsl(340,65%,68%)] focus:border-transparent transition"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-[hsl(340,20%,30%)] mb-1.5">
                                        <FileText className="w-3.5 h-3.5 text-[hsl(340,55%,60%)]" />
                                        Company Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Briefly describe what your company does and who you sell to…"
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl border border-[hsl(340,25%,88%)] bg-white text-sm placeholder-[hsl(340,10%,60%)] focus:outline-none focus:ring-2 focus:ring-[hsl(340,65%,68%)] focus:border-transparent transition resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end mt-8">
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!canProceedStep1}
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-[hsl(340,65%,62%)] to-[hsl(340,70%,68%)] text-white font-semibold px-6 py-3 rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Continue <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 2: Products + CSV ────────────────────────────── */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.25 }}
                        >
                            <div className="flex items-start justify-between mb-1">
                                <h1 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                    Add your products
                                </h1>
                                <span className="text-xs font-semibold bg-[hsl(340,40%,94%)] text-[hsl(340,55%,52%)] px-2.5 py-1 rounded-full mt-1">
                                    {products.length} product{products.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <p className="text-[hsl(340,10%,50%)] text-sm mb-6">
                                Import a CSV file or add products manually. You can add more later from Settings.
                            </p>

                            {/* ── Drop Zone ──────────────────────────────────── */}
                            <div
                                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative cursor-pointer rounded-2xl border-2 transition-all duration-200 p-6 mb-5 ${isDragging
                                    ? "border-[hsl(340,65%,68%)] bg-[hsl(340,65%,68%,0.06)] scale-[1.01]"
                                    : "border-dashed border-[hsl(340,30%,85%)] bg-white hover:border-[hsl(340,65%,72%)] hover:bg-[hsl(340,40%,99%)]"
                                    }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={handleFileInput}
                                    className="hidden"
                                />
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${isDragging ? "bg-[hsl(340,65%,68%,0.15)]" : "bg-[hsl(340,40%,95%)]"}`}>
                                        {csvFile ? (
                                            <FileSpreadsheet className="w-7 h-7 text-[hsl(340,55%,55%)]" />
                                        ) : (
                                            <Upload className={`w-7 h-7 ${isDragging ? "text-[hsl(340,65%,62%)]" : "text-[hsl(340,30%,65%)]"}`} />
                                        )}
                                    </div>
                                    <div className="text-center sm:text-left">
                                        {csvFile ? (
                                            <>
                                                <p className="text-sm font-semibold text-[hsl(340,20%,25%)]">{csvFile.name}</p>
                                                <p className="text-xs text-[hsl(340,10%,52%)] mt-0.5">Click to replace file</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm font-semibold text-[hsl(340,20%,30%)]">
                                                    {isDragging ? "Drop your CSV here" : "Drop a CSV file, or click to browse"}
                                                </p>
                                                <p className="text-xs text-[hsl(340,10%,52%)] mt-1">
                                                    Expected columns:{" "}
                                                    {["name", "category", "price", "description"].map((c) => (
                                                        <code key={c} className="bg-[hsl(340,20%,93%)] px-1 py-0.5 rounded text-[10px] mx-0.5">{c}</code>
                                                    ))}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    <div className="sm:ml-auto flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={downloadSampleCSV}
                                            className="flex items-center gap-1.5 text-xs font-medium text-[hsl(340,55%,52%)] border border-[hsl(340,45%,82%)] bg-white px-3 py-2 rounded-lg hover:bg-[hsl(340,40%,97%)] transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5" /> Sample CSV
                                        </button>
                                        {csvFile && (
                                            <button
                                                onClick={clearImport}
                                                className="flex items-center gap-1 text-xs font-medium text-red-500 border border-red-200 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" /> Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Import banner ───────────────────────────────── */}
                            <AnimatePresence>
                                {showImportBanner && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden mb-5"
                                    >
                                        {csvImported > 0 ? (
                                            <div className="flex items-start gap-3 bg-[hsl(130,55%,97%)] border border-[hsl(130,55%,80%)] rounded-xl px-4 py-3">
                                                <CheckCircle2 className="w-4 h-4 text-[hsl(130,55%,48%)] flex-shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[hsl(130,50%,30%)]">
                                                        {csvImported} product{csvImported !== 1 ? "s" : ""} imported successfully
                                                        {csvSkipped > 0 && ` · ${csvSkipped} row${csvSkipped !== 1 ? "s" : ""} skipped (missing name or category)`}
                                                    </p>
                                                    {csvWarnings.map((w, i) => (
                                                        <p key={i} className="text-xs text-[hsl(38,70%,40%)] flex items-center gap-1 mt-0.5">
                                                            <AlertCircle className="w-3 h-3 flex-shrink-0" /> {w}
                                                        </p>
                                                    ))}
                                                </div>
                                                <button onClick={() => setShowImportBanner(false)} className="text-[hsl(130,30%,55%)] hover:text-[hsl(130,50%,35%)] flex-shrink-0">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-red-700">Import failed — no valid rows found</p>
                                                    {csvWarnings.map((w, i) => (
                                                        <p key={i} className="text-xs text-red-600 mt-0.5">{w}</p>
                                                    ))}
                                                </div>
                                                <button onClick={() => setShowImportBanner(false)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── Divider ─────────────────────────────────────── */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex-1 h-px bg-[hsl(340,20%,91%)]" />
                                <span className="text-xs text-[hsl(340,10%,55%)] font-medium">Products ({products.length})</span>
                                <div className="flex-1 h-px bg-[hsl(340,20%,91%)]" />
                            </div>

                            {/* ── Product cards ────────────────────────────────── */}
                            <div className="space-y-3">
                                <AnimatePresence>
                                    {products.map((product, idx) => {
                                        const isExpanded = expandedProducts.has(product.id);
                                        const isValid = product.name.trim() && product.category.trim();
                                        return (
                                            <motion.div
                                                key={product.id}
                                                initial={{ opacity: 0, y: 16 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className={`bg-white rounded-2xl border transition-all ${isValid ? "border-[hsl(340,25%,88%)]" : "border-[hsl(0,70%,80%)]"}`}
                                            >
                                                {/* Header row */}
                                                <div
                                                    className="flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none"
                                                    onClick={() => toggleExpand(product.id)}
                                                >
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isValid ? "bg-gradient-to-br from-[hsl(340,65%,65%,0.2)] to-[hsl(340,40%,92%)]" : "bg-red-50"}`}>
                                                        <Package className={`w-3.5 h-3.5 ${isValid ? "text-[hsl(340,55%,52%)]" : "text-red-400"}`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-[hsl(340,20%,25%)] truncate">
                                                            {product.name || <span className="text-[hsl(340,10%,60%)] font-normal italic">Product {idx + 1}</span>}
                                                        </p>
                                                        {product.category && (
                                                            <p className="text-xs text-[hsl(340,10%,55%)] truncate">
                                                                {product.category}{product.price ? ` · ₹${product.price}` : ""}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {!isValid && (
                                                            <span className="text-[10px] text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full hidden sm:inline-block">
                                                                Incomplete
                                                            </span>
                                                        )}
                                                        {products.length > 1 && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); removeProduct(product.id); }}
                                                                className="text-[hsl(340,10%,60%)] hover:text-red-500 transition-colors p-1 rounded"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {isExpanded
                                                            ? <ChevronUp className="w-4 h-4 text-[hsl(340,10%,55%)]" />
                                                            : <ChevronDown className="w-4 h-4 text-[hsl(340,10%,55%)]" />
                                                        }
                                                    </div>
                                                </div>

                                                {/* Expandable form */}
                                                <AnimatePresence initial={false}>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.22 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-5 pb-5 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[hsl(340,20%,94%)]">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-[hsl(340,20%,40%)] mb-1">
                                                                        Product Name <span className="text-red-400">*</span>
                                                                    </label>
                                                                    <input
                                                                        value={product.name}
                                                                        onChange={(e) => updateProduct(product.id, "name", e.target.value)}
                                                                        placeholder="e.g. Premium Hand Wash"
                                                                        className="w-full px-3 py-2.5 rounded-lg border border-[hsl(340,25%,88%)] bg-[hsl(340,30%,98%)] text-sm placeholder-[hsl(340,10%,62%)] focus:outline-none focus:ring-2 focus:ring-[hsl(340,65%,68%)] focus:border-transparent transition"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-[hsl(340,20%,40%)] mb-1">
                                                                        Category <span className="text-red-400">*</span>
                                                                    </label>
                                                                    <input
                                                                        value={product.category}
                                                                        onChange={(e) => updateProduct(product.id, "category", e.target.value)}
                                                                        placeholder="e.g. Personal Care"
                                                                        className="w-full px-3 py-2.5 rounded-lg border border-[hsl(340,25%,88%)] bg-[hsl(340,30%,98%)] text-sm placeholder-[hsl(340,10%,62%)] focus:outline-none focus:ring-2 focus:ring-[hsl(340,65%,68%)] focus:border-transparent transition"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-[hsl(340,20%,40%)] mb-1">Current Price (₹)</label>
                                                                    <input
                                                                        value={product.price}
                                                                        onChange={(e) => updateProduct(product.id, "price", e.target.value)}
                                                                        placeholder="e.g. 299"
                                                                        type="number"
                                                                        min="0"
                                                                        className="w-full px-3 py-2.5 rounded-lg border border-[hsl(340,25%,88%)] bg-[hsl(340,30%,98%)] text-sm placeholder-[hsl(340,10%,62%)] focus:outline-none focus:ring-2 focus:ring-[hsl(340,65%,68%)] focus:border-transparent transition"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-[hsl(340,20%,40%)] mb-1">Short Description</label>
                                                                    <input
                                                                        value={product.description}
                                                                        onChange={(e) => updateProduct(product.id, "description", e.target.value)}
                                                                        placeholder="What makes it unique?"
                                                                        className="w-full px-3 py-2.5 rounded-lg border border-[hsl(340,25%,88%)] bg-[hsl(340,30%,98%)] text-sm placeholder-[hsl(340,10%,62%)] focus:outline-none focus:ring-2 focus:ring-[hsl(340,65%,68%)] focus:border-transparent transition"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>

                                {/* Add manual */}
                                <button
                                    onClick={addProduct}
                                    className="w-full py-3 rounded-2xl border-2 border-dashed border-[hsl(340,30%,85%)] text-sm text-[hsl(340,10%,50%)] hover:border-[hsl(340,65%,72%)] hover:text-[hsl(340,55%,52%)] hover:bg-[hsl(340,40%,98%)] flex items-center justify-center gap-2 transition-all"
                                >
                                    <Plus className="w-4 h-4" /> Add Another Product Manually
                                </button>
                            </div>

                            {products.some((p) => !p.name.trim() || !p.category.trim()) && (
                                <p className="text-xs text-[hsl(0,70%,55%)] flex items-center gap-1.5 mt-3">
                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    Some products are incomplete — click a card to expand and fill the required fields.
                                </p>
                            )}

                            <div className="flex justify-between mt-8">
                                <button
                                    onClick={() => setStep(1)}
                                    className="inline-flex items-center gap-2 text-[hsl(340,10%,45%)] font-medium px-5 py-3 rounded-xl border border-[hsl(340,25%,88%)] hover:bg-[hsl(340,30%,96%)] transition-colors text-sm"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!canProceedStep2}
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-[hsl(340,65%,62%)] to-[hsl(340,70%,68%)] text-white font-semibold px-6 py-3 rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Continue <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 3: Confirmation ─────────────────────────────── */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(130,55%,55%)] to-[hsl(130,60%,48%)] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[hsl(130,55%,55%,0.3)]">
                                <CheckCircle2 className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                You're all set, {userName?.split(" ")[0]}! 🎉
                            </h1>
                            <p className="text-[hsl(340,10%,50%)] mb-8 max-w-md mx-auto">
                                Your AI agents are ready to start monitoring <strong>{companyName}</strong> across{" "}
                                <strong>{products.length} product{products.length > 1 ? "s" : ""}</strong>.
                            </p>

                            <div className="bg-white border border-[hsl(340,25%,88%)] rounded-2xl p-6 text-left mb-8 shadow-sm max-h-72 overflow-y-auto">
                                <h3 className="font-semibold text-sm text-[hsl(340,20%,30%)] mb-3 flex items-center gap-2 sticky top-0 bg-white pb-2 border-b border-[hsl(340,20%,94%)]">
                                    <Building2 className="w-4 h-4 text-[hsl(340,55%,60%)]" />
                                    {companyName} · {industry}
                                </h3>
                                <div>
                                    {products.map((p) => (
                                        <div key={p.id} className="flex items-center gap-3 py-2 border-b border-[hsl(340,20%,96%)] last:border-0">
                                            <div className="w-7 h-7 rounded-lg bg-[hsl(340,40%,95%)] flex items-center justify-center flex-shrink-0">
                                                <Package className="w-3.5 h-3.5 text-[hsl(340,55%,58%)]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-[hsl(340,20%,25%)] truncate">{p.name}</div>
                                                <div className="text-xs text-[hsl(340,10%,55%)]">{p.category}{p.price ? ` · ₹${p.price}` : ""}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setStep(2)}
                                    className="inline-flex items-center gap-1.5 text-[hsl(340,10%,45%)] text-sm font-medium px-5 py-3 rounded-xl border border-[hsl(340,25%,88%)] hover:bg-[hsl(340,30%,96%)] transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Edit
                                </button>
                                <button
                                    onClick={handleFinish}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-[hsl(340,65%,62%)] to-[hsl(340,70%,68%)] text-white font-semibold px-7 py-3 rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-70"
                                >
                                    {saving ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Launching your agents…</>
                                    ) : (
                                        <>Launch Dashboard <ChevronRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
