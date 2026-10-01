import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Flame, Users, MapPin, Calendar, Sparkles, Shield, Heart, Gem, PawPrint,
  Menu, X, Search, FilePlus, Network, Compass, HelpCircle, BookOpen, SlidersHorizontal, Database, MessageSquare, Book,
  ChevronDown, Wand2, Layers, Home
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TarotLogo } from "./TarotLogo";
import { TarotChatbot } from "./TarotChatbot";
import { ScribeRadio } from "./ScribeRadio";
import { VisualEditorHUD } from "./VisualEditorHUD";
import { useCategories } from "../context/CategoryContext";
import { globalMergedCategories } from "../utils/categoryHelper";
import { useLanguage } from "../context/LanguageContext";
import { useVisualEditor } from "../context/VisualEditorContext";
import { EditableText } from "./webbuilder/EditableText";
import { CategoryQuickEditModal } from "./webbuilder/CategoryQuickEditModal";
import { CategoryReorderModal } from "./CategoryReorderModal";
import { useUIContent } from "../context/UIContentContext";
import { SelectionSearchTooltip } from "./SelectionSearchTooltip";
import { WikiContextMenu } from "./WikiContextMenu";

// Standard hardcoded categories with metadata
export const CATEGORY_INFO = [
  { name: "Personajes", slug: "personajes", icon: Users, color: "#c8a96e", desc: "Héroes, sabios, guerreros y seres místicas" },
  { name: "Lugares", slug: "lugares", icon: MapPin, color: "#6ea8c8", desc: "Ciudades medievales, mazmorras y reinos antiguos" },
  { name: "Eventos", slug: "eventos", icon: Calendar, color: "#c86e6e", desc: "Eclipses, batallas históricas y hitos del destino" },
  { name: "Dioses", slug: "dioses", icon: Sparkles, color: "#a7f9f7", desc: "Deidades cósmicas y fuerzas divinas del universo" },
  { name: "Dragones", slug: "dragones", icon: Flame, color: "#c8856e", desc: "Dragones legendarios de inmenso poder elemental" },
  { name: "Organizaciones", slug: "organizaciones", icon: Shield, color: "#9e6ec8", desc: "Gremios celestiales, imperios y sectas secretas" },
  { name: "Familias", slug: "familias", icon: Heart, color: "#6ec8c0", desc: "Líneas de sangre real y dinastías eternas" },
  { name: "Objetos", slug: "objetos", icon: Gem, color: "#a7f9f7", desc: "Artefactos rúnicos, armas legendarias y joyas sagradas" }
];

export function getCategoryIcon(catName: string) {
  const matched = globalMergedCategories.find(c => c.name.toLowerCase().trim() === (catName || "").toLowerCase().trim());
  if (matched) return matched.icon;
  const norm = (catName || "").toLowerCase().trim();
  if (norm === "mascotas" || norm === "animales" || norm === "criaturas" || norm === "fauna" || norm === "bestias") {
    return PawPrint;
  }
  return BookOpen;
}

