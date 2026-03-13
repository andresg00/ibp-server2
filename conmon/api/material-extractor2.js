const e = require("express");

function parseProduct(item) {
  const producto = {
    createdAt: item.createdAt || new Date(),
    productId: item.productId || null,
    name: item.name || null,
    brand: item.brand || null,
    url: item.url || null,
    images: item.images || [],
    priceHistory: item.priceHistory || null,
    unit: item.unit || null,
    //parcear a double
    rating: item.rating ? parseFloat(item.rating.toString()) : null,
    reviewCount: item.reviewCount
      ? parseInt(item.reviewCount.toString())
      : null,
    highlights: item.highlights || [],
    // categoryId: item.categoryId || null,
    category: item.categoryName || null,
  };

  return producto;
}
/**
 * Extrae una lista de productos de una página de resultados de búsqueda de Homecenter usando Cheerio.
 *
 * Primero intenta parsear el objeto JSON global __NEXT_DATA__.
 * Si falla, intenta parsear el HTML directamente con Cheerio.
 *
 * @param {Function} $ - El objeto Cheerio (cargado con el HTML).
 * @returns {Array<Object>|null} - Un array de objetos, cada uno representando un producto.
 *                                  Retorna null si no se puede extraer ningún producto.
 */
function extraerProductos($) {
  // --- 1. INTENTAR EXTRAER DEL JSON __NEXT_DATA__ (MÉTODO PREFERIDO) ---
  const nextDataScript = $("#__NEXT_DATA__");

  if (nextDataScript.length > 0) {
    try {
      // Cheerio no tiene .textContent, se usa .text()
      const jsonContent = JSON.parse(nextDataScript.text());

      // Navegación por el JSON para llegar a los resultados
      const results =
        jsonContent?.props?.pageProps?.searchProps?.searchData?.results;
      // const category = jsonContent.query?.categoryName || null;
      const cat =
        jsonContent.props?.pageProps?.categoryProps?.categoryData?.results ||
        null;
      const catId = cat?.id || null;
      const catName = cat?.displayName || null;
      //0105040101
      if (results && Array.isArray(results)) {
        console.log("--- Productos extraídos del JSON __NEXT_DATA__ ---");
        const productosExtraidos = results.map((item) => {
          // Extraemos la info más relevante, pero el JSON tiene MUCHO más
          const price = item.prices?.[0]?.priceWithoutFormatting;
          const producto = {
            createdAt: new Date(),
            productId: item.productId,
            // skuId: item.skuId,
            name: item.displayName,
            brand: item.brand,
            url: `https://www.homecenter.com.co/homecenter-co/product/${item.productId}/${item.displayName?.replace(/\s+/g, "-")}/${item.productId}/`,
            images: item.mediaUrls || [],
            //enviar en millisecondsSinceEpoch
            priceHistory: price ? { [new Date().getTime()]: price } : null,
            // currency: item.prices?.[0]?.symbol || null,
            // priceText: item.prices?.[0]?.pice || null,
            unit: item.prices?.[0]?.unit || null,
            rating: item.rating,
            reviewCount: item.totalReviews,
            highlights: item.highlights || [],
            categoryId: catId || null,
            categoryName: catName || null,
            // events: item.events || [],
          };
          return parseProduct(producto);
        });
        return productosExtraidos;
      }
    } catch (error) {
      console.error("Error al parsear __NEXT_DATA__:", error.message);
      console.log("Se procederá con el análisis HTML.");
    }
  }

  // --- 2. MÉTODO DE RESPALDO: ANÁLISIS DEL HTML CON CHEERIO ---
  console.log(
    "--- No se pudo extraer del JSON. Intentando desde el HTML con Cheerio. ---",
  );

  // Buscar todos los contenedores de productos.
  // En este HTML, cada producto está dentro de un div con la clase 'product-wrapper'
  const contenedoresProductos = $('div[class*="product-wrapper"]');

  if (!contenedoresProductos || contenedoresProductos.length === 0) {
    console.log("No se encontraron contenedores de productos en el HTML.");
    return null;
  }

  const productosExtraidos = [];

  contenedoresProductos.each((index, elemento) => {
    const $contenedor = $(elemento);
    try {
      // Intentamos obtener el ID del producto, que es un atributo 'data-key' en el div padre
      const productId = $contenedor.attr("data-key");

      // Marca
      const $marcaTag = $contenedor.find('div[class*="product-brand"]');
      const marca = $marcaTag.length ? $marcaTag.text().trim() : null;

      // Nombre / Título
      const $tituloTag = $contenedor.find('h2[class*="product-title"]');
      const titulo = $tituloTag.length ? $tituloTag.text().trim() : null;

      // Imagen
      const $imgTag = $contenedor.find('img[class*="image-base"]');
      // El src puede estar en 'src' o en 'data-src' (para lazy loading)
      let imgUrl = null;
      if ($imgTag.length) {
        imgUrl = $imgTag.attr("src") || $imgTag.attr("data-src");
      }

      // URL del producto (a partir del link del título o de la imagen)
      const $linkTag = $contenedor.find("a[href]").first();
      let urlProducto = null;
      if ($linkTag.length) {
        const href = $linkTag.attr("href");
        urlProducto = href.startsWith("/")
          ? `https://www.homecenter.com.co${href}`
          : href;
      }

      // Precios y Ratings (están en diferentes secciones para móvil y escritorio)
      // Es más complejo, por lo que aquí simplificamos.
      const $precioTag = $contenedor.find('span[class*="parsedPrice"]');
      const precioTexto = $precioTag.length ? $precioTag.text().trim() : null;

      let precioSinFormato = null;
      if (precioTexto) {
        // Limpiar el precio para obtener un número
        const match = precioTexto.match(/[\d.]+/);
        if (match) {
          precioSinFormato = parseFloat(match[0].replace(/\./g, ""));
        }
      }

      // Rating
      const $ratingTag = $contenedor.find('div[class*="ratings--container"]');
      let rating = null;
      if ($ratingTag.length) {
        // Contar estrellas llenas (un aproximado)
        const $estrellasLlenas = $ratingTag.find('i[class*="star-filled"]');
        rating = $estrellasLlenas.length;
      }

      const pr = {
        createdAt: new Date(),
        productId: productId,
        name: titulo,
        brand: marca,
        url: urlProducto,
        images: [imgUrl],
        priceHistory: precioSinFormato
          ? [{ [new Date().getTime()]: precioSinFormato }]
          : null,
        unit: null,
        rating: rating,
        reviewCount: null,
      };
      const producto = parseProduct(pr);
      productosExtraidos.push(producto);
    } catch (error) {
      console.error(
        "Error procesando un contenedor de producto:",
        error.message,
      );
    }
  });

  if (productosExtraidos.length > 0) {
    return productosExtraidos;
  }

  return null;
}
exports.extraerProductos = extraerProductos;

