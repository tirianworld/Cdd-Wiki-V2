import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { WikiArticle } from "../types";
import { getCategoryIcon } from "./Layout";
import { ArticleCard } from "./ArticleCard";
import { 
  Search, ArrowLeft, BookOpen, Layers, ExternalLink, GitFork, 
  ChevronUp, ChevronDown, Minimize2, Maximize2, LayoutGrid, ListFilter, X, Plus
} from "lucide-react";
import { TarotLogo } from "./TarotLogo";
import { useCategories } from "../context/CategoryContext";
import { syncFetch, getCachedArticles } from "../utils/syncArticles";
import { PersonajesSilhouettesBanner } from "./PersonajesSilhouettesBanner";
import { LugaresSilhouettesBanner } from "./LugaresSilhouettesBanner";
import { DragonesSilhouettesBanner } from "./DragonesSilhouettesBanner";
import { PrimordialesSilhouettesBanner } from "./PrimordialesSilhouettesBanner";

export function CategoryView() {
  const { slug } = useParams<{ slug: string }>();
  const { mergedCategories } = useCategories();
  const currentCategory = mergedCategories.find((c) => c.slug === slug);
  const Icon = currentCategory ? currentCategory.icon : BookOpen;
  const themeColor = currentCategory ? currentCategory.color : "#a0a0a0";
  const isPersonajes = currentCategory?.slug === "personajes" || currentCategory?.name?.toLowerCase() === "personajes" || slug?.toLowerCase() === "personajes";
  const isLugares = currentCategory?.slug === "lugares" || currentCategory?.slug === "lugar" || currentCategory?.name?.toLowerCase() === "lugares" || currentCategory?.name?.toLowerCase() === "lugar" || slug?.toLowerCase() === "lugares" || slug?.toLowerCase() === "lugar";
  const isDragones = currentCategory?.slug === "dragones" || currentCategory?.slug === "dragon" || currentCategory?.name?.toLowerCase() === "dragones" || currentCategory?.name?.toLowerCase() === "dragón" || slug?.toLowerCase() === "dragones" || slug?.toLowerCase() === "dragon";
  const isPrimordiales = currentCategory?.slug === "primordiales" || currentCategory?.slug === "primordial" || currentCategory?.name?.toLowerCase() === "primordiales" || currentCategory?.name?.toLowerCase() === "primordial" || slug?.toLowerCase() === "primordiales" || slug?.toLowerCase() === "primordial";
  const hasCustomBanner = isPersonajes || isLugares || isDragones || isPrimordiales;

  // Detección de Subcategorías y Jerarquía
  const subcategories = useMemo(() => {
    if (!currentCategory) return [];
    return mergedCategories.filter(
      (c) =>
        c.id !== currentCategory.id &&
        c.slug !== currentCategory.slug &&
        ((c.parentId && (c.parentId === currentCategory.id || c.parentId === currentCategory.slug)) ||
         (c.parentSlug && c.parentSlug === currentCategory.slug))
    );
  }, [currentCategory, mergedCategories]);

  const hasSubcategories = subcategories.length > 0;

  const parentCategory = useMemo(() => {
    if (!currentCategory?.parentId && !currentCategory?.parentSlug) return null;
    return mergedCategories.find(
      (c) =>
        c.id === currentCategory.parentId ||
        c.slug === currentCategory.parentSlug ||
        c.slug === currentCategory.parentId
    );
  }, [currentCategory, mergedCategories]);

  const [allWikiArticles, setAllWikiArticles] = useState<WikiArticle[]>([]);
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [filterQuery, setFilterQuery] = useState("");
  const [viewLayout, setViewLayout] = useState<"standard" | "sections">("standard");

  // Subcategories UI states (Similar a inicio, pero minimizado por defecto)
  const [isSubcatMinimized, setIsSubcatMinimized] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`tarot_subcat_min_v3_${slug}`);
      if (stored !== null) return stored === "true";
      return true; // Minimizado por defecto
    } catch {
      return true;
    }
  });

  const toggleSubcatMinimized = () => {
    if (subcategories.length === 0) return;
    setIsSubcatMinimized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`tarot_subcat_min_v3_${slug}`, String(next));
      } catch {}
      return next;
    });
  };

  const shouldShowExpanded = !isSubcatMinimized && subcategories.length > 0;

  const [subcatRow, setSubcatRow] = useState(0);
  const [subcatNumCols, setSubcatNumCols] = useState(4);

  useEffect(() => {
    const updateCols = () => {
      if (window.innerWidth < 640) {
        setSubcatNumCols(1);
      } else if (window.innerWidth < 1024) {
        setSubcatNumCols(2);
      } else {
        setSubcatNumCols(4);
      }
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  const totalSubcatRows = Math.ceil(subcategories.length / subcatNumCols);
  const maxSubcatRow = Math.max(0, totalSubcatRows - 2);

  // Selectable filters state
  const [selCampana, setSelCampana] = useState("");
  const [selContinente, setSelContinente] = useState("");
  const [selPlano, setSelPlano] = useState("");
  const [selCriatura, setSelCriatura] = useState("");
  const [sortBy, setSortBy] = useState("created_newest");
  const [availableFilters, setAvailableFilters] = useState<Record<string, string[]>>({
    campaña: [],
    continente: [],
    plano: [],
    criatura: []
  });

  const updateCategoryArticles = (allArticles: WikiArticle[]) => {
    const safeArticles = Array.isArray(allArticles) ? allArticles.filter((a) => a && a.id) : [];
    setAllWikiArticles(safeArticles);

    if (currentCategory) {
      const subcatNames = subcategories.map((s) => s.name.toLowerCase().trim());
      const subcatSlugs = subcategories.map((s) => s.slug.toLowerCase().trim());

      const catArticles = safeArticles.filter((a: WikiArticle) => {
        if (!a || !a.category || typeof a.category !== "string") return false;
        const artCat = a.category.toLowerCase().trim();
        // Coincide con la categoría actual
        if (
          artCat === currentCategory.name.toLowerCase().trim() ||
          artCat === currentCategory.slug.toLowerCase().trim()
        ) {
          return true;
        }
        // Coincide con alguna de sus subcategorías derivadas
        if (subcatNames.includes(artCat) || subcatSlugs.includes(artCat)) {
          return true;
        }
        return false;
      });

      setArticles(catArticles);
    } else {
      setArticles([]);
    }
  };

  useEffect(() => {
    setFilterQuery(""); // Reset query
    setSelCampana("");
    setSelContinente("");
    setSelPlano("");
    setSelCriatura("");
    setSelectedSubcategory("all"); // Reset subcategory filter when changing category
    setSubcatRow(0);

    // Check cached articles first
    const cached = getCachedArticles();
    if (cached.length > 0) {
      updateCategoryArticles(cached);
    }

    Promise.all([
      syncFetch("/api/articles").then((res) => res.json()).catch(() => []),
      fetch("/api/filter-categories").then((res) => res.json()).catch(() => ({ campaña: [], continente: [], plano: [], criatura: [] }))
    ])
      .then(([allArticles, filterData]) => {
        updateCategoryArticles(allArticles);
        setAvailableFilters(filterData || { campaña: [], continente: [], plano: [], criatura: [] });
      })
      .catch((err) => {
        console.error("Error loading category content:", err);
      });

    const handleUpdate = () => {
      const fresh = getCachedArticles();
      if (fresh.length > 0) {
        updateCategoryArticles(fresh);
      }
    };
    window.addEventListener("wiki-articles-updated", handleUpdate);
    return () => window.removeEventListener("wiki-articles-updated", handleUpdate);
  }, [slug, currentCategory, subcategories]);

  // Multi-tier filtering
  const filteredArticles = (Array.isArray(articles) ? articles : []).filter((a) => {
    if (!a) return false;

    // Filtro por subcategoría interactiva (si hay alguna seleccionada)
    if (selectedSubcategory !== "all") {
      const targetSubcat = subcategories.find(
        (s) => s.slug === selectedSubcategory || s.id === selectedSubcategory
      );
      if (targetSubcat) {
        const artCat = (a.category || "").toLowerCase().trim();
        const matchesSubcat =
          artCat === targetSubcat.name.toLowerCase().trim() ||
          artCat === targetSubcat.slug.toLowerCase().trim();
        if (!matchesSubcat) return false;
      }
    }

    const lowerFilter = filterQuery.toLowerCase();
    // Text search filter
    const titleMatch = (a.title && typeof a.title === "string") ? a.title.toLowerCase().includes(lowerFilter) : false;
    const summaryMatch = (a.summary && typeof a.summary === "string") ? a.summary.toLowerCase().includes(lowerFilter) : false;
    const matchesQuery = !filterQuery.trim() || titleMatch || summaryMatch;
    if (!matchesQuery) return false;

    // Campaña filter
    if (selCampana) {
      const hasCampana = a.filters?.campaña?.some((v: string) => v && typeof v === "string" && v.toLowerCase() === selCampana.toLowerCase());
      if (!hasCampana) return false;
    }

    // Continente filter
    if (selContinente) {
      const hasContinente = a.filters?.continente?.some((v: string) => v && typeof v === "string" && v.toLowerCase() === selContinente.toLowerCase());
      if (!hasContinente) return false;
    }

    // Plano filter
    if (selPlano) {
      const hasPlano = a.filters?.plano?.some((v: string) => v.toLowerCase() === selPlano.toLowerCase());
      if (!hasPlano) return false;
    }

    // Criatura filter
    if (selCriatura) {
      const hasCriatura = a.filters?.criatura?.some((v: string) => v.toLowerCase() === selCriatura.toLowerCase()) ||
                          a.filters?.entidad?.some((v: string) => v.toLowerCase() === selCriatura.toLowerCase());
      if (!hasCriatura) return false;
    }

    return true;
  });

  // Sort articles based on selection
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    if (sortBy === "created_newest") {
      const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
      const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
      return dateB - dateA;
    }
    if (sortBy === "created_oldest") {
      const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
      const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
      return dateA - dateB;
    }
    if (sortBy === "name_asc") {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === "name_desc") {
      return b.title.localeCompare(a.title);
    }
    return 0;
  });

  const activeSubcategoryObj = subcategories.find(
    (s) => s.slug === selectedSubcategory || s.id === selectedSubcategory
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Top Bar: Breadcrumbs on Left, Search filter on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Back button & Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Link to="/" className="hover:text-foreground transition-colors">
            Inicio
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">
            {currentCategory?.name || "Categoría"}
          </span>
        </div>

        {/* Search inside Category */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={`Filtrar en ${currentCategory?.name || "Categoría"}...`}
            className="w-full h-8 pl-9 pr-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 transition-all"
          />
        </div>
      </div>

      {/* 1. Category Header Banner (Solo cuando hay silueta de categoría) */}
      {hasCustomBanner && (
        <div className="space-y-4 pb-4 border-b border-border/60">
          {/* Silhouette decoration specifically for Personajes */}
          {isPersonajes && (
            <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-secondary/30 via-card/50 to-card border border-border/40 p-2 sm:p-4 shadow-sm flex items-end justify-center">
              <div className="absolute inset-y-0 left-0 w-12 sm:w-20 bg-gradient-to-r from-card to-transparent pointer-events-none z-10" />
              <div className="absolute inset-y-0 right-0 w-12 sm:w-20 bg-gradient-to-l from-card to-transparent pointer-events-none z-10" />
              <PersonajesSilhouettesBanner
                className="w-full h-28 sm:h-36 md:h-44"
                color="#232e33"
              />
            </div>
          )}

          {/* Silhouette decoration specifically for Lugares */}
          {isLugares && (
            <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-secondary/30 via-card/50 to-card border border-border/40 p-2 sm:p-4 shadow-sm flex items-end justify-center">
              <div className="absolute inset-y-0 left-0 w-12 sm:w-20 bg-gradient-to-r from-card to-transparent pointer-events-none z-10" />
              <div className="absolute inset-y-0 right-0 w-12 sm:w-20 bg-gradient-to-l from-card to-transparent pointer-events-none z-10" />
              <LugaresSilhouettesBanner
                className="w-full h-28 sm:h-36 md:h-44"
                color="#232e33"
              />
            </div>
          )}

          {/* Silhouette decoration specifically for Dragones */}
          {isDragones && (
            <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-secondary/30 via-card/50 to-card border border-border/40 p-0 shadow-sm flex items-end justify-center">
              <div className="absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-card to-transparent pointer-events-none z-10" />
              <div className="absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-card to-transparent pointer-events-none z-10" />
              <DragonesSilhouettesBanner
                className="w-full h-44 sm:h-56 md:h-64 lg:h-72"
                color="#232e33"
              />
            </div>
          )}

          {/* Silhouette decoration specifically for Primordiales */}
          {isPrimordiales && (
            <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-secondary/30 via-card/50 to-card border border-border/40 pt-3 sm:pt-4 px-2 sm:px-4 pb-0 shadow-sm flex items-end justify-center">
              <div className="absolute inset-y-0 left-0 w-12 sm:w-20 bg-gradient-to-r from-card to-transparent pointer-events-none z-10" />
              <div className="absolute inset-y-0 right-0 w-12 sm:w-20 bg-gradient-to-l from-card to-transparent pointer-events-none z-10" />
              <PrimordialesSilhouettesBanner
                className="w-full h-36 sm:h-44 md:h-52"
                color="#232e33"
              />
            </div>
          )}
        </div>
      )}

      {/* 2. Menú de Subcategorías (Se muestra en todas las categorías por igual; si no hay subcategorías, no se expande) */}
      {!shouldShowExpanded ? (
        /* Barra Minimizado EXACTA A LA IMAGEN DEL USUARIO */
        <div className="bg-[#0e1418]/70 border border-[#232e33] rounded-2xl px-4 sm:px-6 py-3 shadow-xs flex items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-6 w-6 rounded-full border border-teal-500/40 bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="font-heading font-semibold text-xs sm:text-sm tracking-wider uppercase text-foreground/90">
              EXPLORAR SUBCATEGORÍAS DE {currentCategory?.name || slug}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {selectedSubcategory === "all" && (
              <div className="hidden sm:flex items-center bg-[#131b20] border border-[#232e33] rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setViewLayout("standard")}
                  className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                    viewLayout === "standard"
                      ? "bg-[#1c282f] text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Vista en cuadrícula estándar"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Cuadrícula</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout("sections")}
                  className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                    viewLayout === "sections"
                      ? "bg-[#1c282f] text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Vista organizada por secciones de cada subcategoría"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  <span>Por Secciones</span>
                </button>
              </div>
            )}

            {subcategories.length > 0 && (
              <button
                type="button"
                onClick={toggleSubcatMinimized}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#232e33] bg-[#131b20] hover:bg-[#1c282f] text-teal-400 hover:text-teal-300 font-medium transition-colors shadow-xs cursor-pointer"
                title="Desplegar subcategorías"
              >
                <span>Desplegar</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Sección Desplegada (Solo cuando existen subcategorías) */
        <section className="space-y-4 bg-card/40 border border-border/70 rounded-2xl p-4 sm:p-6 shadow-sm">
          {/* Header de la sección de subcategorías */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full border border-teal-500/40 bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <h2 className="font-heading font-semibold text-xs sm:text-sm text-foreground tracking-wider uppercase">
                EXPLORAR SUBCATEGORÍAS DE {currentCategory?.name || slug}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {selectedSubcategory === "all" && (
                <div className="hidden sm:flex items-center bg-[#131b20] border border-[#232e33] rounded-lg p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewLayout("standard")}
                    className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                      viewLayout === "standard"
                        ? "bg-[#1c282f] text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Vista en cuadrícula estándar"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Cuadrícula</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewLayout("sections")}
                    className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                      viewLayout === "sections"
                        ? "bg-[#1c282f] text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Vista organizada por secciones de cada subcategoría (Estilo Inicio)"
                  >
                    <ListFilter className="h-3.5 w-3.5" />
                    <span>Por Secciones</span>
                  </button>
                </div>
              )}

              {/* Controles de fila por pasos si hay múltiples filas de subcategorías */}
              {totalSubcatRows > 2 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground select-none">
                  <span className="text-[11px] font-mono tracking-tight text-muted-foreground/80">
                    Fila {subcatRow + 1}–{Math.min(subcatRow + 2, totalSubcatRows)} de {totalSubcatRows}
                  </span>
                  <div className="flex items-center bg-[#131b20] border border-[#232e33] rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setSubcatRow((r) => Math.max(0, r - 1))}
                      disabled={subcatRow === 0}
                      className="p-1 rounded hover:bg-secondary text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors"
                      title="Fila anterior"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubcatRow((r) => Math.min(maxSubcatRow, r + 1))}
                      disabled={subcatRow >= maxSubcatRow}
                      className="p-1 rounded hover:bg-secondary text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors"
                      title="Siguiente fila"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={toggleSubcatMinimized}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#232e33] bg-[#131b20] hover:bg-[#1c282f] text-muted-foreground hover:text-foreground font-medium transition-colors shadow-xs cursor-pointer"
                title="Minimizar subcategorías"
              >
                <span>Minimizar</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Grid de Tarjetas de Subcategorías */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subcategories.map((subcat) => {
              const SubIcon = subcat.icon;

              return (
                <div key={subcat.id || subcat.slug} className="relative group">
                  <Link
                    to={`/categoria/${subcat.slug}`}
                    className="block bg-card border border-border/75 rounded-xl p-4 sm:p-5 hover:border-primary/45 transition-all hover:bg-secondary/20 hover:shadow-sm h-[140px] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors group-hover:scale-105"
                          style={{ 
                            backgroundColor: `${subcat.color}15`,
                            border: `1px solid ${subcat.color}35`
                          }}
                        >
                          <SubIcon className="h-4 w-4" style={{ color: subcat.color }} />
                        </div>
                      </div>

                      <h3 className="font-heading text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-wide uppercase line-clamp-1">
                        {subcat.name}
                      </h3>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-light">
                      {subcat.description || "Subcategoría mística de Caldo de Dragón."}
                    </p>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Banner de subcategoría activa cuando hay filtro seleccionado */}
      {selectedSubcategory !== "all" && activeSubcategoryObj && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/10 border border-primary/25 text-xs text-foreground flex-wrap">
          <div className="flex items-center gap-2">
            <activeSubcategoryObj.icon className="h-4 w-4" style={{ color: activeSubcategoryObj.color }} />
            <span className="font-semibold">
              Filtrando por subcategoría: <span className="text-primary font-bold uppercase">{activeSubcategoryObj.name}</span>
            </span>
            <span className="text-muted-foreground">
              ({sortedArticles.length} {sortedArticles.length === 1 ? "pergamino encontrado" : "pergaminos encontrados"})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/categoria/${activeSubcategoryObj.slug}`}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Abrir página exclusiva</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={() => setSelectedSubcategory("all")}
              className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-[11px] font-medium flex items-center gap-1 transition-colors border border-border/60"
            >
              <X className="h-3 w-3 text-muted-foreground" />
              <span>Ver todos los de {currentCategory?.name}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Dropdown Filters (Desplegables de Categoría) */}
      <div className="bg-card border border-border/60 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-4 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Campaña
          </label>
          <select
            value={selCampana}
            onChange={(e) => setSelCampana(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all"
          >
            <option value="">Todas las campañas</option>
            {(availableFilters.campaña || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Continente
          </label>
          <select
            value={selContinente}
            onChange={(e) => setSelContinente(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all"
          >
            <option value="">Todos los continentes</option>
            {(availableFilters.continente || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Plano de Existencia
          </label>
          <select
            value={selPlano}
            onChange={(e) => setSelPlano(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all"
          >
            <option value="">Todos los planos</option>
            {(availableFilters.plano || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Criatura / Especie
          </label>
          <select
            value={selCriatura}
            onChange={(e) => setSelCriatura(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all"
          >
            <option value="">Todas las criaturas</option>
            {(availableFilters.criatura || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Ordenar Por
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all font-medium text-primary"
          >
            <option value="created_newest">Fecha de creación (Más nuevos)</option>
            <option value="created_oldest">Fecha de creación (Más antiguos)</option>
            <option value="name_asc">Nombre (A - Z)</option>
            <option value="name_desc">Nombre (Z - A)</option>
          </select>
        </div>
      </div>

      {/* 4. Articles Grid / Grouped Sections */}
      {viewLayout === "sections" && selectedSubcategory === "all" && hasSubcategories ? (
        /* Vista agrupada por subcategorías (Similar al inicio) */
        <div className="space-y-10">
          {/* Sección de artículos propios de la categoría principal (si los hay) */}
          {(() => {
            const rootOnlyArticles = sortedArticles.filter((a) => {
              const artCat = (a.category || "").toLowerCase().trim();
              return (
                artCat === currentCategory?.name.toLowerCase().trim() ||
                artCat === currentCategory?.slug.toLowerCase().trim()
              );
            });
            if (rootOnlyArticles.length === 0) return null;

            return (
              <div key="root-category-section" className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: themeColor }} />
                    <h3 className="font-heading font-bold text-sm uppercase text-foreground">
                      Crónicas Generales de {currentCategory?.name}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/40">
                      {rootOnlyArticles.length}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rootOnlyArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Secciones individuales por cada subcategoría */}
          {subcategories.map((subcat) => {
            const SubIcon = subcat.icon;
            const subArticles = sortedArticles.filter((a) => {
              const artCat = (a.category || "").toLowerCase().trim();
              return (
                artCat === subcat.name.toLowerCase().trim() ||
                artCat === subcat.slug.toLowerCase().trim()
              );
            });

            if (subArticles.length === 0 && filterQuery) return null;

            return (
              <div key={subcat.slug} className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: `${subcat.color}20` }}
                    >
                      <SubIcon className="h-3.5 w-3.5" style={{ color: subcat.color }} />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-sm uppercase text-foreground">
                        {subcat.name}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/40">
                      {subArticles.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSubcategory(subcat.slug)}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Filtrar solo {subcat.name}
                    </button>
                    <span className="text-muted-foreground text-xs">•</span>
                    <Link
                      to={`/categoria/${subcat.slug}`}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                    >
                      <span>Página propia</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {subArticles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-3">
                    Aún no hay pergaminos registrados en la subcategoría {subcat.name}.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : sortedArticles.length > 0 ? (
        /* Vista de cuadrícula estándar */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card/15 border border-dashed border-border rounded-xl">
          <BookOpen className="h-10 w-10 text-muted-foreground/45 mx-auto mb-3" />
          <h3 className="font-heading font-medium text-sm text-foreground">
            No se encontraron artículos
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed font-light">
            {filterQuery || selCampana || selContinente || selPlano || selCriatura || selectedSubcategory !== "all"
              ? "No hay registros que coincidan con la combinación de filtros seleccionada."
              : "Aún no se han redactado crónicas o registros en esta sección."}
          </p>
          {!(filterQuery || selCampana || selContinente || selPlano || selCriatura || selectedSubcategory !== "all") && (
            <Link
              to="/nuevo"
              className="mt-4 inline-flex items-center text-xs px-3.5 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-md hover:bg-primary/35 transition-all font-medium"
            >
              Redactar Primer Artículo
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