export function getCategoryColor(catName: string) {
  const matched = globalMergedCategories.find(c => c.name.toLowerCase().trim() === (catName || "").toLowerCase().trim());
  if (matched) return matched.color;
  const norm = (catName || "").toLowerCase().trim();
  if (norm === "mascotas" || norm === "animales" || norm === "criaturas") {
    return "#ff007b";
  }
  return "#a0a0a0";
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { mergedCategories } = useCategories();
  const { currentLang, setLanguage, languages, t } = useLanguage();
  const { isVisualEditMode } = useVisualEditor();
  const { getText } = useUIContent();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  // Collapsible sidebar sections state
  const [homeCollapsed, setHomeCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dragopedia_home_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [categoriesCollapsed, setCategoriesCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dragopedia_lore_categories_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [tarotAiCollapsed, setTarotAiCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dragopedia_tarot_ai_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [appsCollapsed, setAppsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dragopedia_apps_collapsed") === "true";
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("dragopedia_home_collapsed", String(homeCollapsed));
    } catch {}
  }, [homeCollapsed]);

  React.useEffect(() => {
    try {
      localStorage.setItem("dragopedia_lore_categories_collapsed", String(categoriesCollapsed));
    } catch {}
  }, [categoriesCollapsed]);

  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("dragopedia_sidebar_expanded_cats");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      "cat-personajes": true,
      "personajes": true,
      "6a21b20b721db0dddbdc7dca": true,
      "planos": true,
    };
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("dragopedia_sidebar_expanded_cats", JSON.stringify(expandedCategories));
    } catch {}
  }, [expandedCategories]);

  // Subcategorías y jerarquía para el árbol del sidebar
  const getSubcategories = (parentCat: { id: string; slug: string }) => {
    return mergedCategories.filter(
      (c) =>
        c.id !== parentCat.id &&
        c.slug !== parentCat.slug &&
        ((c.parentId && (c.parentId === parentCat.id || c.parentId === parentCat.slug)) ||
         (c.parentSlug && c.parentSlug === parentCat.slug))
    );
  };

  // Solo las categorías raíz (que no tienen categoría padre asignada o cuyo padre no existe)
  const rootCategories = mergedCategories.filter((cat) => {
    if (!cat.parentId && !cat.parentSlug) return true;
    const parentExists = mergedCategories.some(
      (p) =>
        p.id !== cat.id &&
        (p.id === cat.parentId || p.slug === cat.parentId || p.slug === cat.parentSlug || p.id === cat.parentSlug)
    );
    return !parentExists;
  });

  React.useEffect(() => {
    mergedCategories.forEach((parentCat) => {
      const subcats = getSubcategories(parentCat);
      const isSubActive = subcats.some((s) => location.pathname === `/categoria/${s.slug}`);
      const isParentActive = location.pathname === `/categoria/${parentCat.slug}`;
      if (isSubActive || isParentActive) {
        setExpandedCategories((prev) => ({
          ...prev,
          [parentCat.id]: true,
          [parentCat.slug]: true,
        }));
      }
    });
  }, [location.pathname, mergedCategories]);

  React.useEffect(() => {
    try {
      localStorage.setItem("dragopedia_tarot_ai_collapsed", String(tarotAiCollapsed));
    } catch {}
  }, [tarotAiCollapsed]);

  React.useEffect(() => {
    try {
      localStorage.setItem("dragopedia_apps_collapsed", String(appsCollapsed));
    } catch {}
  }, [appsCollapsed]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const isFullWidthPage = [
    "/mundo", 
    "/grafo", 
    "/grafos", 
    "/spellbook", 
    "/hechizos", 
    "/libro-de-hechizos",
    "/diario",
    "/diario-del-cazador",
    "/dm-sanctum",
    "/dm"
  ].some(p => location.pathname === p || location.pathname.startsWith(p + "/"));

  return (
    <div className="min-h-screen bg-background font-body flex flex-col text-foreground relative">
      {/* Category Quick Edit Modal in Visual Mode */}
      {editingCategory && (
        <CategoryQuickEditModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {/* Top sticky header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className={`flex items-center h-14 px-4 justify-between gap-4 w-full ${isFullWidthPage ? "max-w-none px-4 sm:px-6" : "max-w-[1400px] mx-auto"}`}>
          
          {/* Logo & Toggle */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                <Flame className="h-4.5 w-4.5 text-primary" />
              </div>
              <EditableText
                textKey="nav.brand"
                defaultValue="DRAGOPEDIA"
                label="Nombre / Marca del Sitio"
                className="font-heading font-bold text-base tracking-wider text-foreground"
              />
            </Link>
          </div>



          {/* Search bar & Language Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <form onSubmit={handleSearchSubmit} className="relative max-w-[140px] sm:max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getText("nav.searchPlaceholder", t("Buscar..."))}
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-secondary/65 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/50 transition-all"
              />
            </form>

            <div className="relative">
              {(() => {
                const activeLanguage = languages.find((l) => l.code === currentLang) || languages[0];
                return (
                  <>
                    <button
                      id="language-selector-btn"
                      type="button"
                      onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                      className="h-8 px-3 flex items-center justify-between gap-1.5 text-xs font-medium bg-secondary/65 border border-border rounded-lg text-foreground hover:bg-secondary/90 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/45"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm select-none leading-none">{activeLanguage.flag}</span>
                        <span>{activeLanguage.name}</span>
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${langDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {langDropdownOpen && (
                        <>
                          {/* Backdrop to close on click outside */}
                          <div 
                            className="fixed inset-0 z-40 cursor-default" 
                            onClick={() => setLangDropdownOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 mt-1.5 w-44 max-h-72 overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-50 py-1 focus:outline-none"
                          >
                            {languages.map((l) => {
                              const isSelected = l.code === currentLang;
                              return (
                                <button
                                  key={l.code}
                                  type="button"
                                  onClick={() => {
                                    setLanguage(l.code);
                                    setLangDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2.5 transition-colors hover:bg-secondary/70 ${
                                    isSelected ? "text-primary bg-primary/10" : "text-foreground"
                                  }`}
                                >
                                  <span className="text-sm select-none leading-none">{l.flag}</span>
                                  <span>{l.name}</span>
                                </button>
                              );
                            })}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </>
                );
              })()}
            </div>
          </div>

        </div>
      </header>

      {/* Quick Selection Floating Tooltip */}
      <SelectionSearchTooltip />

      {/* Main Container */}
      <div className={`flex flex-1 w-full relative ${isFullWidthPage ? "max-w-none" : "max-w-[1400px] mx-auto"}`}>
        
        {/* Navigation Sidebar (Desktop + Mobile overlay) */}
        <aside className={`
          ${mobileMenuOpen ? "fixed inset-0 top-14 z-40 bg-background/95 block" : "hidden"}
          lg:block lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-border overflow-y-auto p-4 bg-card/45
        `}>
          <div className="space-y-6">
            
            {/* Home Section */}
            <div className="space-y-1.5">
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setHomeCollapsed(prev => !prev)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setHomeCollapsed(prev => !prev); } }}
                className="px-3 py-1 flex items-center justify-between cursor-pointer select-none rounded-md hover:bg-secondary/35 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <Home className="h-3 w-3 text-primary/80 shrink-0" />
                  <EditableText
                    textKey="nav.section.home"
                    defaultValue={t("Home")}
                    label="Sección Home"
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHomeCollapsed(prev => !prev);
                  }}
                  title={homeCollapsed ? "Expandir sección Home" : "Minimizar sección Home"}
                  className="p-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${homeCollapsed ? "-rotate-90" : "rotate-0"}`} />
                </button>
              </div>

              {!homeCollapsed && (
                <div className="space-y-1">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname === "/" 
                        ? "bg-primary/10 text-primary border border-primary/15" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <EditableText
                      textKey="nav.menu.inicio"
                      defaultValue={t("Inicio")}
                      label="Menú Inicio"
                    />
                  </Link>

                  <Link
                    to="/nuevo"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-md transition-all bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20 shadow-sm shadow-primary/5"
                  >
                    <FilePlus className="h-4 w-4 shrink-0" />
                    <EditableText
                      textKey="nav.menu.nuevo"
                      defaultValue={t("Nuevo artículo")}
                      label="Menú Nuevo Artículo"
                    />
                  </Link>
                </div>
              )}
            </div>

            {/* Tarot AI Section */}
            <div className="space-y-1.5 pt-1">
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setTarotAiCollapsed(prev => !prev)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTarotAiCollapsed(prev => !prev); } }}
                className="px-3 py-1 flex items-center justify-between cursor-pointer select-none rounded-md hover:bg-secondary/35 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary shrink-0" />
                  <EditableText
                    textKey="nav.section.tarotAI"
                    defaultValue={t("Tarot AI")}
                    label="Sección Tarot AI"
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                    IA
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTarotAiCollapsed(prev => !prev);
                  }}
                  title={tarotAiCollapsed ? "Expandir sección Tarot AI" : "Minimizar sección Tarot AI"}
                  className="p-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${tarotAiCollapsed ? "-rotate-90" : "rotate-0"}`} />
                </button>
              </div>

              {!tarotAiCollapsed && (
                <div className="space-y-1">
                  <Link
                    to="/tarot-ai"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-md transition-all ${
                      location.pathname === "/tarot-ai"
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <TarotLogo className="h-4 w-4 text-primary shrink-0" />
                    <EditableText
                      textKey="nav.menu.tarotAI"
                      defaultValue={t("Escriba de Tarot AI")}
                      label="Menú Tarot AI"
                    />
                  </Link>

                  <Link
                    to="/tarot-chat"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-md transition-all ${
                      location.pathname === "/tarot-chat"
                        ? "bg-primary/20 text-primary border border-primary/30 animate-pulse-slow"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                    <EditableText
                      textKey="nav.menu.tarotChat"
                      defaultValue={t("Chat con Tarot AI")}
                      label="Menú Chat AI"
                    />
                  </Link>
                </div>
              )}
            </div>

            {/* Aplicaciones Section */}
            <div className="space-y-1.5 pt-1">
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setAppsCollapsed(prev => !prev)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAppsCollapsed(prev => !prev); } }}
                className="px-3 py-1 flex items-center justify-between cursor-pointer select-none rounded-md hover:bg-secondary/35 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3 w-3 text-primary/80 shrink-0" />
                  <EditableText
                    textKey="nav.section.applications"
                    defaultValue={t("Aplicaciones")}
                    label="Sección Aplicaciones"
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAppsCollapsed(prev => !prev);
                  }}
                  title={appsCollapsed ? "Expandir sección Aplicaciones" : "Minimizar sección Aplicaciones"}
                  className="p-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${appsCollapsed ? "-rotate-90" : "rotate-0"}`} />
                </button>
              </div>

              {!appsCollapsed && (
                <div className="space-y-1">
                  <Link
                    to="/grafo"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname === "/grafo" || location.pathname === "/grafos"
                        ? "bg-primary/10 text-primary border border-primary/15" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <Network className="h-4 w-4 shrink-0" />
                    <EditableText
                      textKey="nav.menu.grafo"
                      defaultValue={t("Grafo del mundo")}
                      label="Menú Grafo del Mundo"
                    />
                  </Link>

                  <Link
                    to="/mundo"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname === "/mundo" 
                        ? "bg-primary/10 text-primary border border-primary/15" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <Compass className="h-4 w-4 shrink-0" />
                    <EditableText
                      textKey="nav.menu.mundo"
                      defaultValue={t("Explorar Mundo")}
                      label="Menú Mapa Mundo"
                    />
                  </Link>

                  <Link
                    to="/spellbook"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-md transition-all ${
                      location.pathname === "/spellbook" || location.pathname === "/hechizos" || location.pathname === "/libro-de-hechizos"
                        ? "bg-primary/20 text-primary border border-primary/30 shadow-sm shadow-primary/5" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <Wand2 className="h-4 w-4 text-primary shrink-0" />
                    <EditableText
                      textKey="nav.menu.spellbook"
                      defaultValue={t("Libro de Hechizos")}
                      label="Menú Libro de Hechizos"
                    />
                  </Link>

                  <Link
                    to="/diario"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-md transition-all ${
                      location.pathname === "/diario" 
                        ? "bg-primary/20 text-primary border border-primary/30" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <Book className="h-4 w-4 text-primary shrink-0" />
                    <EditableText
                      textKey="nav.menu.diario"
                      defaultValue={t("Diario del Cazador")}
                      label="Menú Diario Cazador"
                    />
                  </Link>

                  {isVisualEditMode && (
                    <Link
                      to="/filtros"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        location.pathname === "/filtros" 
                          ? "bg-primary/10 text-primary border border-primary/15" 
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                      }`}
                    >
                      <SlidersHorizontal className="h-4 w-4 shrink-0" />
                      <EditableText
                        textKey="nav.menu.filtros"
                        defaultValue={t("Gestión de Filtros")}
                        label="Menú Gestión de Filtros"
                      />
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Categories list with minimize functionality & tree subcategories */}
            <div className="space-y-1.5 pt-1">
              <div 
                className="px-3 py-1 flex items-center justify-between select-none group rounded-md hover:bg-secondary/35 transition-colors"
              >
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => setCategoriesCollapsed(prev => !prev)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCategoriesCollapsed(prev => !prev); } }}
                  className="flex-1 cursor-pointer flex items-center"
                >
                  <EditableText
                    textKey="nav.categoriesHeader"
                    defaultValue={t("Categorías de Lore")}
                    label="Encabezado Categorías"
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsReorderModalOpen(true);
                    }}
                    title="Configurar y reordenar categorías"
                    className="p-1 rounded text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoriesCollapsed(prev => !prev);
                    }}
                    title={categoriesCollapsed ? "Expandir categorías de lore" : "Minimizar categorías de lore"}
                    className="p-1 rounded text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${categoriesCollapsed ? "-rotate-90" : "rotate-0"}`} />
                  </button>
                </div>
              </div>
              
              {!categoriesCollapsed && (
                <div className="space-y-0.5">
                  {rootCategories.map((cat) => {
                    const Icon = cat.icon;
                    const subcats = getSubcategories(cat);
                    const hasSubcategories = subcats.length > 0;
                    const isExpanded = !!expandedCategories[cat.id] || !!expandedCategories[cat.slug];
                    const isParentActive = location.pathname === `/categoria/${cat.slug}`;
                    const hasActiveChild = subcats.some((s) => location.pathname === `/categoria/${s.slug}`);

                    return (
                      <div key={cat.slug} className="space-y-0.5">
                        <div className="flex items-center group">
                          <Link
                            to={isVisualEditMode ? "#" : `/categoria/${cat.slug}`}
                            onClick={(e) => {
                              if (isVisualEditMode) {
                                e.preventDefault();
                                setEditingCategory(cat);
                              } else {
                                setMobileMenuOpen(false);
                              }
                            }}
                            className={`flex-1 flex items-center justify-between px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              isParentActive 
                                ? "bg-primary/10 text-primary border border-primary/20" 
                                : hasActiveChild
                                ? "text-foreground font-medium bg-secondary/30"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                            } ${isVisualEditMode ? "hover:ring-1 hover:ring-primary/60 cursor-pointer" : ""}`}
                          >
                            <span className="flex items-center gap-3 truncate">
                              <Icon className="h-4 w-4 shrink-0" style={{ color: cat.color }} />
                              <span className="truncate">{cat.name}</span>
                            </span>
                            {isVisualEditMode && (
                              <span className="text-[9px] text-primary/80 bg-primary/10 px-1 rounded">
                                Editar
                              </span>
                            )}
                          </Link>

                          {hasSubcategories && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExpandedCategories((prev) => ({
                                  ...prev,
                                  [cat.id]: !isExpanded,
                                  [cat.slug]: !isExpanded,
                                }));
                              }}
                              title={isExpanded ? `Contraer subcategorías de ${cat.name}` : `Expandir subcategorías de ${cat.name}`}
                              className="p-1.5 ml-0.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                            >
                              <ChevronDown
                                className={`h-3 w-3 transition-transform duration-200 ${
                                  isExpanded ? "rotate-0 text-foreground/80" : "-rotate-90"
                                }`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Subcategorías anidadas con línea guía de árbol */}
                        {hasSubcategories && isExpanded && (
                          <div className="relative ml-4 pl-3.5 border-l border-border/40 space-y-0.5 py-0.5">
                            {subcats.map((subcat) => {
                              const SubIcon = subcat.icon;
                              const isSubActive = location.pathname === `/categoria/${subcat.slug}`;
                              return (
                                <Link
                                  key={subcat.slug}
                                  to={isVisualEditMode ? "#" : `/categoria/${subcat.slug}`}
                                  onClick={(e) => {
                                    if (isVisualEditMode) {
                                      e.preventDefault();
                                      setEditingCategory(subcat);
                                    } else {
                                      setMobileMenuOpen(false);
                                    }
                                  }}
                                  className={`flex items-center justify-between px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                    isSubActive
                                      ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/35"
                                  } ${isVisualEditMode ? "hover:ring-1 hover:ring-primary/60 cursor-pointer" : ""}`}
                                >
                                  <span className="flex items-center gap-2.5 truncate">
                                    <SubIcon
                                      className="h-3.5 w-3.5 shrink-0"
                                      style={{ color: subcat.color || cat.color }}
                                    />
                                    <span className="truncate">{subcat.name}</span>
                                  </span>
                                  {isVisualEditMode && (
                                    <span className="text-[8.5px] text-primary/80 bg-primary/10 px-1 rounded">
                                      Editar
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Help & About Footer */}
            <div className="pt-4 border-t border-border/60 text-[11px] text-muted-foreground px-3 space-y-1">
              <EditableText
                textKey="nav.footer.title"
                defaultValue={t("Archivero de Tarot v1.0")}
                as="p"
                label="Título Pie de Menú"
                className="font-heading font-medium text-foreground/75"
              />
              <EditableText
                textKey="nav.footer.subtitle"
                defaultValue={t("Enciclopedia del universo de Caldo de Dragón.")}
                as="p"
                label="Subtítulo Pie de Menú"
                className="leading-relaxed"
              />
            </div>

          </div>
        </aside>

        {/* Primary Page Content */}
        <main className="flex-1 min-w-0 bg-transparent relative z-10">
          {children}
        </main>

        {/* Global Tarot AI Chatbot Widget */}
        <TarotChatbot />

        {/* Global Custom Wiki Context Menu (Right Click) */}
        <WikiContextMenu />

        {/* Global Ambient Fantasy Radio */}
        <ScribeRadio />

        {/* Secret Visual Editor Floating HUD */}
        <VisualEditorHUD />

        {/* Category Reorder Modal */}
        <CategoryReorderModal
          isOpen={isReorderModalOpen}
          onClose={() => setIsReorderModalOpen(false)}
        />
      </div>
    </div>
  );
}