const axios = require("axios");
const cheerio = require("cheerio");

class HomecenterScraper {
  constructor() {
    // @ts-ignore
    this.session = axios.create({
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        // Algunos sitios pueden necesitar esta cabecera
        Referer: "https://www.google.com/",
      },
      withCredentials: true, // Importante para mantener cookies
    });
  }

  async obtenerUbicacionesDisponibles() {
    try {
      // Intenta obtener ubicaciones desde el HTML o API
      const response = await this.session.get(
        "https://www.homecenter.com.co/homecenter-co/",
      );
      const $ = cheerio.load(response.data);

      // Busca datos de ubicación en el HTML o scripts
      const ubicaciones = [];

      // Ejemplo: busca en elementos con clase location
      $('[class*="location"], [class*="Location"]').each((i, el) => {
        const texto = $(el).text();
        if (
          texto.includes("Bogotá") ||
          texto.includes("Medellín") ||
          texto.includes("Cali")
        ) {
          ubicaciones.push(texto.trim());
        }
      });

      return ubicaciones;
    } catch (error) {
      console.error("Error obteniendo ubicaciones:", error.message);
      return [];
    }
  }

  async establecerUbicacionPorComuna(comuna) {
    try {
      // Mapeo de comunas conocidas (esto deberías completarlo)
      const comunas = {
        "Bogotá - Chapinero": { comunaId: "11001", ciudadId: "11001" },
        "Medellín - El Poblado": { comunaId: "05001", ciudadId: "05001" },
        "Cali - Norte": { comunaId: "76001", ciudadId: "76001" },
        "Barranquilla - Norte": { comunaId: "08001", ciudadId: "08001" },
      };

      const ubicacion = comunas[comuna];
      if (!ubicacion) {
        console.log("Comuna no encontrada en el mapa");
        return false;
      }

      // Método 1: Establecer vía API
      try {
        await this.session.post(
          "https://www.homecenter.com.co/homecenter-co/api/geo/set-location",
          {
            comunaId: ubicacion.comunaId,
            ciudadId: ubicacion.ciudadId,
          },
        );
        console.log(`Ubicación establecida: ${comuna}`);
        return true;
      } catch (apiError) {
        console.log("API de ubicación falló, intentando método alternativo...");
      }

      // Método 2: Simular la selección en el frontend (más complejo)
      // Esto requeriría obtener tokens CSRF, etc.

      return false;
    } catch (error) {
      console.error("Error estableciendo ubicación:", error.message);
      return false;
    }
  }

  async buscarProductos(termino, ubicacion = null) {
    try {
      // Si se especifica ubicación, intenta establecerla primero
      if (ubicacion) {
        await this.establecerUbicacionPorComuna(ubicacion);
      }

      // Hacer la búsqueda
      const url = `https://www.homecenter.com.co/homecenter-co/search/?Ntt=${encodeURIComponent(termino)}`;
      console.log(`Buscando: ${url}`);

      return await this.session.get(url);
    } catch (error) {
      console.error("Error en búsqueda:", error.message);
      return null;
    }
  }
}

exports.HomecenterScraper = HomecenterScraper;
